export default defineEventHandler(async (event) => {
    setHeader(event, "Cache-Control", "no-store");
    let payload;

    try {
        payload = getAuthenticatedUserPayload(event);
    } catch {
        return { authenticated: false };
    }

    const user = await getUserFromPayload(payload);

    if (!user) {
        return { authenticated: false };
    }

    return {
        authenticated: true,
        username: user.name,
        emailAddress: user.email,
        id: user.id,
        role: user.role
    };
});
