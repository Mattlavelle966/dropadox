import { and, eq } from "drizzle-orm";
import { folderPublishedShares, folders } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "folder-publish-remove", 30, 60_000);
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

    await db.delete(folderPublishedShares)
        .where(and(
            eq(folderPublishedShares.folderId, String(folderId)),
            eq(folderPublishedShares.userId, userId)
        ));

    return {
        removed: true,
        folderId
    };
});
