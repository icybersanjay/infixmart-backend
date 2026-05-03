import type { NextRequest } from "next/server";
import { fail, handleRouteError, ok } from "../../../../lib/server/api/http.js";
import { requireAccessUserId } from "../../../../lib/server/auth/session.js";
import { requireAdmin } from "../../../../lib/server/services/admin.js";
import { writeAuditLog } from "../../../../lib/server/repositories/audit.js";
import {
  cancelOrder,
  createCodOrder,
  getAllOrdersForRoute,
  getOrderByIdForUser,
  getUserOrders,
  updateOrderStatus,
} from "../../../../lib/server/services/orders.js";
import { refundOnUserCancellation } from "../../../../lib/server/services/refunds.js";
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
  const [first, second] = segments;

  if (request.method === "POST" && segments.length === 0) {
    return ok(await createCodOrder(requireAccessUserId(request), await parseJson(request)), 201);
  }

  if (request.method === "GET" && first === "myorders") {
    return ok(await getUserOrders(requireAccessUserId(request)));
  }

  if (request.method === "GET" && first === "all") {
    await requireAdminRequest(request);
    const { searchParams } = new URL(request.url);
    return ok(
      await getAllOrdersForRoute({
        page: Number(searchParams.get("page") || 1),
        perPage: Number(searchParams.get("perPage") || 10),
      })
    );
  }

  if (request.method === "GET" && first) {
    return ok(await getOrderByIdForUser(requireAccessUserId(request), Number(first)));
  }

  if (request.method === "PUT" && first && second === "status") {
    const adminId = await requireAdminRequest(request);
    const body = await parseJson(request);
    const result = await updateOrderStatus(
      Number(first),
      body?.status as string,
      (body?.trackingNumber as string) || null,
      (body?.courierName as string) || null,
      (body?.trackingUrl as string) || null
    );
    const fwd = request.headers.get("x-forwarded-for");
    const ip = fwd ? fwd.split(",")[0].trim() : (request.headers.get("x-real-ip") || null);
    await writeAuditLog({ adminId, action: "UPDATE", entity: "order", entityId: first, detail: `Order status changed to ${body?.status}`, ip });
    return ok(result);
  }

  if (request.method === "POST" && first && second === "cancel") {
    const userId = requireAccessUserId(request);
    const body = await parseJson(request);
    const reason = String(body?.reason || "").slice(0, 500);
    const cancelResult = await cancelOrder({
      orderId: Number(first),
      userId,
      reason,
      by: "user",
    });
    let refund: unknown = null;
    let refundError: string | null = null;
    if (cancelResult.requiresRefund) {
      try {
        refund = await refundOnUserCancellation({
          orderId: cancelResult.id,
          requestedById: userId,
          reason: reason || "Customer cancellation",
        });
      } catch (err) {
        console.error("[order-cancel] refund failed:", err);
        const message = err instanceof Error ? err.message : "Refund could not be initiated automatically.";
        refundError = message;
      }
    }
    const message = cancelResult.requiresRefund
      ? refund
        ? "Order cancelled. Refund initiated — funds typically arrive in 5-7 business days."
        : "Order cancelled. Refund could not be initiated automatically — our team has been notified."
      : "Order cancelled";
    return ok({
      success: true,
      error: false,
      message,
      cancel: cancelResult,
      refund,
      refundError,
    });
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
