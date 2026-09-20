import multer from "multer";

import path from "node:path";

const allowedMimeTypes = new Set([
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/pjpeg",
    "image/png",
    "image/x-png",
    "image/webp",
    "image/heic",
    "image/heif",
    "video/mp4",
]);

const allowedExtensions = new Set([
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".heic",
    ".heif",
    ".mp4",
]);

export const documentUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: Number(process.env.MAX_DOCUMENT_SIZE_BYTES) || 10 * 1024 * 1024,
    },
    fileFilter: (_req, file, callback) => {
        const mime = (file.mimetype || "").toLowerCase();
        const ext = path.extname(file.originalname || "").toLowerCase();
        if (allowedMimeTypes.has(mime) || allowedExtensions.has(ext)) {
            return callback(null, true);
        }
        callback(new Error("Unsupported file type. Use PDF, JPG, PNG, WEBP, or MP4."));
    },
});
