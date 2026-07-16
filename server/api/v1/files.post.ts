import { uploads } from "~~/server/database/schema";
import { getUserStorageBytes } from "~~/server/database/userStorage";
import { getUserStorageMaxBytes } from "~~/server/utils/storageQuota";
import type { ParsedMultipartUpload } from "~~/server/utils/multipartUpload";

export default defineEventHandler(async (event) => {
    let parsed: ParsedMultipartUpload | undefined;

    try {
        enforceRateLimit(event, "api-v1-file-upload", 60, 60_000);
        const userPayload = await getApiKeyUserPayload(event);
        const db = useDrizzle();
        const userId = String(userPayload.id);
        const maxBytes = await getUserStorageMaxBytes(db, userId);
        const usedBytes = await getUserStorageBytes(userId);
        const remainingBytes = maxBytes - usedBytes;

        if (remainingBytes <= 0) {
            throw createError({
                statusCode: 413,
                statusMessage: "MAXIMUM_STORAGE_REACHED",
                data: { maxBytes, usedBytes, fileBytes: 0 }
            });
        }

        parsed = await parseMultipartUpload(
            event,
            Math.min(maxBytes, remainingBytes),
            remainingBytes < maxBytes ? "MAXIMUM_STORAGE_REACHED" : "FILE_TOO_LARGE"
        );

        if (!parsed.uploadPath || !parsed.filename) {
            throw createError({ statusCode: 400, statusMessage: "No file provided" });
        }

        const folderId = parsed.folderId ? String(parsed.folderId) : null;
        let folderAccess = null;

        if (folderId) {
            if (!Number.isInteger(Number(folderId))) {
                throw createError({ statusCode: 400, statusMessage: "Invalid folder id" });
            }

            folderAccess = await getFolderAccess(db, folderId, userId);

            if (!folderAccess || (!folderAccess.isOwner && !folderAccess.isSharedWithUser)) {
                throw createError({ statusCode: 404, statusMessage: "Folder not found" });
            }
        }

        const storageOwnerId = folderAccess ? String(folderAccess.folder.userId) : userId;
        await assertUploadStorageCapacity(db, storageOwnerId, parsed.size);

        const upload = await db.insert(uploads).values({
            userId: storageOwnerId,
            folderId,
            filePath: parsed.uploadPath,
            privacyFlag: "private",
            size: parsed.size
        }).returning().get();

        setResponseStatus(event, 201);
        return {
            file: {
                id: upload.id,
                folderId: upload.folderId ? Number(upload.folderId) : null,
                name: parsed.filename,
                type: parsed.mimeType,
                size: upload.size ?? 0,
                createdAt: upload.createdAt,
                downloadUrl: `/api/v1/files/${upload.id}`
            }
        };
    } catch (error) {
        removeUploadedFile(parsed?.uploadPath);
        throw error;
    }
});
