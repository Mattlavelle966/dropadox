import { eq } from "drizzle-orm";
import { userSettings } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    const userPayload = getAuthenticatedUserPayload(event);
    const userId = String(userPayload.id);
    const db = useDrizzle();

    const settings = await db.select().from(userSettings)
        .where(eq(userSettings.userID, userId))
        .get();

    if (settings?.avatarPath) {
        removeStoredImage(settings.avatarPath);
        await db.update(userSettings)
            .set({ avatarPath: null })
            .where(eq(userSettings.userID, userId));
    }

    return { removed: true };
});
