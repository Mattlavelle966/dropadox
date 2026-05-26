import { and, eq, sql } from "drizzle-orm";
import { folderPublicShares, folderPublishedShares, folderUserShares, folders, userSettings, users } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    const folderId = Number(getRouterParam(event, "folderId"));

    if (!Number.isInteger(folderId)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid folder id" });
    }

    const userPayload = getAuthenticatedUserPayload(event);
    const userId = String(userPayload.id);
    const db = useDrizzle();

    const folderAccess = await getFolderAccess(db, String(folderId), userId);

    if (!folderAccess?.isOwner) {
        throw createError({ statusCode: 404, statusMessage: "Folder not found" });
    }

    const folder = folderAccess.folder;

    const publicShares = await db.select({
        id: folderPublicShares.id,
        token: folderPublicShares.token,
        passwordHash: folderPublicShares.passwordHash,
        expiresAt: folderPublicShares.expiresAt,
        createdAt: folderPublicShares.createdAt
    }).from(folderPublicShares)
        .where(eq(folderPublicShares.folderId, String(folderId)))
        .all();

    const sharedUsers = await db.select({
        shareId: folderUserShares.id,
        id: users.id,
        name: users.name,
        email: users.email,
        role: folderUserShares.role,
        avatarPath: userSettings.avatarPath,
        createdAt: folderUserShares.createdAt
    }).from(folderUserShares)
        .innerJoin(users, sql`${folderUserShares.sharedWithUserId} = cast(${users.id} as text)`)
        .leftJoin(userSettings, sql`${userSettings.userID} = cast(${users.id} as text)`)
        .where(eq(folderUserShares.folderId, String(folderId)))
        .all();

    const publishedShare = await db.select({
        token: folderPublishedShares.token,
        markdown: folderPublishedShares.markdown,
        likes: folderPublishedShares.likes,
        createdAt: folderPublishedShares.createdAt
    }).from(folderPublishedShares)
        .where(eq(folderPublishedShares.folderId, String(folderId)))
        .get();

    return {
        folder: folderResponse(folder, false),
        publicShares: publicShares.map((share) => ({
            id: share.id,
            token: share.token,
            expiresAt: share.expiresAt,
            createdAt: share.createdAt,
            hasPassword: Boolean(share.passwordHash),
            url: `/share/folder/${share.token}`
        })),
        publishedShare: publishedShare ? {
            ...publishedShare,
            url: `/share/folder/${publishedShare.token}`
        } : null,
        sharedUsers: sharedUsers.map((user) => ({
            shareId: user.shareId,
            id: user.id,
            name: user.name,
            username: user.name,
            email: user.email,
            role: user.role ?? "member",
            avatarUrl: userAvatarUrl(user.id, user.avatarPath),
            createdAt: user.createdAt
        }))
    };
});
