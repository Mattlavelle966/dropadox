export default defineEventHandler(async (event) => {
    await requireAdmin(event);
    const folderId = Number(getRouterParam(event, "folderId"));

    if (!Number.isInteger(folderId)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid folder id" });
    }

    const result = await deleteFolderWithContents(useDrizzle(), folderId);

    if (!result.deleted) {
        throw createError({ statusCode: 404, statusMessage: "Folder not found" });
    }

    return {
        folderId,
        ...result
    };
});
