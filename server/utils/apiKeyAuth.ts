import { createHash } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { getRequestHeader, type H3Event } from "h3";
import { apiKeys, users } from "~~/server/database/schema";
import type { UserPayload } from "~~/shared/types/UserPayload";

export function hashApiKey(apiKey: string) {
    return createHash("sha256").update(apiKey, "utf8").digest("hex");
}

export async function getApiKeyUserPayload(event: H3Event): Promise<UserPayload> {
    const authorization = getRequestHeader(event, "authorization") ?? "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    const rawKey = match?.[1]?.trim() ?? "";

    if (!/^ddx_[A-Za-z0-9_-]{40,}$/.test(rawKey)) {
        throw createError({
            statusCode: 401,
            statusMessage: "Invalid API key"
        });
    }

    const db = useDrizzle();
    const apiKey = await db.select().from(apiKeys)
        .where(and(
            eq(apiKeys.keyHash, hashApiKey(rawKey)),
            isNull(apiKeys.revokedAt)
        ))
        .get();

    if (!apiKey) {
        throw createError({
            statusCode: 401,
            statusMessage: "Invalid API key"
        });
    }

    const user = await db.select().from(users)
        .where(eq(users.id, Number(apiKey.userId)))
        .get();

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: "Invalid API key"
        });
    }

    await db.update(apiKeys)
        .set({ lastUsedAt: new Date().toISOString() })
        .where(eq(apiKeys.id, apiKey.id));

    return {
        id: user.id,
        username: user.name,
        emailAddress: user.email,
        role: user.role
    };
}
