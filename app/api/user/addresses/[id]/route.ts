import type { NextRequest } from "next/server";
import { handleRouteError, ok } from "../../../../../lib/server/api/http.js";
import { requireAccessUserId } from "../../../../../lib/server/auth/session.js";
import {
  deleteMyAddress,
  updateMyAddress,
} from "../../../../../lib/server/services/addresses.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params?: Promise<{ id: string }> };

async function parseJson(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const params = context?.params ? await context.params : ({} as { id: string });
    const userId = requireAccessUserId(request);
    return ok(await updateMyAddress(userId, Number(params.id), await parseJson(request)));
  } catch (error) {
    return handleRouteError(error, request);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const params = context?.params ? await context.params : ({} as { id: string });
    const userId = requireAccessUserId(request);
    return ok(await deleteMyAddress(userId, Number(params.id)));
  } catch (error) {
    return handleRouteError(error, request);
  }
}
