import type { NextRequest } from "next/server";
import { fail, handleRouteError, ok } from "../../../../lib/server/api/http.js";
import { requireAccessUserId } from "../../../../lib/server/auth/session.js";
import {
  createMembershipPaymentOrder,
  verifyMembershipPayment,
  revokeMembership,
  getMembershipStatus,
} from "../../../../lib/server/services/membership.js";

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

async function dispatchRoute(request: NextRequest, segments: string[]) {
  const [first] = segments;
  const userId = requireAccessUserId(request);

  if (request.method === "GET" && first === "status") {
    return ok(await getMembershipStatus(userId));
  }

  if (request.method === "POST" && first === "create-order") {
    return ok(await createMembershipPaymentOrder(userId));
  }

  if (request.method === "POST" && first === "verify") {
    return ok(await verifyMembershipPayment(userId, await parseJson(request)));
  }

  if (request.method === "POST" && first === "revoke") {
    return ok(await revokeMembership(userId));
  }

  return null;
}

async function handle(request: NextRequest, context: RouteContext) {
  const params = context?.params ? await context.params : {};
  const segments = Array.isArray(params.path) ? params.path : [];

  try {
    const response = await dispatchRoute(request, segments);
    if (response) return response;
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
