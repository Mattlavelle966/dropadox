import { and, eq, isNull } from "drizzle-orm";
import { folders } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "folder-create", 30, 60_000);
    const { name, parentId } = await readBody(event);

    const folderName = String(name ?? "").trim();
    const parentFolderId = parentId ? String(parentId) : null;

    if (!folderName) {
        throw createError({
            statusCode: 400,
            statusMessage: "Folder name is required"
        });
    }

    if (folderName.length > 80) {
        throw createError({
            statusCode: 400,
            statusMessage: "Folder name is too long"
        });
    }

    const userPayload = getAuthenticatedUserPayload(event);
    const db = useDrizzle();
    const ownerId = String(userPayload.id);
    let parentAccess = null;
    let canonicalOwnerId = ownerId;

    if (parentFolderId) {
        parentAccess = await getFolderAccess(db, parentFolderId, ownerId);

        if (!parentAccess || (!parentAccess.isOwner && !parentAccess.isSharedWithUser)) {
            throw createError({
                statusCode: 404,
                statusMessage: "Parent folder not found"
            });
        }

        canonicalOwnerId = String(parentAccess.folder.userId);
    }

    const existingFolder = await db.select().from(folders)
        .where(and(
            eq(folders.userId, canonicalOwnerId),
            eq(folders.name, folderName),
            parentFolderId ? eq(folders.parentId, parentFolderId) : isNull(folders.parentId)
        ))
        .get();

    if (existingFolder) {
        throw createError({
            statusCode: 409,
            statusMessage: "Folder already exists"
        });
    }

    const folder = await db.insert(folders).values({
        userId: canonicalOwnerId,
        parentId: parentFolderId,
        name: folderName
    }).returning().get();

    return { folder: folderResponse(folder, false) };
});
