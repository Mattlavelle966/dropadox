import { eq, or } from "drizzle-orm";
import { folderUserShares, folders, uploads, userSettings, users } from "~~/server/database/schema";

export async function deleteUserWithOwnedData(db: any, userId: number | string) {
    const id = Number(userId);
    const targetUser = await db.select().from(users)
        .where(eq(users.id, id))
        .get();

    if (!targetUser) {
        return {
            deleted: false,
            deletedFolders: 0,
            deletedFiles: 0
        };
    }

    const settings = await db.select().from(userSettings)
        .where(eq(userSettings.userID, String(id)))
        .get();
    removeStoredImage(settings?.avatarPath);

    const ownedFolders = await db.select().from(folders)
        .where(eq(folders.userId, String(id)))
        .all();

    let deletedFiles = 0;
    for (const folder of ownedFolders) {
        const result = await deleteFolderWithContents(db, folder.id);
        deletedFiles += result.deletedFiles;
    }

    const orphanUploads = await db.select().from(uploads)
        .where(eq(uploads.userId, String(id)))
        .all();

    for (const upload of orphanUploads) {
        await removeUploadReference(db, upload);
    }

    await db.delete(folderUserShares).where(or(
        eq(folderUserShares.ownerId, String(id)),
        eq(folderUserShares.sharedWithUserId, String(id))
    ));
    await db.delete(userSettings).where(eq(userSettings.userID, String(id)));
    await db.delete(users).where(eq(users.id, id));

    return {
        deleted: true,
        deletedFolders: ownedFolders.length,
        deletedFiles: deletedFiles + orphanUploads.length
    };
}
