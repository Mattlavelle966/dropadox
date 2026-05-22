import fs from "fs";
import { and, eq } from "drizzle-orm";
import { folderPublicShares, uploads } from "~~/server/database/schema";
import { setDownloadHeaders } from "~~/server/utils/fileStorage";

export default defineEventHandler(async (event) => {
    const shareToken = getRouterParam(event, "token");
    const fileId = Number(getRouterParam(event, "fileId"));

    if (!shareToken || !Number.isInteger(fileId)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid download link" });
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

    setDownloadHeaders(event, upload.filePath);
    return sendStream(event, fs.createReadStream(upload.filePath));
});
