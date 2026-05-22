import { and, eq } from "drizzle-orm";
import { folders } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    const { token, name } = await readBody(event);

    if (!token) {
        throw createError({
            statusCode: 400,
            statusMessage: "No token provided"
        });
    }

    const folderName = String(name ?? "").trim();

    if (!folderName) {
        throw createError({
            statusCode: 400,
            statusMessage: "Folder name is required"
        });
    }

    const userPayload = getUserPayload(token);

    const existingFolder = await useDrizzle().select().from(folders)
        .where(and(
            eq(folders.userId, String(userPayload.id)),
            eq(folders.name, folderName)
        ))
        .get();

    if (existingFolder) {
        throw createError({
            statusCode: 409,
            statusMessage: "Folder already exists"
        });
    }

    const folder = await useDrizzle().insert(folders).values({
        userId: String(userPayload.id),
        name: folderName
    }).returning().get();

    return { folder };
});
