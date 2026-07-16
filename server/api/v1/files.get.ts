import { and, desc, eq, isNull } from "drizzle-orm";
import { uploads } from "~~/server/database/schema";
import { getStoredFileName } from "~~/server/utils/fileStorage";

export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "api-v1-files-list", 120, 60_000);
    const userPayload = await getApiKeyUserPayload(event);
    const query = getQuery(event);
    const folderId = query.folderId === undefined || query.folderId === ""
        ? null
        : String(query.folderId);
    const db = useDrizzle();
    const userId = String(userPayload.id);

    if (folderId && !Number.isInteger(Number(folderId))) {
        throw createError({ statusCode: 400, statusMessage: "Invalid folder id" });
    }

    let filter = and(eq(uploads.userId, userId), isNull(uploads.folderId));

    if (folderId) {
        const folderAccess = await getFolderAccess(db, folderId, userId);

        if (!folderAccess || (!folderAccess.isOwner && !folderAccess.isSharedWithUser)) {
            throw createError({ statusCode: 404, statusMessage: "Folder not found" });
        }

        filter = eq(uploads.folderId, folderId);
    }

    const files = await db.select().from(uploads)
        .where(filter)
        .orderBy(desc(uploads.id))
        .all();

    return {
        files: files.map((file) => ({
            id: file.id,
            folderId: file.folderId ? Number(file.folderId) : null,
            name: file.filePath ? getStoredFileName(file.filePath) : null,
            size: file.size ?? 0,
            createdAt: file.createdAt,
            downloadUrl: `/api/v1/files/${file.id}`
        }))
    };
});
