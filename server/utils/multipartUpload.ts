import Busboy from "busboy";
import fs from "node:fs";
import path from "node:path";
import { getUserStorageBytes } from "~~/server/database/userStorage";
import { getUploadDir, safeFileName } from "~~/server/utils/fileStorage";
import { getUserStorageMaxBytes } from "~~/server/utils/storageQuota";

export type ParsedMultipartUpload = {
    filename?: string;
    mimeType?: string;
    uploadPath?: string;
    folderId?: string;
    size: number;
}

export function removeUploadedFile(filePath?: string) {
    if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

export async function assertUploadStorageCapacity(db: any, ownerId: string, fileBytes: number) {
    const maxBytes = await getUserStorageMaxBytes(db, ownerId);
    const usedBytes = await getUserStorageBytes(ownerId);

    if (fileBytes > maxBytes) {
        throw createError({
            statusCode: 413,
            statusMessage: "FILE_TOO_LARGE",
            data: { maxBytes, fileBytes }
        });
    }

    if (usedBytes + fileBytes > maxBytes) {
        throw createError({
            statusCode: 413,
            statusMessage: "MAXIMUM_STORAGE_REACHED",
            data: { maxBytes, usedBytes, fileBytes }
        });
    }
}

export async function parseMultipartUpload(
    event: any,
    maxBytes: number,
    limitStatus = "FILE_TOO_LARGE"
): Promise<ParsedMultipartUpload> {
    const uploadDir = getUploadDir();

    return new Promise((resolve, reject) => {
        const parsed: ParsedMultipartUpload = { size: 0 };
        const pendingWrites: Promise<void>[] = [];
        let rejected = false;
        let busboy;

        try {
            busboy = Busboy({
                headers: event.node.req.headers,
                limits: {
                    files: 1,
                    fileSize: maxBytes
                }
            });
        } catch {
            reject(createError({
                statusCode: 400,
                statusMessage: "Content-Type must be multipart/form-data"
            }));
            return;
        }

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

            const originalName = safeFileName(info.filename || "upload.bin");
            parsed.filename = originalName;
            parsed.mimeType = info.mimeType;
            parsed.uploadPath = path.join(uploadDir, `${crypto.randomUUID()}.${originalName}`);

            const writeStream = fs.createWriteStream(parsed.uploadPath);

            file.on("data", (chunk: Buffer) => {
                parsed.size += chunk.length;
            });

            file.on("limit", () => {
                rejected = true;
                writeStream.once("close", () => removeUploadedFile(parsed.uploadPath));
                writeStream.destroy();
                removeUploadedFile(parsed.uploadPath);
                reject(createError({
                    statusCode: 413,
                    statusMessage: limitStatus,
                    data: { maxBytes, fileBytes: parsed.size }
                }));
            });

            file.pipe(writeStream);
            pendingWrites.push(new Promise((writeResolve, writeReject) => {
                writeStream.on("finish", writeResolve);
                writeStream.on("error", (error) => {
                    if (rejected) {
                        writeResolve();
                        return;
                    }

                    writeReject(error);
                });
            }));
        });

        busboy.on("error", (error) => {
            removeUploadedFile(parsed.uploadPath);
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
                removeUploadedFile(parsed.uploadPath);
                reject(error);
            }
        });

        event.node.req.pipe(busboy);
    });
}
