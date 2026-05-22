import { eq } from "drizzle-orm";
import { folderUserShares, folders } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    const userPayload = getAuthenticatedUserPayload(event);

    const db = useDrizzle();
    const userFolders = await db.select().from(folders)
        .where(eq(folders.userId, String(userPayload.id)))
        .all();

    const sharedFolders = await db.select({
        id: folders.id,
        userId: folders.userId,
        name: folders.name,
        createdAt: folders.createdAt
    }).from(folderUserShares)
        .innerJoin(folders, eq(folderUserShares.folderId, folders.id))
        .where(eq(folderUserShares.sharedWithUserId, String(userPayload.id)))
        .all();

    return {
        folders: [
            ...userFolders.map(folder => ({ ...folder, shared: false })),
            ...sharedFolders.map(folder => ({ ...folder, shared: true }))
        ]
    };
});
