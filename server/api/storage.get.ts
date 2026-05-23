import { getUserStorageBytes } from "../database/userStorage";
import { getMaxUserStorageBytes } from "../utils/storageQuota";

export default defineEventHandler(async (event) => {
    const maxBytes = getMaxUserStorageBytes();
    let userPayload;

    try {
        userPayload = getAuthenticatedUserPayload(event);
    } catch {
        return {
            authenticated: false,
            usedBytes: 0,
            maxBytes,
            remainingBytes: maxBytes,
            usedPercent: 0
        };
    }

    const usedBytes = await getUserStorageBytes(String(userPayload.id));
    const remainingBytes = Math.max(0, maxBytes - usedBytes);

    return {
        authenticated: true,
        usedBytes,
        maxBytes,
        remainingBytes,
        usedPercent: maxBytes > 0 ? Math.min(100, Math.round((usedBytes / maxBytes) * 1000) / 10) : 0
    };
});
