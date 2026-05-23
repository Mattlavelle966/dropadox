import { and, eq } from "drizzle-orm";
import { folders } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "folder-create", 30, 60_000);
    const { name } = await readBody(event);

    const folderName = String(name ?? "").trim();

    if (!folderName) {
        throw createError({
            statusCode: 400,
            statusMessage: "Folder name is required"
        });
    }

    if (folderName.length > 80) {
        throw createError({
            statusCode: 400,
            statusMessage: "Folder name is too long"
        });
    }

    const userPayload = getAuthenticatedUserPayload(event);

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

    return { folder: folderResponse(folder, false) };
});
