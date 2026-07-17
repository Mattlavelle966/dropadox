export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "signup-challenge-attempt", 60, 60_000);
    const { challengeId, position } = await readBody(event);
    const numericPosition = Number(position);

    if (!challengeId || !Number.isFinite(numericPosition)) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid challenge attempt"
        });
    }

    const result = attemptSignupChallenge(
        String(challengeId),
        numericPosition,
        getClientAddress(event)
    );

    setHeader(event, "Cache-Control", "no-store");
    return result;
});
