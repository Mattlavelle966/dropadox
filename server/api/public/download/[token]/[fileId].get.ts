import fs from "fs";
import { and, eq } from "drizzle-orm";
import { uploads } from "~~/server/database/schema";
import { setDownloadHeaders } from "~~/server/utils/fileStorage";

export default defineEventHandler(async (event) => {
    const shareToken = getRouterParam(event, "token");
    const fileId = Number(getRouterParam(event, "fileId"));

    if (!shareToken || !Number.isInteger(fileId)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid download link" });
    }

    enforceRateLimit(event, `public-download:${shareToken}`, 120, 60_000);
    const db = useDrizzle();
    const share = await getPublicFolderShare(db, shareToken);

    const upload = await db.select().from(uploads)
        .where(and(eq(uploads.id, fileId), eq(uploads.folderId, share.folderId)))
        .get();

    if (!upload?.filePath || !fs.existsSync(upload.filePath)) {
        throw createError({ statusCode: 404, statusMessage: "File not found" });
    }

    setDownloadHeaders(event, upload.filePath);
    return sendStream(event, fs.createReadStream(upload.filePath));
});
