import { eq } from "drizzle-orm";
import { uploads } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "api-v1-file-delete", 120, 60_000);
    const userPayload = await getApiKeyUserPayload(event);
    const fileId = Number(getRouterParam(event, "fileId"));

    if (!Number.isInteger(fileId)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid file id" });
    }

    const db = useDrizzle();
    const userId = String(userPayload.id);
    const file = await db.select().from(uploads)
        .where(eq(uploads.id, fileId))
        .get();

    if (!file) {
        throw createError({ statusCode: 404, statusMessage: "File not found" });
    }

    const folderAccess = file.folderId
        ? await getFolderAccess(db, file.folderId, userId)
        : null;

    if (file.userId !== userId && !folderAccess?.isOwner) {
        throw createError({ statusCode: 403, statusMessage: "Not allowed" });
    }

    await removeUploadReference(db, file);
    return { deleted: true, id: fileId };
});
