import { and, eq, sql } from "drizzle-orm";
import { folderPublicShares, folderUserShares, folders, userSettings, users } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    const folderId = Number(getRouterParam(event, "folderId"));

    if (!Number.isInteger(folderId)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid folder id" });
    }

    const userPayload = getAuthenticatedUserPayload(event);
    const userId = String(userPayload.id);
    const db = useDrizzle();

    const folder = await db.select().from(folders)
        .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
        .get();

    if (!folder) {
        throw createError({ statusCode: 404, statusMessage: "Folder not found" });
    }

    const publicShares = await db.select({
        id: folderPublicShares.id,
        token: folderPublicShares.token,
        expiresAt: folderPublicShares.expiresAt,
        createdAt: folderPublicShares.createdAt
    }).from(folderPublicShares)
        .where(and(
            eq(folderPublicShares.folderId, String(folderId)),
            eq(folderPublicShares.userId, userId)
        ))
        .all();

    const sharedUsers = await db.select({
        shareId: folderUserShares.id,
        id: users.id,
        name: users.name,
        email: users.email,
        avatarPath: userSettings.avatarPath,
        createdAt: folderUserShares.createdAt
    }).from(folderUserShares)
        .innerJoin(users, sql`${folderUserShares.sharedWithUserId} = cast(${users.id} as text)`)
        .leftJoin(userSettings, sql`${userSettings.userID} = cast(${users.id} as text)`)
        .where(and(
            eq(folderUserShares.folderId, String(folderId)),
            eq(folderUserShares.ownerId, userId)
        ))
        .all();

    return {
        folder: folderResponse(folder, false),
        publicShares: publicShares.map((share) => ({
            ...share,
            url: `/share/folder/${share.token}`
        })),
        sharedUsers: sharedUsers.map((user) => ({
            shareId: user.shareId,
            id: user.id,
            name: user.name,
            username: user.name,
            email: user.email,
            avatarUrl: userAvatarUrl(user.id, user.avatarPath),
            createdAt: user.createdAt
        }))
    };
});
