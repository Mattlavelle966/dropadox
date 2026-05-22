export default defineEventHandler(async (event) => {
    return getAuthenticatedUserPayload(event);
});
