import { and, eq } from "drizzle-orm";
import { folderUserShares } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "folder-user-share-remove", 60, 60_000);
    const folderId = Number(getRouterParam(event, "folderId"));
    const { userId } = await readBody(event);
    const targetUserId = String(userId ?? "");

    if (!Number.isInteger(folderId) || !targetUserId) {
        throw createError({ statusCode: 400, statusMessage: "Invalid share removal request" });
    }

    const userPayload = getAuthenticatedUserPayload(event);
    const currentUserId = String(userPayload.id);
    const db = useDrizzle();

    const folderAccess = await getFolderAccess(db, String(folderId), currentUserId);

    if (!folderAccess?.isOwner) {
        throw createError({ statusCode: 404, statusMessage: "Folder not found" });
    }

    if (targetUserId === String(folderAccess.folder.userId)) {
        throw createError({ statusCode: 400, statusMessage: "Primary owner cannot be removed" });
    }

    await db.delete(folderUserShares)
        .where(and(
            eq(folderUserShares.folderId, String(folderId)),
            eq(folderUserShares.sharedWithUserId, targetUserId)
        ));

    return {
        removed: true,
        folderId,
        userId: targetUserId
    };
});
