import { like, ne, and, or } from "drizzle-orm";
import { users } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const token = String(query.token ?? "");
    const search = String(query.q ?? "").trim();

    if (!token) {
        throw createError({ statusCode: 400, statusMessage: "No token provided" });
    }

    if (search.length < 2) {
        return { users: [] };
    }

    const userPayload = getUserPayload(token);
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
