export default defineEventHandler((event) => {
    removeResponseHeader(event, "x-powered-by");
    setHeader(event, "X-Content-Type-Options", "nosniff");
    setHeader(event, "X-Frame-Options", "SAMEORIGIN");
    setHeader(event, "Referrer-Policy", "same-origin");
    setHeader(event, "Permissions-Policy", "camera=(), microphone=(), geolocation=()");
});
