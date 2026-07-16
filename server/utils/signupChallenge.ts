import jwt from "jsonwebtoken";
import { createError } from "h3";

type Challenge = {
    targetStart: number;
    targetEnd: number;
    attempts: number;
    lastAttemptAt: number;
    expiresAt: number;
    passed: boolean;
}

const challenges = new Map<string, Challenge>();
const passedChallengeTokens = new Map<string, number>();
const maxAttempts = 50;
const challengeTtlMs = 10 * 60 * 1000;
const attemptCooldownMs = 2 * 1000;

function pruneChallenges() {
    const now = Date.now();

    for (const [id, challenge] of challenges) {
        if (challenge.expiresAt <= now || challenge.passed) {
            challenges.delete(id);
        }
    }

    for (const [tokenId, expiresAt] of passedChallengeTokens) {
        if (expiresAt <= now) {
            passedChallengeTokens.delete(tokenId);
        }
    }
}

export function createSignupChallenge() {
    pruneChallenges();

    const challengeId = crypto.randomUUID();
    const targetStart = Math.floor(20 + Math.random() * 55);
    const targetEnd = targetStart + 12;
    const challenge = {
        targetStart,
        targetEnd,
        attempts: 0,
        lastAttemptAt: 0,
        expiresAt: Date.now() + challengeTtlMs,
        passed: false
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

export function attemptSignupChallenge(challengeId: string, position: number) {
    pruneChallenges();

    const challenge = challenges.get(challengeId);

    if (!challenge) {
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

    const tokenId = crypto.randomUUID();
    const expiresAt = Date.now() + challengeTtlMs;
    passedChallengeTokens.set(tokenId, expiresAt);

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

export function verifySignupChallengeToken(token: string) {
    try {
        pruneChallenges();
        const payload = jwt.verify(token, process.env.JSON_SECRET_KEY!, {
            algorithms: ["HS256"]
        }) as { purpose?: string; tokenId?: string };
        return payload.purpose === "signup-challenge"
            && Boolean(payload.tokenId)
            && passedChallengeTokens.has(payload.tokenId!);
    } catch {
        return false;
    }
}

export function consumeSignupChallengeToken(token: string) {
    try {
        const payload = jwt.verify(token, process.env.JSON_SECRET_KEY!, {
            algorithms: ["HS256"]
        }) as { tokenId?: string };
        if (payload.tokenId) {
            passedChallengeTokens.delete(payload.tokenId);
        }
    } catch {
        // Invalid tokens are handled by verifySignupChallengeToken before this is called.
    }
}
