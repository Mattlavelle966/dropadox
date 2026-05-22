import { eq } from "drizzle-orm";
import { folderPublicShares, folders, uploads } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    const shareToken = getRouterParam(event, "token");

    if (!shareToken) {
        throw createError({ statusCode: 400, statusMessage: "Invalid share link" });
    }

    const db = useDrizzle();
    const share = await db.select().from(folderPublicShares)
        .where(eq(folderPublicShares.token, shareToken))
        .get();

    if (!share?.folderId) {
        throw createError({ statusCode: 404, statusMessage: "Share not found" });
    }

    const folder = await db.select().from(folders)
        .where(eq(folders.id, Number(share.folderId)))
        .get();

    if (!folder) {
        throw createError({ statusCode: 404, statusMessage: "Folder not found" });
    }

    const folderUploads = await db.select().from(uploads)
        .where(eq(uploads.folderId, share.folderId))
        .all();

    return { folder, uploads: folderUploads };
});
