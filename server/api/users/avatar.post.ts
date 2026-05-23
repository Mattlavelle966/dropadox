import { eq } from "drizzle-orm";
import { userSettings } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "user-avatar-upload", 20, 60_000);
    const userPayload = getAuthenticatedUserPayload(event);
    const userId = String(userPayload.id);
    const image = await parseImageUpload(event, "profile-images");
    const db = useDrizzle();

    const existingSettings = await db.select().from(userSettings)
        .where(eq(userSettings.userID, userId))
        .get();

    try {
        const settings = existingSettings
            ? await db.update(userSettings)
                .set({ avatarPath: image.filePath })
                .where(eq(userSettings.userID, userId))
                .returning()
                .get()
            : await db.insert(userSettings)
                .values({
                    userID: userId,
                    colorMode: "light",
                    searchVisible: "true",
                    avatarPath: image.filePath
                })
                .returning()
                .get();

        removeStoredImage(existingSettings?.avatarPath);

        return {
            avatarUrl: `${userAvatarUrl(userId, settings.avatarPath)}?v=${Date.now()}`
        };
    } catch (error) {
        removeStoredImage(image.filePath);
        throw error;
    }
});
