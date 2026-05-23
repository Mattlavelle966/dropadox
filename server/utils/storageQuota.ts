import { eq } from "drizzle-orm";
import { users } from "../database/schema";

export const DEFAULT_MAX_USER_STORAGE_BYTES = 13_000_000_000;

export function getMaxUserStorageBytes() {
    const configuredMaxBytes = Number(process.env.MAX_USER_STORAGE_BYTES);
    return Number.isFinite(configuredMaxBytes) && configuredMaxBytes > 0
        ? configuredMaxBytes
        : DEFAULT_MAX_USER_STORAGE_BYTES;
}

export async function getUserStorageMaxBytes(db: any, userId: string) {
    const user = await db.select({ storageMaxBytes: users.storageMaxBytes }).from(users)
        .where(eq(users.id, Number(userId)))
        .get();
    const maxBytes = Number(user?.storageMaxBytes);

    return Number.isFinite(maxBytes) && maxBytes > 0
        ? maxBytes
        : getMaxUserStorageBytes();
}
