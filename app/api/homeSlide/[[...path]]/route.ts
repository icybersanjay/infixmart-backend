import type { NextRequest } from "next/server";
import { HttpError, fail, handleRouteError, ok } from "../../../../lib/server/api/http.js";
import { requireAccessUserId } from "../../../../lib/server/auth/session.js";
import { saveUploadedFiles } from "../../../../lib/server/files/uploads.js";
import { requireAdmin } from "../../../../lib/server/services/admin.js";
import {
  createHomeSlideRecord,
  deleteHomeSlideRecord,
  getHomeSlidesPublic,
  updateHomeSlideRecord,
} from "../../../../lib/server/services/home-slides.js";

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
  const [first] = segments;

  if (request.method === "GET" && segments.length === 0) {
    const { searchParams } = new URL(request.url);
    return ok(
      await getHomeSlidesPublic({ type: searchParams.get("type") || "" })
    );
  }

  if (request.method === "POST" && first === "upload-images") {
    await requireAdminRequest(request);
    const formData = await request.formData();
    const images = await saveUploadedFiles(formData, "images");
    if (!images.length) {
      throw new HttpError(400, "No images provided");
    }
    return ok({ success: true, images });
  }

  if (request.method === "POST" && first === "create") {
    await requireAdminRequest(request);
    return ok(await createHomeSlideRecord(await parseJson(request)), 201);
  }

  if (request.method === "PUT" && first && segments.length === 1) {
    await requireAdminRequest(request);
    return ok(await updateHomeSlideRecord(Number(first), await parseJson(request)));
  }

  if (request.method === "DELETE" && first && segments.length === 1) {
    await requireAdminRequest(request);
    return ok(await deleteHomeSlideRecord(Number(first)));
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
