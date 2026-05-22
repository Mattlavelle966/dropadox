import fs from "fs";
import path from "path";

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
