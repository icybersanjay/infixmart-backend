import type { NextRequest } from "next/server";
import { fail, handleRouteError, ok } from "../../../../lib/server/api/http.js";
import { requireAccessUserId } from "../../../../lib/server/auth/session.js";
import { requireAdmin } from "../../../../lib/server/services/admin.js";
import {
  bulkDeleteCategories,
  createCategoryRecord,
  deleteCategoryRecord,
  getAllCategories,
  getCategoryById,
  getCategoryCount,
  getSubCategoryCount,
  updateCategoryRecord,
} from "../../../../lib/server/services/categories.js";
import {
  deleteImageByQuery,
  uploadImagesFromRequest,
} from "../../../../lib/server/services/upload-images.js";

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

async function requireAdminRequest(request: NextRequest): Promise<void> {
  const userId = requireAccessUserId(request);
  await requireAdmin(userId);
}

async function dispatchNativeRoute(request: NextRequest, segments: string[]) {
  const [first, second, third] = segments;

  if (request.method === "GET" && segments.length === 0) {
    return ok(await getAllCategories());
  }

  if (request.method === "GET" && first === "get" && second === "count" && !third) {
    return ok(await getCategoryCount());
  }

  if (request.method === "GET" && first === "get" && second === "count" && third === "subcat") {
    return ok(await getSubCategoryCount());
  }

  if (request.method === "GET" && first && segments.length === 1) {
    return ok(await getCategoryById(Number(first)));
  }

  if (request.method === "POST" && first === "createcat") {
    await requireAdminRequest(request);
    return ok(await createCategoryRecord(await parseJson(request) as never), 201);
  }

  if (request.method === "POST" && first === "upload-images") {
    await requireAdminRequest(request);
    return ok(await uploadImagesFromRequest(request));
  }

  if (request.method === "POST" && first === "bulk-delete") {
    await requireAdminRequest(request);
    const body = await parseJson(request);
    return ok(await bulkDeleteCategories(body?.ids as Array<number | string>));
  }

  if (request.method === "DELETE" && first === "deleteimage") {
    await requireAdminRequest(request);
    return ok(await deleteImageByQuery(request));
  }

  if (request.method === "PUT" && first && segments.length === 1) {
    await requireAdminRequest(request);
    return ok(await updateCategoryRecord(Number(first), await parseJson(request) as never));
  }

  if (request.method === "DELETE" && first && segments.length === 1) {
    await requireAdminRequest(request);
    return ok(await deleteCategoryRecord(Number(first)));
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
