import { desc, eq, sql } from "drizzle-orm";
import { folderPublishedShares, folders, userSettings, users } from "~~/server/database/schema";
import { renderSafeMarkdown } from "~~/shared/utils/markdown";

export default defineEventHandler(async () => {
    const db = useDrizzle();
    const rows = await db.select({
        token: folderPublishedShares.token,
        markdown: folderPublishedShares.markdown,
        likes: folderPublishedShares.likes,
        createdAt: folderPublishedShares.createdAt,
        folderId: folders.id,
        folderName: folders.name,
        folderIconPath: folders.iconPath,
        ownerId: users.id,
        ownerName: users.name,
        ownerAvatarPath: userSettings.avatarPath
    }).from(folderPublishedShares)
        .innerJoin(folders, eq(folderPublishedShares.folderId, folders.id))
        .innerJoin(users, eq(folderPublishedShares.userId, users.id))
        .leftJoin(userSettings, sql`${userSettings.userID} = cast(${users.id} as text)`)
        .orderBy(desc(folderPublishedShares.likes), desc(folderPublishedShares.createdAt))
        .limit(12)
        .all();

    return {
        folders: rows.map((row) => ({
            token: row.token,
            url: `/share/folder/${row.token}`,
            markdownHtml: renderSafeMarkdown(row.markdown ?? ""),
            likes: row.likes ?? 0,
            createdAt: row.createdAt,
            folder: {
                id: row.folderId,
                name: row.folderName,
                iconUrl: publicFolderIconUrl(row.token, row.folderIconPath)
            },
            owner: {
                id: row.ownerId,
                username: row.ownerName,
                avatarUrl: row.ownerAvatarPath ? `/api/public/published-folders/avatar/${row.token}` : null
            }
        }))
    };
});
