import fs from "fs";
import { getHeader, sendStream, setHeader, setResponseStatus, type H3Event } from "h3";
import { setPreviewHeaders } from "~~/server/utils/fileStorage";

export function streamPreview(event: H3Event, filePath: string) {
    const stat = fs.statSync(filePath);
    const range = getHeader(event, "range");

    setPreviewHeaders(event, filePath);

    if (!range) {
        setHeader(event, "Content-Length", String(stat.size));
        return sendStream(event, fs.createReadStream(filePath));
    }

    const match = range.match(/^bytes=(\d*)-(\d*)$/);
    if (!match) {
        setHeader(event, "Content-Length", String(stat.size));
        return sendStream(event, fs.createReadStream(filePath));
    }

    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Number(match[2]) : stat.size - 1;
    const safeEnd = Math.min(end, stat.size - 1);

    if (start >= stat.size || safeEnd < start) {
        setResponseStatus(event, 416);
        setHeader(event, "Content-Range", `bytes */${stat.size}`);
        return "";
    }

    setResponseStatus(event, 206);
    setHeader(event, "Content-Range", `bytes ${start}-${safeEnd}/${stat.size}`);
    setHeader(event, "Content-Length", String(safeEnd - start + 1));

    return sendStream(event, fs.createReadStream(filePath, { start, end: safeEnd }));
}
