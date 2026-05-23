import { and, eq } from "drizzle-orm";
import { folders } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "folder-rename", 30, 60_000);
    const folderId = Number(getRouterParam(event, "folderId"));
    const { name } = await readBody(event);
    const folderName = String(name ?? "").trim();

    if (!Number.isInteger(folderId)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid folder id" });
    }

    if (!folderName) {
        throw createError({ statusCode: 400, statusMessage: "Folder name is required" });
    }

    if (folderName.length > 80) {
        throw createError({ statusCode: 400, statusMessage: "Folder name is too long" });
    }

    const userPayload = getAuthenticatedUserPayload(event);
    const userId = String(userPayload.id);
    const db = useDrizzle();

    const folderAccess = await getFolderAccess(db, String(folderId), userId);

    if (!folderAccess?.isOwner) {
        throw createError({ statusCode: 404, statusMessage: "Folder not found" });
    }

    const existingFolder = await db.select().from(folders)
        .where(and(
            eq(folders.userId, String(folderAccess.folder.userId)),
            eq(folders.name, folderName)
        ))
        .get();

    if (existingFolder && existingFolder.id !== folderId) {
        throw createError({ statusCode: 409, statusMessage: "Folder already exists" });
    }

    const updatedFolder = await db.update(folders)
        .set({ name: folderName })
        .where(eq(folders.id, folderId))
        .returning()
        .get();

    return { folder: folderResponse(updatedFolder, false) };
});
