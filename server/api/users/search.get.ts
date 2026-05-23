import { like, ne, and, or, sql } from "drizzle-orm";
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
        email: users.email,
        avatarPath: sql<string | null>`(
            select avatar_path from userSettings
            where userSettings.user_id = cast(${users.id} as text)
            limit 1
        )`
    }).from(users)
        .where(and(
            or(
                like(users.email, `%${search}%`),
                like(users.name, `%${search}%`)
            ),
            ne(users.id, Number(userPayload.id)),
            sql`not exists (
                select 1 from userSettings
                where userSettings.user_id = cast(${users.id} as text)
                and userSettings.search_visible = 'false'
            )`
        ))
        .limit(10)
        .all();

    return {
        users: results.map((user) => ({
            id: user.id,
            name: user.name,
            username: user.name,
            email: user.email,
            avatarUrl: userAvatarUrl(user.id, user.avatarPath)
        }))
    };
});
