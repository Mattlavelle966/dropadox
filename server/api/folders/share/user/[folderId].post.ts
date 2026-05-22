import { and, eq } from "drizzle-orm";
import { folderUserShares, folders, users } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "folder-user-share", 60, 60_000);
    const folderId = Number(getRouterParam(event, "folderId"));
    const { userId } = await readBody(event);

    if (!Number.isInteger(folderId) || !userId) {
        throw createError({ statusCode: 400, statusMessage: "Invalid share request" });
    }

    const userPayload = getAuthenticatedUserPayload(event);
    const ownerId = String(userPayload.id);
    const sharedWithUserId = String(userId);
    const db = useDrizzle();

    const folder = await db.select().from(folders)
        .where(and(eq(folders.id, folderId), eq(folders.userId, ownerId)))
        .get();

    if (!folder) {
        throw createError({ statusCode: 404, statusMessage: "Folder not found" });
    }

    const targetUser = await db.select().from(users)
        .where(eq(users.id, Number(sharedWithUserId)))
        .get();

    if (!targetUser) {
        throw createError({ statusCode: 404, statusMessage: "User not found" });
    }

    const existingShare = await db.select().from(folderUserShares)
        .where(and(
            eq(folderUserShares.folderId, String(folderId)),
            eq(folderUserShares.ownerId, ownerId),
            eq(folderUserShares.sharedWithUserId, sharedWithUserId)
        ))
        .get();

    if (!existingShare) {
        await db.insert(folderUserShares).values({
            folderId: String(folderId),
            ownerId,
            sharedWithUserId
        });
    }

    return {
        shared: true,
        user: {
            id: targetUser.id,
            name: targetUser.name,
            email: targetUser.email
        }
    };
});
