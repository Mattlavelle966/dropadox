import jwt from "jsonwebtoken";
import { createError } from "h3";

type Challenge = {
    targetStart: number;
    targetEnd: number;
    attempts: number;
    lastAttemptAt: number;
    expiresAt: number;
    passed: boolean;
    clientAddress: string;
}

const challenges = new Map<string, Challenge>();
const passedChallengeTokens = new Map<string, { expiresAt: number; clientAddress: string }>();
const maxAttempts = 50;
const maxActiveChallenges = 5_000;
const maxPassedChallengeTokens = 5_000;
const challengeTtlMs = 10 * 60 * 1000;
const attemptCooldownMs = 2 * 1000;

function pruneChallenges() {
    const now = Date.now();

    for (const [id, challenge] of challenges) {
        if (challenge.expiresAt <= now || challenge.passed) {
            challenges.delete(id);
        }
    }

    for (const [tokenId, token] of passedChallengeTokens) {
        if (token.expiresAt <= now) {
            passedChallengeTokens.delete(tokenId);
        }
    }
}

export function createSignupChallenge(clientAddress: string) {
    pruneChallenges();

    if (challenges.size >= maxActiveChallenges) {
        throw createError({ statusCode: 429, statusMessage: "Too many active signup challenges" });
    }

    const challengeId = crypto.randomUUID();
    const randomValue = (crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) / 2 ** 32;
    const targetStart = Math.floor(20 + randomValue * 55);
    const targetEnd = targetStart + 12;
    const challenge = {
        targetStart,
        targetEnd,
        attempts: 0,
        lastAttemptAt: 0,
        expiresAt: Date.now() + challengeTtlMs,
        passed: false,
        clientAddress
    };

    challenges.set(challengeId, challenge);

    return {
        challengeId,
        targetStart,
        targetEnd,
        attemptsLeft: maxAttempts,
        expiresAt: challenge.expiresAt
    };
}

export function attemptSignupChallenge(challengeId: string, position: number, clientAddress: string) {
    pruneChallenges();

    const challenge = challenges.get(challengeId);

    if (!challenge || challenge.clientAddress !== clientAddress) {
        throw createError({
            statusCode: 404,
            statusMessage: "Challenge expired"
        });
    }

    if (challenge.attempts >= maxAttempts) {
        challenges.delete(challengeId);
        throw createError({
            statusCode: 429,
            statusMessage: "Too many challenge attempts"
        });
    }

    const now = Date.now();
    const retryAfterMs = attemptCooldownMs - (now - challenge.lastAttemptAt);
    if (retryAfterMs > 0) {
        throw createError({
            statusCode: 429,
            statusMessage: `Wait ${Math.ceil(retryAfterMs / 1000)} seconds before trying again`
        });
    }

    challenge.lastAttemptAt = now;
    challenge.attempts += 1;

    const passed = position >= challenge.targetStart && position <= challenge.targetEnd;
    if (!passed) {
        return {
            passed: false,
            attemptsLeft: maxAttempts - challenge.attempts
        };
    }

    challenge.passed = true;
    challenges.delete(challengeId);

    if (passedChallengeTokens.size >= maxPassedChallengeTokens) {
        throw createError({ statusCode: 429, statusMessage: "Too many completed signup challenges" });
    }

    const tokenId = crypto.randomUUID();
    const expiresAt = Date.now() + challengeTtlMs;
    passedChallengeTokens.set(tokenId, { expiresAt, clientAddress });

    const challengeToken = jwt.sign({
        purpose: "signup-challenge",
        challengeId,
        tokenId
    }, process.env.JSON_SECRET_KEY!, { algorithm: "HS256", expiresIn: "10m" });

    return {
        passed: true,
        attemptsLeft: maxAttempts - challenge.attempts,
        challengeToken
    };
}

export function consumeSignupChallengeToken(token: string, clientAddress: string) {
    try {
        const payload = jwt.verify(token, process.env.JSON_SECRET_KEY!, {
            algorithms: ["HS256"]
        }) as { purpose?: string; tokenId?: string };

        if (payload.purpose !== "signup-challenge" || !payload.tokenId) {
            return false;
        }

        const passedToken = passedChallengeTokens.get(payload.tokenId);
        if (!passedToken || passedToken.clientAddress !== clientAddress || passedToken.expiresAt <= Date.now()) {
            return false;
        }

        passedChallengeTokens.delete(payload.tokenId);
        return true;
    } catch {
        return false;
    }
}
