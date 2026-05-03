import type { NextRequest } from "next/server";
import { fail, handleRouteError, ok } from "../../../../lib/server/api/http.js";
import { requireAccessUserId } from "../../../../lib/server/auth/session.js";
import { saveUploadedFiles } from "../../../../lib/server/files/uploads.js";
import { requireAdmin } from "../../../../lib/server/services/admin.js";
import {
  createBlogRecord,
  deleteBlogRecord,
  getBlogPublic,
  getBlogsAdmin,
  getBlogsPublic,
  updateBlogRecord,
} from "../../../../lib/server/services/blogs.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params?: Promise<{ path?: string[] }> };

async function parseJson(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function parseBlogBody(request: NextRequest): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return parseJson(request);
  }

  const formData = await request.formData();
  const [uploadedImage] = await saveUploadedFiles(formData, "image");
  const currentImage = formData.get("image");

  return {
    title: formData.get("title") || "",
    excerpt: formData.get("excerpt") || "",
    content: formData.get("content") || "",
    author: formData.get("author") || "",
    published: formData.get("published"),
    image:
      uploadedImage ||
      (typeof currentImage === "string" ? currentImage : undefined),
  };
}

async function requireAdminRequest(request: NextRequest): Promise<void> {
  const userId = requireAccessUserId(request);
  await requireAdmin(userId);
}

async function dispatchNativeRoute(request: NextRequest, segments: string[]) {
  const [first, second] = segments;

  if (request.method === "GET" && segments.length === 0) {
    const { searchParams } = new URL(request.url);
    return ok(
      await getBlogsPublic({
        page: Number(searchParams.get("page") || 1),
        perPage: Number(searchParams.get("perPage") || 10),
      })
    );
  }

  if (request.method === "GET" && first === "admin" && second === "all") {
    await requireAdminRequest(request);
    return ok(await getBlogsAdmin());
  }

  if (request.method === "GET" && first && !second) {
    return ok(await getBlogPublic(first));
  }

  if (request.method === "POST" && segments.length === 0) {
    await requireAdminRequest(request);
    return ok(await createBlogRecord(await parseBlogBody(request)), 201);
  }

  if (request.method === "PUT" && first && !second) {
    await requireAdminRequest(request);
    return ok(await updateBlogRecord(Number(first), await parseBlogBody(request)));
  }

  if (request.method === "DELETE" && first && !second) {
    await requireAdminRequest(request);
    return ok(await deleteBlogRecord(Number(first)));
  }

  return null;
}

async function handle(request: NextRequest, context: RouteContext) {
  const params = context?.params ? await context.params : {};
  const segments = Array.isArray(params.path) ? params.path : [];

  try {
    const nativeResponse = await dispatchNativeRoute(request, segments);
    if (nativeResponse) {
      return nativeResponse;
    }
    return fail(404, "Route not found");
  } catch (error) {
    return handleRouteError(error, request);
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
export const HEAD = handle;
