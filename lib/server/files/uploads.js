import { createWriteStream } from "fs";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import sharp from "sharp";
import { HttpError } from "../api/http.js";

// On Hostinger: cwd is /home/uXXX/nodejs, so ../uploads = /home/uXXX/uploads (outside project, survives deploys)
// In development: cwd is the project root, so ../uploads is one level up (harmless)
// UPLOADS_DIR env var still overrides if explicitly set
const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve(process.cwd(), "..", "uploads");

const allowedMimeTypes = new Map([
  ["image/jpeg", [".jpg", ".jpeg"]],
  ["image/png", [".png"]],
  ["image/webp", [".webp"]],
  ["image/gif", [".gif"]],
  ["image/avif", [".avif"]],
]);
const parsedMaxUploadFiles = Number(process.env.UPLOAD_MAX_FILES);
const parsedMaxUploadFileSizeMb = Number(process.env.UPLOAD_MAX_FILE_SIZE_MB);
const maxUploadFiles =
  Number.isFinite(parsedMaxUploadFiles) && parsedMaxUploadFiles > 0
    ? Math.floor(parsedMaxUploadFiles)
    : 10;
const maxUploadFileSizeMb =
  Number.isFinite(parsedMaxUploadFileSizeMb) && parsedMaxUploadFileSizeMb > 0
    ? parsedMaxUploadFileSizeMb
    : 4;
const maxUploadFileSizeBytes = maxUploadFileSizeMb * 1024 * 1024;

async function ensureUploadsDir() {
  await fs.mkdir(uploadsDir, { recursive: true });
}

function sanitizeFilename(extension = "") {
  const safeExt = /^[.][a-z0-9]+$/.test(extension) ? extension : "";
  return `${randomUUID()}${safeExt}`;
}

function validateUploadFile(file) {
  const mimeExtensions = allowedMimeTypes.get(String(file?.type || "").toLowerCase());
  if (!mimeExtensions) {
    throw new HttpError(
      400,
      "Only JPG, JPEG, PNG, WEBP, GIF, or AVIF image uploads are allowed."
    );
  }

  const originalExtension = path.extname(file?.name || "").toLowerCase();
  if (originalExtension && !mimeExtensions.includes(originalExtension)) {
    throw new HttpError(
      400,
      "Only JPG, JPEG, PNG, WEBP, GIF, or AVIF image uploads are allowed."
    );
  }

  if (!Number.isFinite(file?.size) || Number(file.size) <= 0) {
    throw new HttpError(400, "Uploaded file is empty.");
  }

  if (Number(file.size) > maxUploadFileSizeBytes) {
    throw new HttpError(
      413,
      `Each image must be smaller than ${Math.floor(maxUploadFileSizeMb)}MB.`
    );
  }
}

async function saveUploadedFiles(formData, fieldName) {
  const entries = formData.getAll(fieldName).filter(Boolean);
  if (entries.length > maxUploadFiles) {
    throw new HttpError(
      400,
      `You can upload up to ${maxUploadFiles} images at a time.`
    );
  }

  await ensureUploadsDir();

  const savedPaths = [];

  for (const entry of entries) {
    if (typeof entry === "string") {
      continue;
    }

    const file = entry;
    validateUploadFile(file);

    // Always output as WebP — best compression, smallest size
    const filename = sanitizeFilename(".webp");
    const fullPath = path.join(uploadsDir, filename);

    const compressor = sharp()
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 });

    await pipeline(
      Readable.fromWeb(file.stream()),
      compressor,
      createWriteStream(fullPath)
    );

    savedPaths.push(`/uploads/${filename}`);
  }

  return savedPaths;
}

function publicUploadPathToDiskPath(publicPath) {
  if (typeof publicPath !== "string") {
    return null;
  }

  const normalized = publicPath.replace(/\\/g, "/");
  if (!normalized.startsWith("/uploads/")) {
    return null;
  }

  const relative = normalized.slice("/uploads/".length);
  if (!relative || relative.includes("/")) {
    return null;
  }

  return path.join(uploadsDir, path.basename(relative));
}

async function deleteUploadByPublicPath(publicPath) {
  const diskPath = publicUploadPathToDiskPath(publicPath);
  if (!diskPath) {
    return false;
  }

  try {
    await fs.unlink(diskPath);
    return true;
  } catch {
    return false;
  }
}

export {
  deleteUploadByPublicPath,
  ensureUploadsDir,
  publicUploadPathToDiskPath,
  saveUploadedFiles,
  uploadsDir,
};
