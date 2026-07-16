import { and, eq, isNull } from "drizzle-orm";
import { apiKeys } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "api-key-revoke", 30, 60_000);
    const userPayload = getAuthenticatedUserPayload(event);
    const keyId = Number(getRouterParam(event, "keyId"));

    if (!Number.isInteger(keyId)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid API key id" });
    }

    const revokedKey = await useDrizzle().update(apiKeys)
        .set({ revokedAt: new Date().toISOString() })
        .where(and(
            eq(apiKeys.id, keyId),
            eq(apiKeys.userId, String(userPayload.id)),
            isNull(apiKeys.revokedAt)
        ))
        .returning({ id: apiKeys.id })
        .get();

    if (!revokedKey) {
        throw createError({ statusCode: 404, statusMessage: "Active API key not found" });
    }

    return { revoked: true, id: revokedKey.id };
});
