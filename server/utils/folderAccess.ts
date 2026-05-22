import { and, eq } from "drizzle-orm";
import { folderUserShares, folders } from "~~/server/database/schema";

export async function getFolderAccess(db: any, folderId: string, userId: string) {
    const folder = await db.select().from(folders)
        .where(eq(folders.id, Number(folderId)))
        .get();

    if (!folder) {
        return null;
    }

    const isOwner = folder.userId === userId;
    const share = isOwner
        ? null
        : await db.select().from(folderUserShares)
            .where(and(
                eq(folderUserShares.folderId, String(folder.id)),
                eq(folderUserShares.sharedWithUserId, userId)
            ))
            .get();

    return {
        folder,
        isOwner,
        isSharedWithUser: Boolean(share)
    };
}
