import Busboy from "busboy";
import fs from "fs";
import path from "path";
import { sendStream, setHeader, type H3Event } from "h3";
import { getUploadDir, safeFileName } from "~~/server/utils/fileStorage";

const maxImageBytes = 5_000_000;
const imageContentTypes: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/bmp": "bmp"
};

const extensionContentTypes: Record<string, string> = Object.fromEntries(
    Object.entries(imageContentTypes).map(([contentType, extension]) => [extension, contentType])
);

export type StoredImage = {
    filePath: string;
    size: number;
    mimeType: string;
}

export function removeStoredImage(filePath?: string | null) {
    if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

function imageUploadDir(scope: string) {
    const dir = path.join(getUploadDir(), scope);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function imageContentTypeForPath(filePath: string) {
    const extension = path.extname(filePath).slice(1).toLowerCase();
    return extensionContentTypes[extension] ?? null;
}

function hasValidImageSignature(filePath: string, mimeType: string) {
    const descriptor = fs.openSync(filePath, "r");

    try {
        const header = Buffer.alloc(32);
        const bytesRead = fs.readSync(descriptor, header, 0, header.length, 0);
        const bytes = header.subarray(0, bytesRead);

        if (mimeType === "image/jpeg") {
            return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
        }

        if (mimeType === "image/png") {
            return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        }

        if (mimeType === "image/gif") {
            const signature = bytes.subarray(0, 6).toString("ascii");
            return signature === "GIF87a" || signature === "GIF89a";
        }

        if (mimeType === "image/webp") {
            return bytes.length >= 12
                && bytes.subarray(0, 4).toString("ascii") === "RIFF"
                && bytes.subarray(8, 12).toString("ascii") === "WEBP";
        }

        if (mimeType === "image/bmp") {
            return bytes.length >= 2 && bytes.subarray(0, 2).toString("ascii") === "BM";
        }

        if (mimeType === "image/avif") {
            const brands = bytes.subarray(8).toString("ascii");
            return bytes.length >= 16
                && bytes.subarray(4, 8).toString("ascii") === "ftyp"
                && (brands.includes("avif") || brands.includes("avis"));
        }

        return false;
    } finally {
        fs.closeSync(descriptor);
    }
}

export function parseImageUpload(event: H3Event, scope: string): Promise<StoredImage> {
    return new Promise((resolve, reject) => {
        let upload: StoredImage | null = null;
        let rejected = false;
        const pendingWrites: Promise<void>[] = [];

        function fail(error: any) {
            if (rejected) {
                return;
            }

            rejected = true;
            removeStoredImage(upload?.filePath);
            reject(error);
        }

        const busboy = Busboy({
            headers: event.node.req.headers,
            limits: {
                files: 1,
                fields: 0,
                parts: 1,
                fileSize: maxImageBytes
            }
        });

        busboy.on("file", (name, file, info) => {
            if (!["file", "image", "avatar", "icon"].includes(name)) {
                file.resume();
                return;
            }

            const extension = imageContentTypes[info.mimeType];
            if (!extension) {
                file.resume();
                fail(createError({
                    statusCode: 415,
                    statusMessage: "Only common image files are supported"
                }));
                return;
            }

            const originalName = safeFileName(info.filename || `image.${extension}`);
            const filePath = path.join(imageUploadDir(scope), `${crypto.randomUUID()}.${originalName}.${extension}`);
            upload = {
                filePath,
                size: 0,
                mimeType: info.mimeType
            };

            const writeStream = fs.createWriteStream(filePath);

            file.on("data", (chunk: Buffer) => {
                if (upload) {
                    upload.size += chunk.length;
                }
            });

            file.on("limit", () => {
                writeStream.once("close", () => removeStoredImage(upload?.filePath));
                writeStream.destroy();
                fail(createError({
                    statusCode: 413,
                    statusMessage: "Image is too large"
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

        busboy.on("error", fail);
        busboy.on("close", async () => {
            if (rejected) {
                return;
            }

            try {
                await Promise.all(pendingWrites);
                if (!upload) {
                    throw createError({
                        statusCode: 400,
                        statusMessage: "No image provided"
                    });
                }

                if (!hasValidImageSignature(upload.filePath, upload.mimeType)) {
                    throw createError({
                        statusCode: 415,
                        statusMessage: "File contents do not match the selected image type"
                    });
                }

                resolve(upload);
            } catch (error) {
                fail(error);
            }
        });

        event.node.req.pipe(busboy);
    });
}

export function serveStoredImage(event: H3Event, filePath?: string | null) {
    if (!filePath || !fs.existsSync(filePath)) {
        throw createError({
            statusCode: 404,
            statusMessage: "Image not found"
        });
    }

    const contentType = imageContentTypeForPath(filePath);
    if (!contentType) {
        throw createError({
            statusCode: 415,
            statusMessage: "Image not supported"
        });
    }

    setHeader(event, "Content-Type", contentType);
    setHeader(event, "Content-Disposition", "inline");
    setHeader(event, "Cache-Control", "private, max-age=60");
    setHeader(event, "X-Content-Type-Options", "nosniff");
    return sendStream(event, fs.createReadStream(filePath));
}
