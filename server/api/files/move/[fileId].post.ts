import { eq } from "drizzle-orm";
import { uploads } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    const fileId = Number(getRouterParam(event, "fileId"));

    if (!Number.isInteger(fileId)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid file id" });
    }

    const body = await readBody<{ folderId?: string | null }>(event);
    const targetFolderId = body.folderId ? String(body.folderId) : null;
    const userPayload = getAuthenticatedUserPayload(event);
    const userId = String(userPayload.id);
    const db = useDrizzle();

    const upload = await db.select().from(uploads)
        .where(eq(uploads.id, fileId))
        .get();

    if (!upload) {
        throw createError({ statusCode: 404, statusMessage: "File not found" });
    }

    if (upload.folderId) {
        const currentAccess = await getFolderAccess(db, String(upload.folderId), userId);

        if (!currentAccess || (!currentAccess.isOwner && !currentAccess.isSharedWithUser)) {
            throw createError({ statusCode: 404, statusMessage: "File not found" });
        }
    } else if (upload.userId !== userId) {
        throw createError({ statusCode: 404, statusMessage: "File not found" });
    }

    let nextUserId = upload.userId;

    if (targetFolderId) {
        const targetAccess = await getFolderAccess(db, targetFolderId, userId);

        if (!targetAccess || (!targetAccess.isOwner && !targetAccess.isSharedWithUser)) {
            throw createError({ statusCode: 404, statusMessage: "Target folder not found" });
        }

        nextUserId = String(targetAccess.folder.userId);
    } else if (upload.userId !== userId) {
        throw createError({ statusCode: 403, statusMessage: "Cannot move this file to your root" });
    }

    const movedFile = await db.update(uploads)
        .set({
            folderId: targetFolderId,
            userId: nextUserId
        })
        .where(eq(uploads.id, fileId))
        .returning()
        .get();

    return { file: movedFile };
});
