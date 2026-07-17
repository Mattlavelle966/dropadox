import fs from "fs/promises";
import mammoth from "mammoth";
import readXlsxFile from "read-excel-file/node";
import sanitizeHtml from "sanitize-html";
import { setHeader, type H3Event } from "h3";
import { getFileExtension } from "~~/shared/utils/fileType";
import { getStoredFileName } from "~~/server/utils/fileStorage";

const maxTextBytes = 500_000;
const maxStructuredDocumentBytes = 10_000_000;
const maxArchiveUncompressedBytes = 40_000_000;
const maxArchiveEntries = 2_000;
const maxRows = 80;
const maxColumns = 16;

function escapeHtml(value: unknown) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function wrapPreview(title: string, body: string) {
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root{color-scheme:light}
html,body{margin:0;min-height:100%;background:#fff!important;color:#18181b!important}
body{padding:18px;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
table{border-collapse:collapse;width:100%;font-size:13px;background:#fff;color:#18181b}
td,th{border:1px solid #d4d4d8;padding:6px 8px;vertical-align:top;background:#fff;color:#18181b}
pre{white-space:pre-wrap;word-break:break-word;margin:0;font:13px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:#fff;color:#18181b}
img{max-width:100%}
a{color:#2563eb}
</style>
</head>
<body>${body}</body>
</html>`;
}

function tablePreview(rows: unknown[][]) {
    const visibleRows = rows.slice(0, maxRows);
    const body = visibleRows.map((row) => {
        const cells = row.slice(0, maxColumns)
            .map((cell) => `<td>${escapeHtml(cell)}</td>`)
            .join("");
        return `<tr>${cells}</tr>`;
    }).join("");

    return `<table><tbody>${body}</tbody></table>`;
}

function parseDelimited(content: string, delimiter: string) {
    return content.split(/\r?\n/)
        .slice(0, maxRows)
        .map((line) => line.split(delimiter).slice(0, maxColumns));
}

async function readTextPreview(filePath: string) {
    const handle = await fs.open(filePath, "r");

    try {
        const buffer = Buffer.alloc(maxTextBytes);
        const { bytesRead } = await handle.read(buffer, 0, maxTextBytes, 0);
        return buffer.subarray(0, bytesRead).toString("utf8");
    } finally {
        await handle.close();
    }
}

async function assertSafeStructuredDocument(filePath: string) {
    const stat = await fs.stat(filePath);
    if (stat.size > maxStructuredDocumentBytes) {
        throw createError({ statusCode: 413, statusMessage: "Document is too large to preview" });
    }

    const archive = await fs.readFile(filePath);
    let endRecordOffset = -1;

    for (let offset = archive.length - 22; offset >= Math.max(0, archive.length - 65_557); offset -= 1) {
        if (archive.readUInt32LE(offset) === 0x06054b50) {
            endRecordOffset = offset;
            break;
        }
    }

    if (endRecordOffset < 0) {
        throw createError({ statusCode: 415, statusMessage: "Invalid document archive" });
    }

    const declaredEntries = archive.readUInt16LE(endRecordOffset + 10);
    const centralDirectorySize = archive.readUInt32LE(endRecordOffset + 12);
    const centralDirectoryOffset = archive.readUInt32LE(endRecordOffset + 16);

    if (declaredEntries > maxArchiveEntries
        || centralDirectoryOffset + centralDirectorySize > archive.length) {
        throw createError({ statusCode: 415, statusMessage: "Invalid document archive" });
    }

    let entryOffset = centralDirectoryOffset;
    let parsedEntries = 0;
    let compressedBytes = 0;
    let uncompressedBytes = 0;

    while (entryOffset < centralDirectoryOffset + centralDirectorySize) {
        if (entryOffset + 46 > archive.length || archive.readUInt32LE(entryOffset) !== 0x02014b50) {
            throw createError({ statusCode: 415, statusMessage: "Invalid document archive" });
        }

        const compressedSize = archive.readUInt32LE(entryOffset + 20);
        const uncompressedSize = archive.readUInt32LE(entryOffset + 24);
        const fileNameLength = archive.readUInt16LE(entryOffset + 28);
        const extraLength = archive.readUInt16LE(entryOffset + 30);
        const commentLength = archive.readUInt16LE(entryOffset + 32);

        if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff) {
            throw createError({ statusCode: 415, statusMessage: "Unsupported document archive" });
        }

        compressedBytes += compressedSize;
        uncompressedBytes += uncompressedSize;
        parsedEntries += 1;

        if (parsedEntries > maxArchiveEntries
            || uncompressedBytes > maxArchiveUncompressedBytes
            || (compressedBytes > 0 && uncompressedBytes / compressedBytes > 100)) {
            throw createError({ statusCode: 413, statusMessage: "Document is too large to preview" });
        }

        entryOffset += 46 + fileNameLength + extraLength + commentLength;
    }

    if (parsedEntries !== declaredEntries || entryOffset !== centralDirectoryOffset + centralDirectorySize) {
        throw createError({ statusCode: 415, statusMessage: "Invalid document archive" });
    }
}

export async function renderDocumentPreview(event: H3Event, filePath: string) {
    const fileName = getStoredFileName(filePath);
    const extension = getFileExtension(fileName);
    let body = "";

    if (extension === "docx") {
        await assertSafeStructuredDocument(filePath);
        const result = await mammoth.convertToHtml({ path: filePath });
        body = sanitizeHtml(result.value, {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2", "table", "thead", "tbody", "tr", "th", "td"]),
            allowedAttributes: {
                a: ["href", "name"],
                img: ["src", "alt"],
                table: ["colspan", "rowspan"],
                th: ["colspan", "rowspan"],
                td: ["colspan", "rowspan"]
            },
            allowedSchemes: ["http", "https", "mailto"],
            allowedSchemesByTag: {
                img: ["data"]
            }
        });
    } else if (extension === "xlsx") {
        await assertSafeStructuredDocument(filePath);
        const sheets = await readXlsxFile(filePath);
        body = tablePreview(sheets[0]?.data ?? []);
    } else if (extension === "csv" || extension === "tsv") {
        const text = await readTextPreview(filePath);
        body = tablePreview(parseDelimited(text, extension === "tsv" ? "\t" : ","));
    } else {
        const text = await readTextPreview(filePath);
        body = `<pre>${escapeHtml(text)}</pre>`;
    }

    setHeader(event, "Content-Type", "text/html; charset=utf-8");
    setHeader(event, "Content-Security-Policy", "default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'");
    setHeader(event, "X-Content-Type-Options", "nosniff");

    return wrapPreview(fileName, body || `<p>No preview content available.</p>`);
}
