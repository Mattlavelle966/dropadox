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
        const payload = getUserPayload(token);

        if (!Number.isInteger(Number(payload.id)) || !payload.username || !payload.emailAddress) {
            throw new Error("Invalid auth payload");
        }

        return payload;
    } catch {
        throw createError({
            statusCode: 401,
            statusMessage: "Invalid session"
        });
    }
}
