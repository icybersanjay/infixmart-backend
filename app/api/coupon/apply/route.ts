import type { NextRequest } from "next/server";
import { handleRouteError, ok } from "../../../../lib/server/api/http.js";
import { requireAccessUserId } from "../../../../lib/server/auth/session.js";
import { applyCouponCode } from "../../../../lib/server/services/coupons.js";
import type { Id } from "../../../../lib/server/types.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function parseJson(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function tryGetUserId(request: NextRequest): Id | null {
  try {
    return requireAccessUserId(request);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = tryGetUserId(request);
    return ok(await applyCouponCode(await parseJson(request), userId));
  } catch (error) {
    return handleRouteError(error, request);
  }
}
