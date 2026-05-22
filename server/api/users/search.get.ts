import { like, ne, and, or } from "drizzle-orm";
import { users } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const search = String(query.q ?? "").trim();

    if (search.length < 2) {
        return { users: [] };
    }

    enforceRateLimit(event, "user-search", 120, 60_000);
    const userPayload = getAuthenticatedUserPayload(event);
    const results = await useDrizzle().select({
        id: users.id,
        name: users.name,
        email: users.email
    }).from(users)
        .where(and(
            or(
                like(users.email, `%${search}%`),
                like(users.name, `%${search}%`)
            ),
            ne(users.id, Number(userPayload.id))
        ))
        .limit(10)
        .all();

    return { users: results };
});
