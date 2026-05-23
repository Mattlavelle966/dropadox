const imageExtensions = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "avif"]);
const videoExtensions = new Set(["mp4", "webm", "ogv", "mov"]);
const audioExtensions = new Set(["mp3", "wav", "m4a", "aac", "flac", "oga", "ogg", "webm"]);
const pdfExtensions = new Set(["pdf"]);
const documentExtensions = new Set(["docx"]);
const spreadsheetExtensions = new Set(["xlsx", "csv", "tsv"]);
const textExtensions = new Set(["txt", "md", "markdown", "json", "xml", "log", "yaml", "yml", "html", "css", "js", "ts"]);

export function getFileExtension(fileName = "") {
    const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
    return extension === fileName.toLowerCase() ? "" : extension;
}

export function isImageFile(fileName = "") {
    return imageExtensions.has(getFileExtension(fileName));
}

export function isVideoFile(fileName = "") {
    return videoExtensions.has(getFileExtension(fileName));
}

export function isPdfFile(fileName = "") {
    return pdfExtensions.has(getFileExtension(fileName));
}

export function isAudioFile(fileName = "") {
    return audioExtensions.has(getFileExtension(fileName));
}

export function isDocumentFile(fileName = "") {
    return documentExtensions.has(getFileExtension(fileName));
}

export function isSpreadsheetFile(fileName = "") {
    return spreadsheetExtensions.has(getFileExtension(fileName));
}

export function isTextFile(fileName = "") {
    return textExtensions.has(getFileExtension(fileName));
}

export function isHtmlPreviewFile(fileName = "") {
    return isDocumentFile(fileName) || isSpreadsheetFile(fileName) || isTextFile(fileName);
}

export function isNativePreviewFile(fileName = "") {
    return isImageFile(fileName) || isVideoFile(fileName) || isAudioFile(fileName) || isPdfFile(fileName);
}

export function isPreviewableFile(fileName = "") {
    return isNativePreviewFile(fileName) || isHtmlPreviewFile(fileName);
}
