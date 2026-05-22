import fs from "fs";
import { eq } from "drizzle-orm";
import { uploads } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    const fileId = Number(getRouterParam(event, "fileId"));

    if (!Number.isInteger(fileId)) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid file id"
        });
    }

    const userPayload = getAuthenticatedUserPayload(event);
    const userId = String(userPayload.id);
    const db = useDrizzle();

    const upload = await db.select().from(uploads)
        .where(eq(uploads.id, fileId))
        .get();

    if (!upload) {
        throw createError({
            statusCode: 404,
            statusMessage: "Upload not found"
        });
    }

    const folderAccess = upload.folderId
        ? await getFolderAccess(db, upload.folderId, userId)
        : null;
    const canDelete = upload.userId === userId || folderAccess?.isOwner;

    if (!canDelete) {
        throw createError({
            statusCode: 403,
            statusMessage: "Not allowed"
        });
    }

    await db.delete(uploads)
        .where(eq(uploads.id, fileId));

    if (upload.filePath && fs.existsSync(upload.filePath)) {
        fs.unlinkSync(upload.filePath);
    }

    return { deleted: true, fileId };
});
