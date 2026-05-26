import { and, eq } from "drizzle-orm";
import { hiddenSharedStorageFolders } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    const folderId = Number(getRouterParam(event, "folderId"));

    if (!Number.isInteger(folderId)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid folder id" });
    }

    const userPayload = getAuthenticatedUserPayload(event);
    const userId = String(userPayload.id);
    const db = useDrizzle();

    await db.delete(hiddenSharedStorageFolders)
        .where(and(
            eq(hiddenSharedStorageFolders.folderId, String(folderId)),
            eq(hiddenSharedStorageFolders.userId, userId)
        ));

    return { hidden: false };
});
