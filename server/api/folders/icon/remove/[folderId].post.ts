import { and, eq } from "drizzle-orm";
import { folders } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
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

    removeStoredImage(folderAccess.folder.iconPath);

    const updatedFolder = await db.update(folders)
        .set({ iconPath: null })
        .where(eq(folders.id, folderId))
        .returning()
        .get();

    return {
        folder: folderResponse(updatedFolder, false)
    };
});
