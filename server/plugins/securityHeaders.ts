export default defineNitroPlugin((nitroApp) => {
    nitroApp.hooks.hook("render:response", (response) => {
        response.headers = response.headers ?? {};
        delete response.headers["x-powered-by"];
        delete response.headers["X-Powered-By"];
        response.headers["X-Content-Type-Options"] = response.headers["X-Content-Type-Options"] ?? "nosniff";
        response.headers["X-Frame-Options"] = response.headers["X-Frame-Options"] ?? "SAMEORIGIN";
        response.headers["Referrer-Policy"] = response.headers["Referrer-Policy"] ?? "same-origin";
        response.headers["Permissions-Policy"] = response.headers["Permissions-Policy"] ?? "camera=(), microphone=(), geolocation=()";
        response.headers["Cross-Origin-Opener-Policy"] = response.headers["Cross-Origin-Opener-Policy"] ?? "same-origin";

        if (process.env.NODE_ENV === "production") {
            response.headers["Strict-Transport-Security"] = response.headers["Strict-Transport-Security"] ?? "max-age=31536000; includeSubDomains";
            response.headers["Content-Security-Policy"] = response.headers["Content-Security-Policy"] ?? [
                "default-src 'self'",
                "base-uri 'self'",
                "form-action 'self'",
                "frame-ancestors 'self'",
                "object-src 'none'",
                "img-src 'self' data: blob:",
                "media-src 'self' blob:",
                "font-src 'self' data:",
                "style-src 'self' 'unsafe-inline'",
                "script-src 'self' 'unsafe-inline'"
            ].join("; ");
        }
    });
});
