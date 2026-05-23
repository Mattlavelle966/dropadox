import { eq } from "drizzle-orm";
import type { H3Event } from "h3";
import { users } from "~~/server/database/schema";

export async function requireAdmin(event: H3Event) {
    const userPayload = getAuthenticatedUserPayload(event);
    const user = await useDrizzle().select().from(users)
        .where(eq(users.id, Number(userPayload.id)))
        .get();

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: "Not authenticated"
        });
    }

    if (user.role !== "admin") {
        throw createError({
            statusCode: 403,
            statusMessage: "Admin access required"
        });
    }

    return user;
}
