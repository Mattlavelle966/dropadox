export default defineEventHandler(async (event) => {
    const { challengeId, position } = await readBody(event);
    const numericPosition = Number(position);

    if (!challengeId || !Number.isFinite(numericPosition)) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid challenge attempt"
        });
    }

    return attemptSignupChallenge(String(challengeId), numericPosition);
});
