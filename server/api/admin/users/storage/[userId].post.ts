import { eq } from "drizzle-orm";
import { users } from "~~/server/database/schema";
import { DEFAULT_MAX_USER_STORAGE_BYTES } from "~~/server/utils/storageQuota";

export default defineEventHandler(async (event) => {
    await requireAdmin(event);

    const userId = Number(getRouterParam(event, "userId"));

    if (!Number.isInteger(userId)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid user id" });
    }

    const body = await readBody<{ storageMaxBytes?: number }>(event);
    const storageMaxBytes = Math.round(Number(body.storageMaxBytes));

    if (!Number.isFinite(storageMaxBytes) || storageMaxBytes < 1_000_000) {
        throw createError({ statusCode: 400, statusMessage: "Storage capacity is too small" });
    }

    const updated = await useDrizzle().update(users)
        .set({ storageMaxBytes })
        .where(eq(users.id, userId))
        .returning({
            id: users.id,
            storageMaxBytes: users.storageMaxBytes
        })
        .get();

    if (!updated) {
        throw createError({ statusCode: 404, statusMessage: "User not found" });
    }

    return {
        userId: updated.id,
        storageMaxBytes: updated.storageMaxBytes,
        defaultStorageMaxBytes: DEFAULT_MAX_USER_STORAGE_BYTES
    };
});
