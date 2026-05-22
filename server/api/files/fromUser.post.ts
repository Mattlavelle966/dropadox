import { folderUserShares, uploads } from '~~/server/database/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { getUserFromPayload } from '~~/server/utils/getUser';
import { getStoredFileName } from '~~/server/utils/fileStorage';

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
        const sharedFolder = await useDrizzle().select().from(folderUserShares)
            .where(and(
                eq(folderUserShares.folderId, String(folderId)),
                eq(folderUserShares.sharedWithUserId, user.id.toString())
            ))
            .get();

        uploadFilter = sharedFolder
            ? eq(uploads.folderId, String(folderId))
            : and(eq(uploads.userId, user.id.toString()), eq(uploads.folderId, String(folderId)));
    }

    const userUploads = await useDrizzle().select().from(uploads)
        .where(uploadFilter)
        .all()

    return {
        userUploads: userUploads.map(upload => ({
            id: upload.id,
            userId: upload.userId,
            folderId: upload.folderId,
            privacyFlag: upload.privacyFlag,
            size: upload.size,
            createdAt: upload.createdAt,
            fileName: upload.filePath ? getStoredFileName(upload.filePath) : null
        }))
    }
});
