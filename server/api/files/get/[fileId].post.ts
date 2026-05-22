import { and, eq } from "drizzle-orm";
import { folderUserShares, uploads } from "~~/server/database/schema";
import { getStoredFileName } from "~~/server/utils/fileStorage";

export default defineEventHandler(async (event) => {
    const fileId = Number(getRouterParam(event, "fileId"));
    const userPayload = getAuthenticatedUserPayload(event);

    const upload = await useDrizzle().select().from(uploads)
        .where(eq(uploads.id, fileId))
        .get();

    if (!upload) {
        throw createError({
            status: 404,
            statusText: "Invalid file. File: " + fileId 
        })
    }

    const isOwner = upload.userId === String(userPayload.id);
    const sharedFolder = upload.folderId
        ? await useDrizzle().select().from(folderUserShares)
            .where(and(
                eq(folderUserShares.folderId, upload.folderId),
                eq(folderUserShares.sharedWithUserId, String(userPayload.id))
            ))
            .get()
        : null;

    if (!isOwner && !sharedFolder) {
        throw createError({
            statusCode: 403,
            statusMessage: "Not allowed"
        });
    }

    return {
        upload: {
            id: upload.id,
            userId: upload.userId,
            folderId: upload.folderId,
            privacyFlag: upload.privacyFlag,
            size: upload.size,
            createdAt: upload.createdAt,
            fileName: upload.filePath ? getStoredFileName(upload.filePath) : null
        }
    }
});
