import { uploads } from '~~/server/database/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { getUserFromPayload } from '~~/server/utils/getUser';
import { getStoredFileName } from '~~/server/utils/fileStorage';
import { getUsersByIdMetadata } from '~~/server/utils/peopleMetadata';

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    const { folderId } = body;

    const userPayload = getAuthenticatedUserPayload(event);
    const user = await getUserFromPayload(userPayload);

    if (!user) {
        throw createError({
            statusText: "No user found.",
            status: 404
        });
    }

    let uploadFilter = and(eq(uploads.userId, user.id.toString()), isNull(uploads.folderId));

    if (folderId) {
        const folderAccess = await getFolderAccess(useDrizzle(), String(folderId), user.id.toString());

        if (!folderAccess || (!folderAccess.isOwner && !folderAccess.isSharedWithUser)) {
            throw createError({
                statusCode: 404,
                statusMessage: "Folder not found"
            });
        }

        uploadFilter = eq(uploads.folderId, String(folderId));
    }

    const db = useDrizzle();
    const userUploads = await db.select().from(uploads)
        .where(uploadFilter)
        .all()
    const uploaders = await getUsersByIdMetadata(db, userUploads.map((upload) => upload.userId ?? ""));

    return {
        userUploads: userUploads.map(upload => ({
            id: upload.id,
            userId: upload.userId,
            folderId: upload.folderId,
            privacyFlag: upload.privacyFlag,
            size: upload.size,
            createdAt: upload.createdAt,
            fileName: upload.filePath ? getStoredFileName(upload.filePath) : null,
            uploader: upload.userId ? uploaders.get(Number(upload.userId)) ?? null : null
        }))
    }
});
