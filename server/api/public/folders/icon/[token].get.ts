import { eq } from "drizzle-orm";
import { folders } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    const shareToken = getRouterParam(event, "token");

    if (!shareToken) {
        throw createError({ statusCode: 400, statusMessage: "Invalid share link" });
    }

    const db = useDrizzle();
    const share = await getPublicFolderShare(db, shareToken, event);

    const folder = await db.select().from(folders)
        .where(eq(folders.id, Number(share.folderId)))
        .get();

    return serveStoredImage(event, folder?.iconPath);
});
