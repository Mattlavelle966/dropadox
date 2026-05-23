import { eq } from "drizzle-orm";
import { folderPublishedShares, userSettings } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    const token = getRouterParam(event, "token");

    if (!token) {
        throw createError({ statusCode: 400, statusMessage: "Invalid published folder" });
    }

    const db = useDrizzle();
    const published = await db.select().from(folderPublishedShares)
        .where(eq(folderPublishedShares.token, token))
        .get();

    if (!published?.userId) {
        throw createError({ statusCode: 404, statusMessage: "Published folder not found" });
    }

    const settings = await db.select().from(userSettings)
        .where(eq(userSettings.userID, published.userId))
        .get();

    return serveStoredImage(event, settings?.avatarPath);
});
