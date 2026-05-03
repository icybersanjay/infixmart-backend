import { type NextRequest, NextResponse } from "next/server";
import { logSearchQuery } from "../../../lib/server/repositories/search-logs.js";
import { requireAccessUserId } from "../../../lib/server/auth/session.js";
import type { Id } from "../../../lib/server/types.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") || null;
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
    const body = await request.json().catch(() => ({}));
    const q = String(body?.query || "").trim();
    if (!q) {
      return NextResponse.json({ ok: true, skipped: true });
    }
    await logSearchQuery({
      query: q,
      resultCount: Number(body?.resultCount || 0),
      userId: tryGetUserId(request),
      ip: getClientIp(request),
    });
  } catch {
    // Swallow — analytics endpoint must not break the search experience.
  }
  return NextResponse.json({ ok: true });
}
