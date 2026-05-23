import { userSettings } from "../database/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    const { color_mode, search_visible } = body;
    const userPayload = getAuthenticatedUserPayload(event);
    const user = await getUserFromPayload(userPayload);
    if (!user) {
        throw createError({
            statusText: "No user found.",
            status: 404
        });
    }

    const colorMode = ["light", "dark", "system"].includes(String(color_mode))
        ? String(color_mode)
        : "light";
    const searchVisible = search_visible === false || search_visible === "false"
        ? "false"
        : "true";

    const db = useDrizzle();
    const existingSettings = await db.select().from(userSettings)
        .where(eq(userSettings.userID, String(user.id)))
        .get();

    const settings = existingSettings
        ? await db.update(userSettings)
            .set({
                colorMode,
                searchVisible
            })
            .where(eq(userSettings.userID, String(user.id)))
            .returning()
            .get()
        : await db.insert(userSettings)
            .values({
                userID: String(user.id),
                colorMode,
                searchVisible
            })
            .returning()
            .get();

    return {
        settings: {
            colorMode: settings.colorMode,
            searchVisible: settings.searchVisible !== "false"
        }
    };
});
