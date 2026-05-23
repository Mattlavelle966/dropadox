import { eq } from "drizzle-orm";
import { userSettings } from "../database/schema";

export default defineEventHandler(async (event) => {
    const userPayload = getAuthenticatedUserPayload(event);
    const user = await getUserFromPayload(userPayload);

    if (!user) {
        throw createError({
            statusCode: 404,
            statusMessage: "No user found."
        });
    }

    const settings = await useDrizzle()
        .select()
        .from(userSettings)
        .where(eq(userSettings.userID, String(user.id)))
        .get();

    return {
        settings: {
            colorMode: settings?.colorMode ?? "light",
            searchVisible: settings?.searchVisible !== "false"
        }
    };
});
