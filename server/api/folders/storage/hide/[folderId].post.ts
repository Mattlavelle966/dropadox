import { and, eq } from "drizzle-orm";
import { folderUserShares, hiddenSharedStorageFolders } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    const folderId = Number(getRouterParam(event, "folderId"));

    if (!Number.isInteger(folderId)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid folder id" });
    }

    const userPayload = getAuthenticatedUserPayload(event);
    const userId = String(userPayload.id);
    const db = useDrizzle();

    const share = await db.select().from(folderUserShares)
        .where(and(
            eq(folderUserShares.folderId, String(folderId)),
            eq(folderUserShares.sharedWithUserId, userId)
        ))
        .get();

    if (!share) {
        throw createError({ statusCode: 404, statusMessage: "Shared folder not found" });
    }

    const existing = await db.select().from(hiddenSharedStorageFolders)
        .where(and(
            eq(hiddenSharedStorageFolders.folderId, String(folderId)),
            eq(hiddenSharedStorageFolders.userId, userId)
        ))
        .get();

    if (!existing) {
        await db.insert(hiddenSharedStorageFolders).values({
            folderId: String(folderId),
            userId
        });
    }

    return { hidden: true };
});
