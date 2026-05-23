import { and, eq } from "drizzle-orm";
import { folderUserShares } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    const folderId = Number(getRouterParam(event, "folderId"));

    if (!Number.isInteger(folderId)) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid folder id"
        });
    }

    const userPayload = getAuthenticatedUserPayload(event);
    const userId = String(userPayload.id);

    const existingShare = await useDrizzle().select().from(folderUserShares)
        .where(and(
            eq(folderUserShares.folderId, String(folderId)),
            eq(folderUserShares.sharedWithUserId, userId)
        ))
        .get();

    if (!existingShare) {
        throw createError({
            statusCode: 404,
            statusMessage: "Shared folder not found"
        });
    }

    await useDrizzle().delete(folderUserShares)
        .where(and(
            eq(folderUserShares.folderId, String(folderId)),
            eq(folderUserShares.sharedWithUserId, userId)
        ));

    return { left: true, folderId };
});
