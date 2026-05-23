export default defineEventHandler(async (event) => {
    const payload = getAuthenticatedUserPayload(event);
    const user = await getUserFromPayload(payload);

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: "Invalid session"
        });
    }

    return {
        username: user.name,
        emailAddress: user.email,
        id: user.id,
        role: user.role
    };
});
