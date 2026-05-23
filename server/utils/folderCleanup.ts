import { eq } from "drizzle-orm";
import { folderPublicShares, folderPublishedShares, folderUserShares, folders, uploads } from "~~/server/database/schema";

export async function deleteFolderWithContents(db: any, folderId: number | string) {
    const id = Number(folderId);
    const folder = await db.select().from(folders)
        .where(eq(folders.id, id))
        .get();

    if (!folder) {
        return {
            deleted: false,
            deletedFiles: 0
        };
    }

    let deletedFiles = 0;
    const childFolders = await db.select().from(folders)
        .where(eq(folders.parentId, String(id)))
        .all();

    for (const childFolder of childFolders) {
        const childResult = await deleteFolderWithContents(db, childFolder.id);
        deletedFiles += childResult.deletedFiles;
    }

    const folderUploads = await db.select().from(uploads)
        .where(eq(uploads.folderId, String(id)))
        .all();

    removeStoredImage(folder.iconPath);

    for (const upload of folderUploads) {
        await removeUploadReference(db, upload);
    }

    await db.delete(folderPublicShares).where(eq(folderPublicShares.folderId, String(id)));
    await db.delete(folderPublishedShares).where(eq(folderPublishedShares.folderId, String(id)));
    await db.delete(folderUserShares).where(eq(folderUserShares.folderId, String(id)));
    await db.delete(folders).where(eq(folders.id, id));

    return {
        deleted: true,
        deletedFiles: deletedFiles + folderUploads.length
    };
}
