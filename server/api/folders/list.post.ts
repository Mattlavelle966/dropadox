export default defineEventHandler(async (event) => {
    const userPayload = getAuthenticatedUserPayload(event);

    const db = useDrizzle();
    const accessibleFolders = await getAccessibleFolderRows(db, String(userPayload.id));

    return {
        folders: accessibleFolders.map(({ folder, shared, accessRole }) => folderResponse(folder, shared, accessRole))
    };
});
