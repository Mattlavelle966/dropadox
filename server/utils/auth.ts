import { createError, getCookie, type H3Event } from "h3";
import type { UserPayload } from "~~/shared/types/UserPayload";

export function getAuthenticatedUserPayload(event: H3Event): UserPayload {
    const token = getCookie(event, "token");

    if (!token) {
        throw createError({
            statusCode: 401,
            statusMessage: "Not authenticated"
        });
    }

    try {
        return getUserPayload(token);
    } catch {
        throw createError({
            statusCode: 401,
            statusMessage: "Invalid session"
        });
    }
}
