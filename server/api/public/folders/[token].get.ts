import { eq } from "drizzle-orm";
import { folderPublicShares, folders, uploads } from "~~/server/database/schema";
import { getStoredFileName } from "~~/server/utils/fileStorage";

export default defineEventHandler(async (event) => {
    const shareToken = getRouterParam(event, "token");

    if (!shareToken) {
        throw createError({ statusCode: 400, statusMessage: "Invalid share link" });
    }

    const db = useDrizzle();
    const share = await db.select().from(folderPublicShares)
        .where(eq(folderPublicShares.token, shareToken))
        .get();

    if (!share?.folderId) {
        throw createError({ statusCode: 404, statusMessage: "Share not found" });
    }

    if (share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now()) {
        throw createError({ statusCode: 410, statusMessage: "Share link expired" });
    }

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
