export default defineEventHandler(async (event) => {
    if (!event.path?.startsWith("/api/")) {
        return;
    }

    enforceRateLimit(event, "api-global", 600, 60_000);

    if (event.path?.startsWith("/api/admin")) {
        return;
    }

    await enforceIpBlacklist(event);
});
