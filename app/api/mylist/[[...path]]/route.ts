import type { NextRequest } from "next/server";
import { fail, handleRouteError, ok } from "../../../../lib/server/api/http.js";
import { requireAccessUserId } from "../../../../lib/server/auth/session.js";
import {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} from "../../../../lib/server/services/wishlist.js";

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

async function dispatchNativeRoute(request: NextRequest, segments: string[]) {
  const [first, second] = segments;
  const userId = requireAccessUserId(request);

  if (request.method === "GET" && segments.length === 0) {
    return ok(await getWishlist(userId));
  }

  if (request.method === "POST" && first === "add") {
    return ok(await addToWishlist(userId, await parseJson(request)), 201);
  }

  if (request.method === "DELETE" && first === "remove" && second) {
    return ok(await removeFromWishlist(userId, Number(second)));
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
