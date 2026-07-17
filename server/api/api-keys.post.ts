import { randomBytes } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { apiKeys } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "api-key-create", 10, 60_000);
    const userPayload = getAuthenticatedUserPayload(event);
    const body = await readBody(event).catch(() => ({}));
    const name = String(body?.name ?? "").trim();

    if (!name) {
        throw createError({ statusCode: 400, statusMessage: "API key name is required" });
    }

    if (name.length > 80) {
        throw createError({ statusCode: 400, statusMessage: "API key name is too long" });
    }

    const db = useDrizzle();
    const activeKeyCount = await db.select({ count: sql<number>`count(*)` }).from(apiKeys)
        .where(and(
            eq(apiKeys.userId, String(userPayload.id)),
            isNull(apiKeys.revokedAt)
        ))
        .get();

    if (Number(activeKeyCount?.count ?? 0) >= 25) {
        throw createError({ statusCode: 409, statusMessage: "Revoke an existing API key before creating another" });
    }

    const rawKey = `ddx_${randomBytes(32).toString("base64url")}`;
    const key = await db.insert(apiKeys).values({
        userId: String(userPayload.id),
        name,
        keyPrefix: rawKey.slice(0, 12),
        keyHash: hashApiKey(rawKey)
    }).returning({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        createdAt: apiKeys.createdAt
    }).get();

    setHeader(event, "Cache-Control", "no-store");
    setResponseStatus(event, 201);
    return {
        key,
        apiKey: rawKey,
        warning: "Copy this key now. It cannot be shown again."
    };
});
