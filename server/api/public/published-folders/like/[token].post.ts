import { eq, sql } from "drizzle-orm";
import { folderPublishedShares } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    const token = getRouterParam(event, "token");

    if (!token) {
        throw createError({ statusCode: 400, statusMessage: "Invalid published folder" });
    }

    enforceRateLimit(event, `published-folder-like:${token}`, 20, 60_000);
    const db = useDrizzle();
    const published = await db.update(folderPublishedShares)
        .set({ likes: sql`${folderPublishedShares.likes} + 1` })
        .where(eq(folderPublishedShares.token, token))
        .returning()
        .get();

    if (!published) {
        throw createError({ statusCode: 404, statusMessage: "Published folder not found" });
    }

    return {
        token,
        likes: published.likes ?? 0
    };
});
