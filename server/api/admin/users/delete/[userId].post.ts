export default defineEventHandler(async (event) => {
    const admin = await requireAdmin(event);
    const userId = Number(getRouterParam(event, "userId"));

    if (!Number.isInteger(userId)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid user id" });
    }

    if (userId === admin.id) {
        throw createError({ statusCode: 400, statusMessage: "Admins cannot delete themselves" });
    }

    const result = await deleteUserWithOwnedData(useDrizzle(), userId);

    if (!result.deleted) {
        throw createError({ statusCode: 404, statusMessage: "User not found" });
    }

    return {
        userId,
        ...result
    };
});
