import fs from "fs";
import path from "path";
import { getFileExtension } from "~~/shared/utils/fileType";

export function getUploadDir() {
    const uploadDir = path.join(process.cwd(), "uploads");
    fs.mkdirSync(uploadDir, { recursive: true });
    return uploadDir;
}

export function safeFileName(filename: string) {
    return path.basename(filename).replace(/[^\w.\- ]+/g, "_");
}

export function getStoredFileName(filePath: string) {
    const base = path.basename(filePath);
    const parts = base.split(".");
    return parts.length > 1 ? parts.slice(1).join(".") : base;
}

export function setDownloadHeaders(event: any, filePath: string) {
    const filename = safeFileName(getStoredFileName(filePath) || "download");
    setHeader(event, "Content-Type", "application/octet-stream");
    setHeader(event, "Content-Disposition", `attachment; filename="${filename.replace(/"/g, "_")}"`);
    setHeader(event, "X-Content-Type-Options", "nosniff");
}

const previewContentTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
    avif: "image/avif",
    mp4: "video/mp4",
    webm: "video/webm",
    ogv: "video/ogg",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/mp4",
    aac: "audio/aac",
    flac: "audio/flac",
    oga: "audio/ogg",
    ogg: "audio/ogg",
    pdf: "application/pdf"
};

export function getPreviewContentType(filePath: string) {
    return previewContentTypes[getFileExtension(getStoredFileName(filePath))] ?? null;
}

export function setPreviewHeaders(event: any, filePath: string) {
    const contentType = getPreviewContentType(filePath);

    if (!contentType) {
        throw createError({
            statusCode: 415,
            statusMessage: "Preview not supported"
        });
    }

    const filename = safeFileName(getStoredFileName(filePath) || "preview");
    setHeader(event, "Content-Type", contentType);
    setHeader(event, "Content-Disposition", `inline; filename="${filename.replace(/"/g, "_")}"`);
    setHeader(event, "X-Content-Type-Options", "nosniff");
    setHeader(event, "Accept-Ranges", "bytes");
}
