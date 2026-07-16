import { desc, eq } from "drizzle-orm";
import { apiKeys } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    const userPayload = getAuthenticatedUserPayload(event);
    const keys = await useDrizzle().select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        lastUsedAt: apiKeys.lastUsedAt,
        revokedAt: apiKeys.revokedAt,
        createdAt: apiKeys.createdAt
    }).from(apiKeys)
        .where(eq(apiKeys.userId, String(userPayload.id)))
        .orderBy(desc(apiKeys.id))
        .all();

    setHeader(event, "Cache-Control", "no-store");
    return { keys };
});
