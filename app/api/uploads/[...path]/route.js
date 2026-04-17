import fs from "fs/promises";
import path from "path";
import { fail } from "../../../../lib/server/api/http.js";
import { publicUploadPathToDiskPath, uploadsDir } from "../../../../lib/server/files/uploads.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Legacy directory used before the storage fix — files uploaded before the fix still live here
const LEGACY_DIRS = [
  path.resolve(process.cwd(), "..", "uploads"),  // Hostinger: /home/uXXX/uploads
  "/home/u633621486/uploads",
  "/home/u633621486/uploads_persistent",
];

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".avif") return "image/avif";
  return "application/octet-stream";
}

async function fileExists(filePath) {
  try { await fs.access(filePath); return true; } catch { return false; }
}

async function resolveDiskPath(filename) {
  const candidates = [
    path.join(uploadsDir, filename),
    ...LEGACY_DIRS.map((d) => path.join(d, filename)),
  ];
  for (const p of candidates) {
    if (await fileExists(p)) return p;
  }
  return null;
}

async function serveUpload(request, context, includeBody = true) {
  const params = context?.params ? await context.params : {};
  const segments = Array.isArray(params.path) ? params.path : [];
  const publicPath = `/uploads/${segments.join("/")}`;

  const primaryDiskPath = publicUploadPathToDiskPath(publicPath);
  if (!primaryDiskPath) {
    return fail(404, "File not found");
  }

  const filename = path.basename(primaryDiskPath);
  const resolvedPath = await resolveDiskPath(filename);

  if (!resolvedPath) {
    return fail(404, "File not found");
  }

  try {
    const stat = await fs.stat(resolvedPath);
    const headers = {
      "content-type": getContentType(resolvedPath),
      "content-length": String(stat.size),
      "cache-control": "public, max-age=31536000, immutable",
    };

    if (!includeBody) {
      return new Response(null, { status: 200, headers });
    }

    const file = await fs.readFile(resolvedPath);
    return new Response(file, { status: 200, headers });
  } catch {
    return fail(404, "File not found");
  }
}

export async function GET(request, context) {
  return serveUpload(request, context, true);
}

export async function HEAD(request, context) {
  return serveUpload(request, context, false);
}
