const DEFAULT_MAX_BYTES = 10_000_000_000;

export function getMaxUserStorageBytes() {
    const configuredMaxBytes = Number(process.env.MAX_USER_STORAGE_BYTES);
    return Number.isFinite(configuredMaxBytes) && configuredMaxBytes > 0
        ? configuredMaxBytes
        : DEFAULT_MAX_BYTES;
}
