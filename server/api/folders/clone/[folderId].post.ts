import { and, eq } from "drizzle-orm";
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

    if (folderName.length > 80) {
        throw createError({ statusCode: 400, statusMessage: "Folder name is too long" });
    }

    for (let index = 2; ; index += 1) {
        const existingFolder = await db.select().from(folders)
            .where(and(
                eq(folders.userId, userId),
                eq(folders.name, folderName)
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

    return {
        folder: folderResponse(clonedFolder, false, "owner"),
        clonedFiles: sourceUploads.length
    };
});
