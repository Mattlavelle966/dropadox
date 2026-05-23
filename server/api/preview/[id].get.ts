import fs from "fs";
import { eq } from "drizzle-orm";
import { uploads } from "~~/server/database/schema";
import { isHtmlPreviewFile, isNativePreviewFile } from "~~/shared/utils/fileType";
import { getStoredFileName } from "~~/server/utils/fileStorage";
import { renderDocumentPreview } from "~~/server/utils/renderDocumentPreview";

export default defineEventHandler(async (event) => {
    const fileId = Number(getRouterParam(event, "id"));

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

    if (!upload?.filePath || !fs.existsSync(upload.filePath)) {
        throw createError({
            statusCode: 404,
            statusMessage: "File not found"
        });
    }

    const isOwner = upload.userId === userId;
    const folderAccess = upload.folderId
        ? await getFolderAccess(db, upload.folderId, userId)
        : null;

    if (!isOwner && !folderAccess?.isOwner && !folderAccess?.isSharedWithUser) {
        throw createError({
            statusCode: 403,
            statusMessage: "Not allowed"
        });
    }

    const fileName = getStoredFileName(upload.filePath);

    if (isNativePreviewFile(fileName)) {
        return streamPreview(event, upload.filePath);
    }

    if (isHtmlPreviewFile(fileName)) {
        return renderDocumentPreview(event, upload.filePath);
    }

    throw createError({
        statusCode: 415,
        statusMessage: "Preview not supported"
    });
});
