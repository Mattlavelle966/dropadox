import { and, eq } from "drizzle-orm";
import { folderUserShares, folders } from "~~/server/database/schema";

export async function getFolderAccess(db: any, folderId: string, userId: string) {
    const folder = await db.select().from(folders)
        .where(eq(folders.id, Number(folderId)))
        .get();

    if (!folder) {
        return null;
    }

    const ancestors = [folder];
    let currentFolder = folder;

    while (currentFolder.parentId) {
        const parentFolder = await db.select().from(folders)
            .where(eq(folders.id, Number(currentFolder.parentId)))
            .get();

        if (!parentFolder) {
            break;
        }

        ancestors.push(parentFolder);
        currentFolder = parentFolder;
    }

    const ownerFolder = ancestors.find((ancestor) => ancestor.userId === userId);
    const isPrimaryOwner = Boolean(ownerFolder);
    const share = isPrimaryOwner
        ? null
        : await findInheritedShare(db, ancestors, userId);
    const isCoOwner = share?.role === "owner";

    return {
        folder,
        share,
        isPrimaryOwner,
        isOwner: isPrimaryOwner || isCoOwner,
        isCoOwner,
        isSharedWithUser: Boolean(share)
    };
}

async function findInheritedShare(db: any, ancestors: any[], userId: string) {
    for (const ancestor of ancestors) {
        const share = await db.select().from(folderUserShares)
            .where(and(
                eq(folderUserShares.folderId, String(ancestor.id)),
                eq(folderUserShares.sharedWithUserId, userId)
            ))
            .get();

        if (share) {
            return share;
        }
    }

    return null;
}

export async function getAccessibleFolderRows(db: any, userId: string) {
    const allFolders = await db.select().from(folders).all();
    const userShares = await db.select().from(folderUserShares)
        .where(eq(folderUserShares.sharedWithUserId, userId))
        .all();
    const shareByFolderId = new Map(userShares.map((share: any) => [String(share.folderId), share]));
    const foldersByParent = new Map<string | null, any[]>();

    for (const folder of allFolders) {
        const parentKey = folder.parentId ? String(folder.parentId) : null;
        foldersByParent.set(parentKey, [...(foldersByParent.get(parentKey) ?? []), folder]);
    }

    const accessible = new Map<number, { folder: any; shared: boolean; accessRole: string }>();

    for (const folder of allFolders) {
        if (folder.userId === userId) {
            accessible.set(folder.id, { folder, shared: false, accessRole: "owner" });
        }
    }

    function addSharedTree(folder: any, accessRole: string) {
        if (!accessible.has(folder.id)) {
            accessible.set(folder.id, { folder, shared: true, accessRole });
        }

        for (const child of foldersByParent.get(String(folder.id)) ?? []) {
            addSharedTree(child, accessRole);
        }
    }

    for (const folder of allFolders) {
        const share = shareByFolderId.get(String(folder.id));

        if (share) {
            addSharedTree(folder, share.role ?? "member");
        }
    }

    return [...accessible.values()];
}
