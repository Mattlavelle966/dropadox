import fs from "fs";
import { and, eq } from "drizzle-orm";
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
    const db = useDrizzle();

    const upload = await db.select().from(uploads)
        .where(and(
            eq(uploads.id, fileId),
            eq(uploads.userId, String(userPayload.id))
        ))
        .get();

    if (!upload) {
        throw createError({
            statusCode: 404,
            statusMessage: "Upload not found"
        });
    }

    await db.delete(uploads)
        .where(and(
            eq(uploads.id, fileId),
            eq(uploads.userId, String(userPayload.id))
        ));

    if (upload.filePath && fs.existsSync(upload.filePath)) {
        fs.unlinkSync(upload.filePath);
    }

    return { deleted: true, fileId };
});
