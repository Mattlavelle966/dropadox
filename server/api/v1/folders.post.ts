import { and, eq, isNull } from "drizzle-orm";
import { folders } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "api-v1-folder-create", 60, 60_000);
    const userPayload = await getApiKeyUserPayload(event);
    const body = await readBody(event).catch(() => ({}));
    const name = String(body?.name ?? "").trim();
    const rawParentId = body?.parentId;
    const parentId = rawParentId === undefined || rawParentId === null || rawParentId === ""
        ? null
        : String(rawParentId);

    if (!name) {
        throw createError({ statusCode: 400, statusMessage: "Folder name is required" });
    }

    if (name.length > 80) {
        throw createError({ statusCode: 400, statusMessage: "Folder name is too long" });
    }

    if (parentId && !Number.isInteger(Number(parentId))) {
        throw createError({ statusCode: 400, statusMessage: "Invalid parent folder id" });
    }

    const db = useDrizzle();
    const userId = String(userPayload.id);
    let ownerId = userId;

    if (parentId) {
        const parentAccess = await getFolderAccess(db, parentId, userId);

        if (!parentAccess || (!parentAccess.isOwner && !parentAccess.isSharedWithUser)) {
            throw createError({ statusCode: 404, statusMessage: "Parent folder not found" });
        }

        ownerId = String(parentAccess.folder.userId);
    }

    const existingFolder = await db.select().from(folders)
        .where(and(
            eq(folders.userId, ownerId),
            eq(folders.name, name),
            parentId ? eq(folders.parentId, parentId) : isNull(folders.parentId)
        ))
        .get();

    if (existingFolder) {
        throw createError({ statusCode: 409, statusMessage: "Folder already exists" });
    }

    const folder = await db.insert(folders).values({
        userId: ownerId,
        parentId,
        name
    }).returning().get();

    setResponseStatus(event, 201);
    return {
        folder: {
            id: folder.id,
            parentId: folder.parentId ? Number(folder.parentId) : null,
            name: folder.name,
            ownerId: folder.userId ? Number(folder.userId) : null,
            createdAt: folder.createdAt
        }
    };
});
