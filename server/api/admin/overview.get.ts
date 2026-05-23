import { sql } from "drizzle-orm";
import { folderPublishedShares, folders, uploads, userSettings, users } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    await requireAdmin(event);
    const db = useDrizzle();

    const userRows = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        avatarPath: userSettings.avatarPath,
        folderCount: sql<number>`(
            select count(*) from folders
            where folders.user_id = cast(${users.id} as text)
        )`
    }).from(users)
        .leftJoin(userSettings, sql`${userSettings.userID} = cast(${users.id} as text)`)
        .orderBy(users.id)
        .all();

    const folderRows = await db.select({
        id: folders.id,
        name: folders.name,
        userId: folders.userId,
        ownerName: users.name,
        ownerEmail: users.email,
        createdAt: folders.createdAt,
        iconPath: folders.iconPath,
        fileCount: sql<number>`(
            select count(*) from uploads
            where uploads.folder_id = cast(${folders.id} as text)
        )`,
        publishedToken: folderPublishedShares.token,
        publishedLikes: folderPublishedShares.likes
    }).from(folders)
        .leftJoin(users, sql`${folders.userId} = cast(${users.id} as text)`)
        .leftJoin(folderPublishedShares, sql`${folderPublishedShares.folderId} = cast(${folders.id} as text)`)
        .orderBy(folders.id)
        .all();

    const rootFileCount = await db.select({ count: sql<number>`count(*)` }).from(uploads)
        .where(sql`${uploads.folderId} is null`)
        .get();

    return {
        users: userRows.map((user) => ({
            id: user.id,
            username: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            folderCount: Number(user.folderCount ?? 0),
            avatarUrl: userAvatarUrl(user.id, user.avatarPath)
        })),
        folders: folderRows.map((folder) => ({
            id: folder.id,
            name: folder.name,
            ownerId: folder.userId,
            ownerName: folder.ownerName,
            ownerEmail: folder.ownerEmail,
            createdAt: folder.createdAt,
            fileCount: Number(folder.fileCount ?? 0),
            iconUrl: folderIconUrl(folder.id, folder.iconPath),
            published: Boolean(folder.publishedToken),
            likes: folder.publishedLikes ?? 0
        })),
        totals: {
            users: userRows.length,
            folders: folderRows.length,
            rootFiles: Number(rootFileCount?.count ?? 0)
        }
    };
});
