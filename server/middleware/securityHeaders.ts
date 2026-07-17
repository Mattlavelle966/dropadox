export default defineEventHandler((event) => {
    removeResponseHeader(event, "x-powered-by");
    setHeader(event, "X-Content-Type-Options", "nosniff");
    setHeader(event, "X-Frame-Options", "SAMEORIGIN");
    setHeader(event, "Referrer-Policy", "same-origin");
    setHeader(event, "Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    setHeader(event, "Cross-Origin-Opener-Policy", "same-origin");

    if (process.env.NODE_ENV === "production") {
        setHeader(event, "Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        setHeader(event, "Content-Security-Policy", [
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
        ].join("; "));
    }

    if (!event.path?.startsWith("/api/")) {
        return;
    }

    enforceApiRequestSize(event);
    enforceSameOriginMutation(event);
});

function enforceApiRequestSize(event: any) {
    const contentLength = Number(getRequestHeader(event, "content-length") ?? 0);

    if (!Number.isFinite(contentLength) || contentLength <= 0) {
        return;
    }

    const method = String(event.method ?? "GET").toUpperCase();
    const path = String(event.path ?? "");
    const isFileUpload = method === "POST" && (path === "/api/upload" || path === "/api/v1/files");
    const isImageUpload = method === "POST" && (
        path === "/api/users/avatar"
        || /^\/api\/folders\/icon\/\d+$/.test(path)
    );
    if (isFileUpload) {
        return;
    }

    const maxRequestBytes = isImageUpload
        ? 6_000_000
        : 1_000_000;

    if (contentLength > maxRequestBytes) {
        throw createError({ statusCode: 413, statusMessage: "Request is too large" });
    }
}

function enforceSameOriginMutation(event: any) {
    const method = String(event.method ?? "GET").toUpperCase();

    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        return;
    }

    const origin = getRequestHeader(event, "origin");
    if (!origin) {
        return;
    }

    const configuredOrigin = process.env.PUBLIC_ORIGIN?.trim();
    const forwardedHost = getRequestHeader(event, "x-forwarded-host")?.split(",")[0]?.trim();
    const requestUrl = getRequestURL(event);
    const expectedHost = forwardedHost || requestUrl.host;

    let normalizedOrigin = "";
    try {
        normalizedOrigin = new URL(origin).origin;
    } catch {
        throw createError({ statusCode: 403, statusMessage: "Cross-origin request rejected" });
    }

    let originMatches = new URL(normalizedOrigin).host === expectedHost;
    if (configuredOrigin) {
        try {
            originMatches = normalizedOrigin === new URL(configuredOrigin).origin;
        } catch {
            throw createError({ statusCode: 500, statusMessage: "Invalid PUBLIC_ORIGIN configuration" });
        }
    }

    if (!originMatches) {
        throw createError({ statusCode: 403, statusMessage: "Cross-origin request rejected" });
    }
}
