import Busboy from "busboy";
import fs from "fs";
import path from "path";
import { and, eq } from "drizzle-orm";
import { folders, uploads } from "../database/schema";
import jwt from "jsonwebtoken";
import { UserPayload } from "~/shared/types/UserPayload";
import { getUserStorageBytes } from "../database/userStorage";

const DEFAULT_MAX_BYTES = 10_000_000_000;

type ParsedUpload = {
    token?: string;
    filename?: string;
    mimeType?: string;
    uploadPath?: string;
    folderId?: string;
    size: number;
}

function safeFileName(filename: string) {
    return path.basename(filename).replace(/[^\w.\- ]+/g, "_");
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

async function parseUpload(event: any): Promise<ParsedUpload> {
    const uploadDir = path.join(process.cwd(), "public/uploads");
    fs.mkdirSync(uploadDir, { recursive: true });

    return new Promise((resolve, reject) => {
        const parsed: ParsedUpload = { size: 0 };
        const pendingWrites: Promise<void>[] = [];

        const busboy = Busboy({
            headers: event.node.req.headers,
            limits: {
                files: 1
            }
        });

        busboy.on("field", (name, value) => {
            if (name === "token") {
                parsed.token = value;
            }

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
        parsed = await parseUpload(event);

        if (!parsed.token) {
            throw createError({
                statusCode: 400,
                statusMessage: "No token found"
            });
        }

        if (!parsed.uploadPath || !parsed.filename) {
            throw createError({
                statusCode: 400,
                statusMessage: "No file provided"
            });
        }

        const userPayload = jwt.verify(parsed.token, process.env.JSON_SECRET_KEY!) as UserPayload;
        const usedBytes = await getUserStorageBytes(String(userPayload.id));
        const maxBytes = getMaxBytes();
        const folderId = parsed.folderId ? String(parsed.folderId) : null;

        if (folderId) {
            const folder = await useDrizzle().select().from(folders)
                .where(and(
                    eq(folders.id, Number(folderId)),
                    eq(folders.userId, String(userPayload.id))
                ))
                .get();

            if (!folder) {
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

        const upload = await useDrizzle().insert(uploads)
            .values({
                userId: String(userPayload.id),
                folderId,
                filePath: parsed.uploadPath,
                privacyFlag: "private",
                size: parsed.size,
            }).returning().get();

        return {
            upload,
            name: parsed.filename,
            type: parsed.mimeType,
            size: parsed.size
        };
    } catch (error) {
        removeFileIfExists(parsed?.uploadPath);
        throw error;
    }
})
