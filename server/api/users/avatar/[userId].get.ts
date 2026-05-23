import { eq } from "drizzle-orm";
import { userSettings, users } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    getAuthenticatedUserPayload(event);
    const userId = Number(getRouterParam(event, "userId"));

    if (!Number.isInteger(userId)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid user id" });
    }

    const db = useDrizzle();
    const user = await db.select().from(users)
        .where(eq(users.id, userId))
        .get();

    if (!user) {
        throw createError({ statusCode: 404, statusMessage: "User not found" });
    }

    const settings = await db.select().from(userSettings)
        .where(eq(userSettings.userID, String(userId)))
        .get();

    return serveStoredImage(event, settings?.avatarPath);
});
