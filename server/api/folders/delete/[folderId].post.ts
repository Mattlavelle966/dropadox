import fs from "fs";
import { and, eq } from "drizzle-orm";
import { folderPublicShares, folderUserShares, folders, uploads } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    const folderId = Number(getRouterParam(event, "folderId"));

    if (!Number.isInteger(folderId)) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid folder id"
        });
    }

    const userPayload = getAuthenticatedUserPayload(event);
    const userId = String(userPayload.id);
    const db = useDrizzle();

    const folder = await db.select().from(folders)
        .where(and(
            eq(folders.id, folderId),
            eq(folders.userId, userId)
        ))
        .get();

    if (!folder) {
        throw createError({
            statusCode: 404,
            statusMessage: "Folder not found"
        });
    }

    const folderUploads = await db.select().from(uploads)
        .where(eq(uploads.folderId, String(folderId)))
        .all();

    for (const upload of folderUploads) {
        if (upload.filePath && fs.existsSync(upload.filePath)) {
            fs.unlinkSync(upload.filePath);
        }
    }

    removeStoredImage(folder.iconPath);

    await db.delete(uploads)
        .where(eq(uploads.folderId, String(folderId)));

    await db.delete(folderPublicShares)
        .where(and(
            eq(folderPublicShares.folderId, String(folderId)),
            eq(folderPublicShares.userId, userId)
        ));

    await db.delete(folderUserShares)
        .where(and(
            eq(folderUserShares.folderId, String(folderId)),
            eq(folderUserShares.ownerId, userId)
        ));

    await db.delete(folders)
        .where(and(
            eq(folders.id, folderId),
            eq(folders.userId, userId)
        ));

    return {
        deleted: true,
        folderId,
        deletedFiles: folderUploads.length
    };
});
