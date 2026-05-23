import { getUserStorageBytes } from "../database/userStorage";
import { folderUserShares, folders, uploads } from "../database/schema";
import { getMaxUserStorageBytes, getUserStorageMaxBytes } from "../utils/storageQuota";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
    const defaultMaxBytes = getMaxUserStorageBytes();
    let userPayload;

    try {
        userPayload = getAuthenticatedUserPayload(event);
    } catch {
        return {
            authenticated: false,
            usedBytes: 0,
            maxBytes: defaultMaxBytes,
            remainingBytes: defaultMaxBytes,
            usedPercent: 0,
            sharedFolders: []
        };
    }

    const db = useDrizzle();
    const usedBytes = await getUserStorageBytes(String(userPayload.id));
    const maxBytes = await getUserStorageMaxBytes(db, String(userPayload.id));
    const remainingBytes = Math.max(0, maxBytes - usedBytes);
    const sharedFolders = await getSharedFolderStorage(String(userPayload.id));

    return {
        authenticated: true,
        usedBytes,
        maxBytes,
        remainingBytes,
        usedPercent: maxBytes > 0 ? Math.min(100, Math.round((usedBytes / maxBytes) * 1000) / 10) : 0,
        sharedFolders
    };
});

async function getSharedFolderStorage(userId: string) {
    const db = useDrizzle();
    const allFolders = await db.select().from(folders).all();
    const shares = await db.select().from(folderUserShares)
        .where(eq(folderUserShares.sharedWithUserId, userId))
        .all();
    const foldersByParent = new Map<string | null, any[]>();
    const folderById = new Map<string, any>();

    for (const folder of allFolders) {
        folderById.set(String(folder.id), folder);
        const parentKey = folder.parentId ? String(folder.parentId) : null;
        foldersByParent.set(parentKey, [...(foldersByParent.get(parentKey) ?? []), folder]);
    }

    const allUploads = await db.select().from(uploads).all();

    const sharedStorage = await Promise.all(shares
        .map(async (share: any) => {
            const rootFolder = folderById.get(String(share.folderId));

            if (!rootFolder) {
                return null;
            }

            const folderIds = collectFolderTreeIds(rootFolder, foldersByParent);
            const maxBytes = rootFolder.userId
                ? await getUserStorageMaxBytes(db, String(rootFolder.userId))
                : getMaxUserStorageBytes();
            const countedPaths = new Set<string>();
            let usedBytes = 0;

            for (const upload of allUploads) {
                if (!upload.folderId || !folderIds.has(String(upload.folderId))) {
                    continue;
                }

                if (upload.filePath && countedPaths.has(upload.filePath)) {
                    continue;
                }

                if (upload.filePath) {
                    countedPaths.add(upload.filePath);
                }

                usedBytes += upload.size ?? 0;
            }

            return {
                id: rootFolder.id,
                name: rootFolder.name,
                role: share.role ?? "member",
                usedBytes,
                maxBytes,
                usedPercent: maxBytes > 0 ? Math.min(100, Math.round((usedBytes / maxBytes) * 1000) / 10) : 0
            };
        }));

    return sharedStorage.filter(Boolean);
}

function collectFolderTreeIds(rootFolder: any, foldersByParent: Map<string | null, any[]>) {
    const folderIds = new Set<string>();
    const queue = [rootFolder];

    while (queue.length) {
        const folder = queue.shift();

        if (!folder || folderIds.has(String(folder.id))) {
            continue;
        }

        folderIds.add(String(folder.id));
        queue.push(...(foldersByParent.get(String(folder.id)) ?? []));
    }

    return folderIds;
}
