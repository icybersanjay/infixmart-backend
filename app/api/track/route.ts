import type { NextRequest } from "next/server";
import { fail, handleRouteError, ok } from "../../../lib/server/api/http.js";
import { trackOrder } from "../../../lib/server/services/track.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function parseJson(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseJson(request);
    return ok(await trackOrder({
      orderId: body?.orderId as string | number,
      email: body?.email as string,
      phone: body?.phone as string,
    }));
  } catch (error) {
    return handleRouteError(error, request);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    return ok(await trackOrder({
      orderId: searchParams.get("orderId") ?? "",
      email: searchParams.get("email") ?? undefined,
      phone: searchParams.get("phone") ?? undefined,
    }));
  } catch (error) {
    return handleRouteError(error, request);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function PUT() {
  return fail(405, "Method not allowed");
}
