export default defineEventHandler(async (event) => {
    const folderId = Number(getRouterParam(event, "folderId"));

    if (!Number.isInteger(folderId)) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid folder id"
        });
    }

    const userPayload = getAuthenticatedUserPayload(event);
    const userId = String(userPayload.id);
    const db = useDrizzle();

    const folderAccess = await getFolderAccess(db, String(folderId), userId);

    if (!folderAccess?.isOwner) {
        throw createError({
            statusCode: 404,
            statusMessage: "Folder not found"
        });
    }

    const result = await deleteFolderWithContents(db, folderId);

    return {
        deleted: result.deleted,
        folderId,
        deletedFiles: result.deletedFiles
    };
});
