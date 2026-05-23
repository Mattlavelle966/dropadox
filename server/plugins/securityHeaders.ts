export default defineNitroPlugin((nitroApp) => {
    nitroApp.hooks.hook("render:response", (response) => {
        response.headers = response.headers ?? {};
        delete response.headers["x-powered-by"];
        delete response.headers["X-Powered-By"];
        response.headers["X-Content-Type-Options"] = response.headers["X-Content-Type-Options"] ?? "nosniff";
        response.headers["X-Frame-Options"] = response.headers["X-Frame-Options"] ?? "SAMEORIGIN";
        response.headers["Referrer-Policy"] = response.headers["Referrer-Policy"] ?? "same-origin";
        response.headers["Permissions-Policy"] = response.headers["Permissions-Policy"] ?? "camera=(), microphone=(), geolocation=()";
    });
});
