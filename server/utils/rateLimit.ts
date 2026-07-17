import { createError, getRequestHeader, type H3Event } from "h3";
import { eq } from "drizzle-orm";
import { ipBlacklist } from "~~/server/database/schema";

type Bucket = {
    count: number;
    resetAt: number;
}

const buckets = new Map<string, Bucket>();
const maxBuckets = 20_000;
let lastBucketPruneAt = 0;

function pruneRateLimitBuckets(now: number) {
    if (now - lastBucketPruneAt < 60_000 && buckets.size < maxBuckets) {
        return;
    }

    for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) {
            buckets.delete(key);
        }
    }

    lastBucketPruneAt = now;
}

export function getClientAddress(event: H3Event) {
    if (process.env.TRUST_PROXY === "true") {
        const forwardedFor = getRequestHeader(event, "x-forwarded-for");
        const forwardedAddress = forwardedFor?.split(",")[0]?.trim();

        if (forwardedAddress) {
            return forwardedAddress;
        }
    }

    return event.node.req.socket.remoteAddress || "unknown";
}

export function enforceRateLimit(event: H3Event, key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const bucketKey = `${key}:${getClientAddress(event)}`;
    pruneRateLimitBuckets(now);

    if (buckets.size >= maxBuckets && !buckets.has(bucketKey)) {
        throw createError({
            statusCode: 429,
            statusMessage: "Too many requests"
        });
    }

    const bucket = buckets.get(bucketKey);

    if (!bucket || bucket.resetAt <= now) {
        buckets.set(bucketKey, {
            count: 1,
            resetAt: now + windowMs
        });
        return;
    }

    bucket.count += 1;

    if (bucket.count > limit) {
        throw createError({
            statusCode: 429,
            statusMessage: "Too many requests"
        });
    }
}

export async function blacklistClientAddress(event: H3Event, reason = "captcha_failed") {
    const ipAddress = getClientAddress(event);
    const db = useDrizzle();
    const existing = await db.select().from(ipBlacklist)
        .where(eq(ipBlacklist.ipAddress, ipAddress))
        .get();

    if (!existing) {
        await db.insert(ipBlacklist).values({
            ipAddress,
            reason
        });
    }

    return ipAddress;
}

export async function enforceIpBlacklist(event: H3Event) {
    const blockedIp = await useDrizzle().select().from(ipBlacklist)
        .where(eq(ipBlacklist.ipAddress, getClientAddress(event)))
        .get();

    if (blockedIp) {
        throw createError({
            statusCode: 403,
            statusMessage: "IP address is blacklisted"
        });
    }
}
