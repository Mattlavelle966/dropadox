import fs from "fs";
import { and, eq } from "drizzle-orm";
import { folderPublicShares, uploads } from "~~/server/database/schema";
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
    const share = await db.select().from(folderPublicShares)
        .where(eq(folderPublicShares.token, shareToken))
        .get();

    if (!share?.folderId) {
        throw createError({ statusCode: 404, statusMessage: "Share not found" });
    }

    if (share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now()) {
        throw createError({ statusCode: 410, statusMessage: "Share link expired" });
    }

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
