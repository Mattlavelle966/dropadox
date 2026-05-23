import { createError, getRequestHeader, type H3Event } from "h3";

type Bucket = {
    count: number;
    resetAt: number;
}

const buckets = new Map<string, Bucket>();

function getClientAddress(event: H3Event) {
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
