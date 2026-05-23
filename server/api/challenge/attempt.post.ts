export default defineEventHandler(async (event) => {
    const { challengeId, position } = await readBody(event);
    const numericPosition = Number(position);

    if (!challengeId || !Number.isFinite(numericPosition)) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid challenge attempt"
        });
    }

    const result = attemptSignupChallenge(String(challengeId), numericPosition);

    if (!result.passed && result.attemptsLeft <= 0) {
        await blacklistClientAddress(event, "captcha_failed");
    }

    return result;
});
