import { and, eq } from "drizzle-orm";
import { folderPublicShares, folders } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    const folderId = Number(getRouterParam(event, "folderId"));
    const { token } = await readBody(event);

    if (!Number.isInteger(folderId)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid folder id" });
    }

    if (!token) {
        throw createError({ statusCode: 400, statusMessage: "No token provided" });
    }

    const userPayload = getUserPayload(token);
    const userId = String(userPayload.id);
    const db = useDrizzle();

    const folder = await db.select().from(folders)
        .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
        .get();

    if (!folder) {
        throw createError({ statusCode: 404, statusMessage: "Folder not found" });
    }

    let share = await db.select().from(folderPublicShares)
        .where(and(eq(folderPublicShares.folderId, String(folderId)), eq(folderPublicShares.userId, userId)))
        .get();

    if (!share) {
        share = await db.insert(folderPublicShares).values({
            folderId: String(folderId),
            userId,
            token: crypto.randomUUID()
        }).returning().get();
    }

    return {
        token: share.token,
        url: `/share/folder/${share.token}`
    };
});
