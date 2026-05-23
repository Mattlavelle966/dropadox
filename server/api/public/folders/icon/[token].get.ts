import { eq } from "drizzle-orm";
import { folderPublicShares, folders } from "~~/server/database/schema";

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

    if (share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now()) {
        throw createError({ statusCode: 410, statusMessage: "Share link expired" });
    }

    const folder = await db.select().from(folders)
        .where(eq(folders.id, Number(share.folderId)))
        .get();

    return serveStoredImage(event, folder?.iconPath);
});
