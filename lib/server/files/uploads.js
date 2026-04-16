import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { HttpError } from "../api/http.js";

const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve(process.cwd(), "uploads");
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
    : 8;
const maxUploadFileSizeBytes = maxUploadFileSizeMb * 1024 * 1024;

async function ensureUploadsDir() {
  await fs.mkdir(uploadsDir, { recursive: true });
}

function sanitizeFilename(extension = "") {
  const safeExt = /^[.][a-z0-9]+$/.test(extension) ? extension : "";
  return `${randomUUID()}${safeExt}`;
}

function resolveUploadExtension(file) {
  const mimeExtensions = allowedMimeTypes.get(String(file?.type || "").toLowerCase());
  const originalExtension = path.extname(file?.name || "").toLowerCase();

  if (!mimeExtensions || !mimeExtensions.includes(originalExtension)) {
    return null;
  }

  return mimeExtensions[0];
}

function validateUploadFile(file) {
  const extension = resolveUploadExtension(file);
  if (!extension) {
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

  return extension;
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
    const extension = validateUploadFile(file);
    const filename = sanitizeFilename(extension);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(uploadsDir, filename), buffer);
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
