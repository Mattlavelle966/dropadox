import { getUserStorageBytes } from "~~/server/database/userStorage";
import { getUserStorageMaxBytes } from "~~/server/utils/storageQuota";

export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "api-v1-storage", 120, 60_000);
    const userPayload = await getApiKeyUserPayload(event);
    const db = useDrizzle();
    const userId = String(userPayload.id);
    const usedBytes = await getUserStorageBytes(userId);
    const maxBytes = await getUserStorageMaxBytes(db, userId);

    return {
        usedBytes,
        maxBytes,
        remainingBytes: Math.max(0, maxBytes - usedBytes)
    };
});
