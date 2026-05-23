import { eq } from "drizzle-orm";
import { ipBlacklist } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    await requireAdmin(event);
    const blacklistId = Number(getRouterParam(event, "blacklistId"));

    if (!Number.isInteger(blacklistId)) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid blacklist id"
        });
    }

    await useDrizzle().delete(ipBlacklist)
        .where(eq(ipBlacklist.id, blacklistId));

    return {
        deleted: true,
        blacklistId
    };
});
