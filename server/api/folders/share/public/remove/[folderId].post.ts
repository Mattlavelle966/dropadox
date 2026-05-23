import { eq } from "drizzle-orm";
import { folderPublicShares } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "folder-public-share-remove", 30, 60_000);
    const folderId = Number(getRouterParam(event, "folderId"));

    if (!Number.isInteger(folderId)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid folder id" });
    }

    const userPayload = getAuthenticatedUserPayload(event);
    const userId = String(userPayload.id);
    const db = useDrizzle();

    const folderAccess = await getFolderAccess(db, String(folderId), userId);

    if (!folderAccess?.isOwner) {
        throw createError({ statusCode: 404, statusMessage: "Folder not found" });
    }

    await db.delete(folderPublicShares)
        .where(eq(folderPublicShares.folderId, String(folderId)));

    return {
        removed: true,
        folderId
    };
});
