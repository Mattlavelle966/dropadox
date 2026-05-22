
import {userSettings} from "../database/schema";
import {eq} from "drizzle-orm";

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    const { color_mode } = body;
    const userPayload = getAuthenticatedUserPayload(event);
    const user = await getUserFromPayload(userPayload);
    if (!user) {
        throw createError({
            statusText: "No user found.",
            status: 404
        });
    }

    const updatedUserSettings = await useDrizzle()
        .update(userSettings)
        .set({
            colorMode: color_mode,
        })
        .where(eq(userSettings.userID, user.id.toString()))
        .returning()
        .get()
})
