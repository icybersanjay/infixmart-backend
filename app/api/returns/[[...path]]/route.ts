import type { NextRequest } from "next/server";
import { fail, handleRouteError, ok } from "../../../../lib/server/api/http.js";
import { requireAccessUserId } from "../../../../lib/server/auth/session.js";
import { requireAdmin } from "../../../../lib/server/services/admin.js";
import {
  createReturnRecord,
  getAllReturnsAdmin,
  getMyReturns,
  updateReturnStatusRecord,
} from "../../../../lib/server/services/returns.js";
import type { Id } from "../../../../lib/server/types.js";

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

async function requireAdminRequest(request: NextRequest): Promise<Id> {
  const userId = requireAccessUserId(request);
  await requireAdmin(userId);
  return userId;
}

async function dispatchNativeRoute(request: NextRequest, segments: string[]) {
  const [first] = segments;

  if (request.method === "POST" && segments.length === 0) {
    return ok(await createReturnRecord(requireAccessUserId(request), await parseJson(request)), 201);
  }

  if (request.method === "GET" && first === "my") {
    return ok(await getMyReturns(requireAccessUserId(request)));
  }

  if (request.method === "GET" && segments.length === 0) {
    await requireAdminRequest(request);
    const { searchParams } = new URL(request.url);
    return ok(
      await getAllReturnsAdmin({
        page: Number(searchParams.get("page") || 1),
        perPage: Number(searchParams.get("perPage") || 20),
        status: searchParams.get("status") || "",
      })
    );
  }

  if (request.method === "PUT" && first) {
    await requireAdminRequest(request);
    return ok(await updateReturnStatusRecord(Number(first), await parseJson(request)));
  }

  return null;
}

async function handle(request: NextRequest, context: RouteContext) {
  const params = context?.params ? await context.params : {};
  const segments = Array.isArray(params.path) ? params.path : [];

  try {
    const nativeResponse = await dispatchNativeRoute(request, segments);
    if (nativeResponse) return nativeResponse;
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
