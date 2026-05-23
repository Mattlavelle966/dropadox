export default defineEventHandler(async (event) => {
    if (event.path?.startsWith("/api/admin")) {
        return;
    }

    if (event.path?.startsWith("/api/")) {
        await enforceIpBlacklist(event);
    }
});
