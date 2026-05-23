import { eq } from "drizzle-orm";
import { folders } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    const folderId = Number(getRouterParam(event, "folderId"));

    if (!Number.isInteger(folderId)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid folder id" });
    }

    const body = await readBody<{ parentId?: string | null }>(event);
    const targetParentId = body.parentId ? String(body.parentId) : null;
    const userPayload = getAuthenticatedUserPayload(event);
    const userId = String(userPayload.id);
    const db = useDrizzle();

    const sourceAccess = await getFolderAccess(db, String(folderId), userId);

    if (!sourceAccess?.isOwner) {
        throw createError({ statusCode: 404, statusMessage: "Folder not found" });
    }

    if (targetParentId === String(folderId)) {
        throw createError({ statusCode: 400, statusMessage: "Cannot move a folder into itself" });
    }

    if (targetParentId) {
        const targetAccess = await getFolderAccess(db, targetParentId, userId);

        if (!targetAccess?.isOwner || targetAccess.folder.userId !== sourceAccess.folder.userId) {
            throw createError({ statusCode: 404, statusMessage: "Target folder not found" });
        }

        let cursor = targetAccess.folder;

        while (cursor) {
            if (String(cursor.id) === String(folderId)) {
                throw createError({ statusCode: 400, statusMessage: "Cannot move a folder into its descendant" });
            }

            if (!cursor.parentId) {
                break;
            }

            cursor = await db.select().from(folders)
                .where(eq(folders.id, Number(cursor.parentId)))
                .get();
        }
    } else if (sourceAccess.folder.userId !== userId) {
        throw createError({ statusCode: 403, statusMessage: "Cannot move this folder to your root" });
    }

    const movedFolder = await db.update(folders)
        .set({ parentId: targetParentId })
        .where(eq(folders.id, folderId))
        .returning()
        .get();

    return { folder: folderResponse(movedFolder, false, "owner") };
});
