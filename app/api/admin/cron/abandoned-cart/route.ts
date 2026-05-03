import type { NextRequest } from "next/server";
import { handleRouteError, ok } from "../../../../../lib/server/api/http.js";
import { requireAccessUserId } from "../../../../../lib/server/auth/session.js";
import { requireAdmin } from "../../../../../lib/server/services/admin.js";
import { runAbandonedCartReminders } from "../../../../../lib/server/services/abandoned-cart.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorize(request: NextRequest): Promise<"admin" | "cron"> {
  const auth = request.headers.get("authorization") || "";
  const expectedSecret = process.env.CRON_SECRET;
  if (
    expectedSecret &&
    auth.startsWith("Bearer ") &&
    auth.slice(7) === expectedSecret
  ) {
    return "cron";
  }

  const userId = requireAccessUserId(request);
  await requireAdmin(userId);
  return "admin";
}

export async function POST(request: NextRequest) {
  try {
    await authorize(request);
    const { searchParams } = new URL(request.url);
    const minIdleMinutes = Number(searchParams.get("minIdle") || 60);
    const smsAfterEmailHours = Number(searchParams.get("smsAfter") || 24);
    const limit = Number(searchParams.get("limit") || 100);
    const result = await runAbandonedCartReminders({
      minIdleMinutes,
      smsAfterEmailHours,
      limit,
    });
    return ok({ success: true, ...result });
  } catch (error) {
    return handleRouteError(error, request);
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
