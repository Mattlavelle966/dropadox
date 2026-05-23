import fs from "fs";
import { and, eq } from "drizzle-orm";
import { uploads } from "~~/server/database/schema";
import { isHtmlPreviewFile, isNativePreviewFile } from "~~/shared/utils/fileType";
import { getStoredFileName } from "~~/server/utils/fileStorage";
import { renderDocumentPreview } from "~~/server/utils/renderDocumentPreview";

export default defineEventHandler(async (event) => {
    const shareToken = getRouterParam(event, "token");
    const fileId = Number(getRouterParam(event, "fileId"));

    if (!shareToken || !Number.isInteger(fileId)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid preview link" });
    }

    const db = useDrizzle();
    const share = await getPublicFolderShare(db, shareToken);

    const upload = await db.select().from(uploads)
        .where(and(eq(uploads.id, fileId), eq(uploads.folderId, share.folderId)))
        .get();

    if (!upload?.filePath || !fs.existsSync(upload.filePath)) {
        throw createError({ statusCode: 404, statusMessage: "File not found" });
    }

    const fileName = getStoredFileName(upload.filePath);

    if (isNativePreviewFile(fileName)) {
        return streamPreview(event, upload.filePath);
    }

    if (isHtmlPreviewFile(fileName)) {
        return renderDocumentPreview(event, upload.filePath);
    }

    throw createError({ statusCode: 415, statusMessage: "Preview not supported" });
});
