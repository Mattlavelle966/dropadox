import { eq } from "drizzle-orm";
import { folders } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    const folderId = Number(getRouterParam(event, "folderId"));

    if (!Number.isInteger(folderId)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid folder id" });
    }

    const userPayload = getAuthenticatedUserPayload(event);
    const db = useDrizzle();
    const folderAccess = await getFolderAccess(db, String(folderId), String(userPayload.id));

    if (!folderAccess || (!folderAccess.isOwner && !folderAccess.isSharedWithUser)) {
        throw createError({ statusCode: 404, statusMessage: "Folder not found" });
    }

    const folder = await db.select().from(folders)
        .where(eq(folders.id, folderId))
        .get();

    return serveStoredImage(event, folder?.iconPath);
});
