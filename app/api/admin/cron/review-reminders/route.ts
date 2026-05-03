import type { NextRequest } from "next/server";
import { handleRouteError, ok } from "../../../../../lib/server/api/http.js";
import { requireAccessUserId } from "../../../../../lib/server/auth/session.js";
import { requireAdmin } from "../../../../../lib/server/services/admin.js";
import { sendPendingReviewReminders } from "../../../../../lib/server/services/review-reminders.js";

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
    const daysAfter = Number(searchParams.get("daysAfter") || 7);
    const limit = Number(searchParams.get("limit") || 50);
    const result = await sendPendingReviewReminders({ daysAfter, limit });
    return ok({ success: true, ...result });
  } catch (error) {
    return handleRouteError(error, request);
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
