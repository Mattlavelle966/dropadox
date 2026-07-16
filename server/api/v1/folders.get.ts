export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "api-v1-folders-list", 120, 60_000);
    const userPayload = await getApiKeyUserPayload(event);
    const accessibleFolders = await getAccessibleFolderRows(useDrizzle(), String(userPayload.id));

    return {
        folders: accessibleFolders.map(({ folder, shared, accessRole }) => ({
            id: folder.id,
            parentId: folder.parentId ? Number(folder.parentId) : null,
            name: folder.name,
            ownerId: folder.userId ? Number(folder.userId) : null,
            shared,
            accessRole,
            createdAt: folder.createdAt
        }))
    };
});
