import fs from "fs";
import { and, eq } from "drizzle-orm";
import { folderPublicShares, folderUserShares, folders, uploads } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    const folderId = Number(getRouterParam(event, "folderId"));
    const { token } = await readBody(event);

    if (!Number.isInteger(folderId)) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid folder id"
        });
    }

    if (!token) {
        throw createError({
            statusCode: 400,
            statusMessage: "No token provided"
        });
    }

    const userPayload = getUserPayload(token);
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
        .where(and(
            eq(uploads.folderId, String(folderId)),
            eq(uploads.userId, userId)
        ))
        .all();

    for (const upload of folderUploads) {
        if (upload.filePath && fs.existsSync(upload.filePath)) {
            fs.unlinkSync(upload.filePath);
        }
    }

    await db.delete(uploads)
        .where(and(
            eq(uploads.folderId, String(folderId)),
            eq(uploads.userId, userId)
        ));

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
