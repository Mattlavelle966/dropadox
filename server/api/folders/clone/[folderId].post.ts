import { and, eq, isNull } from "drizzle-orm";
import { folders, uploads } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "folder-clone", 20, 60_000);
    const folderId = Number(getRouterParam(event, "folderId"));
    const { name } = await readBody(event);

    if (!Number.isInteger(folderId)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid folder id" });
    }

    const userPayload = getAuthenticatedUserPayload(event);
    const userId = String(userPayload.id);
    const db = useDrizzle();
    const folderAccess = await getFolderAccess(db, String(folderId), userId);

    if (!folderAccess || (!folderAccess.isOwner && !folderAccess.isSharedWithUser)) {
        throw createError({ statusCode: 404, statusMessage: "Folder not found" });
    }

    const requestedName = String(name ?? "").trim();
    let folderName = requestedName || `Copy of ${folderAccess.folder.name}`;
    const parentId = folderAccess.folder.parentId ? String(folderAccess.folder.parentId) : null;

    if (folderName.length > 80) {
        throw createError({ statusCode: 400, statusMessage: "Folder name is too long" });
    }

    for (let index = 2; ; index += 1) {
        const existingFolder = await db.select().from(folders)
            .where(and(
                eq(folders.userId, userId),
                eq(folders.name, folderName),
                parentId ? eq(folders.parentId, parentId) : isNull(folders.parentId)
            ))
            .get();

        if (!existingFolder) {
            break;
        }

        folderName = `${requestedName || `Copy of ${folderAccess.folder.name}`} ${index}`;
    }

    const clonedFolder = await db.insert(folders)
        .values({
            userId,
            parentId,
            name: folderName
        })
        .returning()
        .get();

    const sourceUploads = await db.select().from(uploads)
        .where(eq(uploads.folderId, String(folderId)))
        .all();

    for (const upload of sourceUploads) {
        await db.insert(uploads).values({
            userId,
            folderId: String(clonedFolder.id),
            filePath: upload.filePath,
            privacyFlag: upload.privacyFlag,
            size: upload.size
        });
    }

    await cloneChildFolders(db, String(folderId), String(clonedFolder.id), userId);

    return {
        folder: folderResponse(clonedFolder, false, "owner"),
        clonedFiles: sourceUploads.length
    };
});

async function cloneChildFolders(db: any, sourceParentId: string, targetParentId: string, userId: string) {
    const childFolders = await db.select().from(folders)
        .where(eq(folders.parentId, sourceParentId))
        .all();

    for (const childFolder of childFolders) {
        const clonedChild = await db.insert(folders)
            .values({
                userId,
                parentId: targetParentId,
                name: childFolder.name,
                iconPath: childFolder.iconPath
            })
            .returning()
            .get();

        const childUploads = await db.select().from(uploads)
            .where(eq(uploads.folderId, String(childFolder.id)))
            .all();

        for (const upload of childUploads) {
            await db.insert(uploads).values({
                userId,
                folderId: String(clonedChild.id),
                filePath: upload.filePath,
                privacyFlag: upload.privacyFlag,
                size: upload.size
            });
        }

        await cloneChildFolders(db, String(childFolder.id), String(clonedChild.id), userId);
    }
}
