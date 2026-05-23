import Busboy from "busboy";
import fs from "fs";
import path from "path";
import { uploads } from "../database/schema";
import { getUserStorageBytes } from "../database/userStorage";
import { getUploadDir, safeFileName } from "../utils/fileStorage";

const DEFAULT_MAX_BYTES = 10_000_000_000;

type ParsedUpload = {
    filename?: string;
    mimeType?: string;
    uploadPath?: string;
    folderId?: string;
    size: number;
}

function removeFileIfExists(filePath?: string) {
    if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

function getMaxBytes() {
    const configuredMaxBytes = Number(process.env.MAX_USER_STORAGE_BYTES);
    return Number.isFinite(configuredMaxBytes) && configuredMaxBytes > 0
        ? configuredMaxBytes
        : DEFAULT_MAX_BYTES;
}

async function parseUpload(event: any, maxBytes: number, limitStatus = "FILE_TOO_LARGE"): Promise<ParsedUpload> {
    const uploadDir = getUploadDir();
    return new Promise((resolve, reject) => {
        const parsed: ParsedUpload = { size: 0 };
        const pendingWrites: Promise<void>[] = [];
        let rejected = false;

        const busboy = Busboy({
            headers: event.node.req.headers,
            limits: {
                files: 1,
                fileSize: maxBytes
            }
        });

        busboy.on("field", (name, value) => {
            if (name === "folderId") {
                parsed.folderId = value;
            }
        });

        busboy.on("file", (name, file, info) => {
            if (name !== "file") {
                file.resume();
                return;
            }

            const uuid = crypto.randomUUID();
            const originalName = safeFileName(info.filename || "upload.bin");
            parsed.filename = originalName;
            parsed.mimeType = info.mimeType;
            parsed.uploadPath = path.join(uploadDir, `${uuid}.${originalName}`);

            const writeStream = fs.createWriteStream(parsed.uploadPath);

            file.on("data", (chunk: Buffer) => {
                parsed.size += chunk.length;
            });

            file.on("limit", () => {
                rejected = true;
                removeFileIfExists(parsed.uploadPath);
                reject(createError({
                    statusCode: 413,
                    statusMessage: limitStatus,
                    data: {
                        maxBytes,
                        fileBytes: parsed.size
                    }
                }));
            });

            file.pipe(writeStream);
            pendingWrites.push(new Promise((writeResolve, writeReject) => {
                writeStream.on("finish", writeResolve);
                writeStream.on("error", writeReject);
            }));
        });

        busboy.on("error", (error) => {
            removeFileIfExists(parsed.uploadPath);
            reject(error);
        });

        busboy.on("close", async () => {
            if (rejected) {
                return;
            }

            try {
                await Promise.all(pendingWrites);
                resolve(parsed);
            } catch (error) {
                reject(error);
            }
        });

        event.node.req.pipe(busboy);
    });
}

export default defineEventHandler(async (event) => {
    let parsed: ParsedUpload | undefined;

    try {
        enforceRateLimit(event, "upload", 20, 60_000);
        const userPayload = getAuthenticatedUserPayload(event);
        const maxBytes = getMaxBytes();
        const usedBytes = await getUserStorageBytes(String(userPayload.id));
        const remainingBytes = maxBytes - usedBytes;

        if (remainingBytes <= 0) {
            throw createError({
                statusCode: 413,
                statusMessage: "MAXIMUM_STORAGE_REACHED",
                data: {
                    maxBytes,
                    usedBytes,
                    fileBytes: 0
                }
            });
        }

        parsed = await parseUpload(
            event,
            Math.min(maxBytes, remainingBytes),
            remainingBytes < maxBytes ? "MAXIMUM_STORAGE_REACHED" : "FILE_TOO_LARGE"
        );

        if (!parsed.uploadPath || !parsed.filename) {
            throw createError({
                statusCode: 400,
                statusMessage: "No file provided"
            });
        }

        const db = useDrizzle();
        const userId = String(userPayload.id);
        const folderId = parsed.folderId ? String(parsed.folderId) : null;

        if (folderId) {
            const folderAccess = await getFolderAccess(db, folderId, userId);

            if (!folderAccess || (!folderAccess.isOwner && !folderAccess.isSharedWithUser)) {
                throw createError({
                    statusCode: 404,
                    statusMessage: "Folder not found"
                });
            }
        }

        if (parsed.size > maxBytes) {
            throw createError({
                statusCode: 413,
                statusMessage: "FILE_TOO_LARGE",
                data: {
                    maxBytes,
                    fileBytes: parsed.size
                }
            });
        }

        if (usedBytes + parsed.size > maxBytes) {
            throw createError({
                statusCode: 413,
                statusMessage: "MAXIMUM_STORAGE_REACHED",
                data: {
                    maxBytes,
                    usedBytes,
                    fileBytes: parsed.size
                }
            });
        }

        const folderAccess = folderId ? await getFolderAccess(db, folderId, userId) : null;
        const upload = await db.insert(uploads)
            .values({
                userId: folderAccess ? String(folderAccess.folder.userId) : userId,
                folderId,
                filePath: parsed.uploadPath,
                privacyFlag: "private",
                size: parsed.size,
            }).returning().get();

        return {
            upload: {
                id: upload.id,
                userId: upload.userId,
                folderId: upload.folderId,
                privacyFlag: upload.privacyFlag,
                size: upload.size,
                createdAt: upload.createdAt,
                fileName: parsed.filename
            },
            name: parsed.filename,
            type: parsed.mimeType,
            size: parsed.size
        };
    } catch (error) {
        removeFileIfExists(parsed?.uploadPath);
        throw error;
    }
})
