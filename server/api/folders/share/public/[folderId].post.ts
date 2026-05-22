import { and, eq } from "drizzle-orm";
import { folderPublicShares, folders } from "~~/server/database/schema";

function createExpiry() {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    return expiresAt.toISOString();
}

export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "folder-public-share", 30, 60_000);
    const folderId = Number(getRouterParam(event, "folderId"));

    if (!Number.isInteger(folderId)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid folder id" });
    }

    const userPayload = getAuthenticatedUserPayload(event);
    const userId = String(userPayload.id);
    const db = useDrizzle();

    const folder = await db.select().from(folders)
        .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
        .get();

    if (!folder) {
        throw createError({ statusCode: 404, statusMessage: "Folder not found" });
    }

    let share = await db.select().from(folderPublicShares)
        .where(and(eq(folderPublicShares.folderId, String(folderId)), eq(folderPublicShares.userId, userId)))
        .get();

    if (!share) {
        share = await db.insert(folderPublicShares).values({
            folderId: String(folderId),
            userId,
            token: crypto.randomUUID(),
            expiresAt: createExpiry()
        }).returning().get();
    } else if (!share.expiresAt) {
        share = await db.update(folderPublicShares)
            .set({ expiresAt: createExpiry() })
            .where(eq(folderPublicShares.id, share.id))
            .returning()
            .get();
    }

    return {
        token: share.token,
        url: `/share/folder/${share.token}`
    };
});
