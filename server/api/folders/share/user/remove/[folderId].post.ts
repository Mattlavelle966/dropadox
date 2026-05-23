import { and, eq } from "drizzle-orm";
import { folderUserShares, folders } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "folder-user-share-remove", 60, 60_000);
    const folderId = Number(getRouterParam(event, "folderId"));
    const { userId } = await readBody(event);
    const targetUserId = String(userId ?? "");

    if (!Number.isInteger(folderId) || !targetUserId) {
        throw createError({ statusCode: 400, statusMessage: "Invalid share removal request" });
    }

    const userPayload = getAuthenticatedUserPayload(event);
    const ownerId = String(userPayload.id);
    const db = useDrizzle();

    const folder = await db.select().from(folders)
        .where(and(eq(folders.id, folderId), eq(folders.userId, ownerId)))
        .get();

    if (!folder) {
        throw createError({ statusCode: 404, statusMessage: "Folder not found" });
    }

    await db.delete(folderUserShares)
        .where(and(
            eq(folderUserShares.folderId, String(folderId)),
            eq(folderUserShares.ownerId, ownerId),
            eq(folderUserShares.sharedWithUserId, targetUserId)
        ));

    return {
        removed: true,
        folderId,
        userId: targetUserId
    };
});
