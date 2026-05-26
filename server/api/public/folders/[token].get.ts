import { eq } from "drizzle-orm";
import { folders, uploads } from "~~/server/database/schema";
import { getStoredFileName } from "~~/server/utils/fileStorage";

export default defineEventHandler(async (event) => {
    const shareToken = getRouterParam(event, "token");

    if (!shareToken) {
        throw createError({ statusCode: 400, statusMessage: "Invalid share link" });
    }

    const db = useDrizzle();
    const share = await getPublicFolderShare(db, shareToken, event);

    const folder = await db.select().from(folders)
        .where(eq(folders.id, Number(share.folderId)))
        .get();

    if (!folder) {
        throw createError({ statusCode: 404, statusMessage: "Folder not found" });
    }

    const folderUploads = await db.select().from(uploads)
        .where(eq(uploads.folderId, share.folderId))
        .all();

    return {
        folder: {
            id: folder.id,
            name: folder.name,
            createdAt: folder.createdAt,
            iconUrl: publicFolderIconUrl(share.token, folder.iconPath)
        },
        uploads: folderUploads.map(upload => ({
            id: upload.id,
            folderId: upload.folderId,
            size: upload.size,
            createdAt: upload.createdAt,
            fileName: upload.filePath ? getStoredFileName(upload.filePath) : null
        }))
    };
});
