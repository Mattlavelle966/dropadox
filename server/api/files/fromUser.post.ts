import jwt from 'jsonwebtoken';
import { folderUserShares, uploads } from '~~/server/database/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { getUserFromPayload, getUserPayload } from '~~/server/utils/getUser';

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    const { token, folderId } = body;

    if (!token) {
        throw createError({
            statusText: "No token provided",
            status: 400,
        })
    }

    const userPayload = getUserPayload(token);
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

    return { userUploads }
});
