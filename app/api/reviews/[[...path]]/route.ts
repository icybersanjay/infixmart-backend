import type { NextRequest } from "next/server";
import { fail, handleRouteError, ok } from "../../../../lib/server/api/http.js";
import { requireAccessUserId } from "../../../../lib/server/auth/session.js";
import {
  checkMyReview,
  createReviewRecord,
  deleteReviewRecord,
  getMyReviews,
  getProductReviews,
  updateReviewRecord,
} from "../../../../lib/server/services/reviews.js";

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

  if (request.method === "GET" && first === "product" && second) {
    const { searchParams } = new URL(request.url);
    return ok(
      await getProductReviews(Number(second), {
        page: Number(searchParams.get("page") || 1),
        perPage: Number(searchParams.get("perPage") || 10),
      })
    );
  }

  if (request.method === "GET" && first === "my" && segments.length === 1) {
    return ok(await getMyReviews(requireAccessUserId(request)));
  }

  if (request.method === "GET" && first === "check" && second) {
    return ok(await checkMyReview(requireAccessUserId(request), Number(second)));
  }

  if (request.method === "POST" && segments.length === 0) {
    return ok(
      await createReviewRecord(requireAccessUserId(request), await parseJson(request)),
      201
    );
  }

  if (request.method === "PUT" && first && segments.length === 1) {
    return ok(
      await updateReviewRecord(
        requireAccessUserId(request),
        Number(first),
        await parseJson(request)
      )
    );
  }

  if (request.method === "DELETE" && first && segments.length === 1) {
    return ok(await deleteReviewRecord(requireAccessUserId(request), Number(first)));
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
