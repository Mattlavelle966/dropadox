import { and, eq } from "drizzle-orm";
import { folderPublicShares, folders } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "folder-public-share-remove", 30, 60_000);
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

    await db.delete(folderPublicShares)
        .where(and(
            eq(folderPublicShares.folderId, String(folderId)),
            eq(folderPublicShares.userId, userId)
        ));

    return {
        removed: true,
        folderId
    };
});
