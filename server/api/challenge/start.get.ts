export default defineEventHandler((event) => {
    enforceRateLimit(event, "signup-challenge-start", 30, 60_000);
    setHeader(event, "Cache-Control", "no-store");
    return createSignupChallenge(getClientAddress(event));
});
