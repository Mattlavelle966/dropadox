import { and, eq } from "drizzle-orm";
import { folders } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "folder-icon-upload", 30, 60_000);
    const folderId = Number(getRouterParam(event, "folderId"));

    if (!Number.isInteger(folderId)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid folder id" });
    }

    const userPayload = getAuthenticatedUserPayload(event);
    const userId = String(userPayload.id);
    const db = useDrizzle();

    const folder = await db.select().from(folders)
        .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
        .get();

    if (!folder) {
        throw createError({ statusCode: 404, statusMessage: "Folder not found" });
    }

    const image = await parseImageUpload(event, "folder-icons");

    try {
        const updatedFolder = await db.update(folders)
            .set({ iconPath: image.filePath })
            .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
            .returning()
            .get();

        removeStoredImage(folder.iconPath);

        return {
            folder: {
                ...folderResponse(updatedFolder, false),
                iconUrl: `${folderIconUrl(folderId, updatedFolder.iconPath)}?v=${Date.now()}`
            }
        };
    } catch (error) {
        removeStoredImage(image.filePath);
        throw error;
    }
});
