import { fail, handleRouteError, ok } from "../../../../lib/server/api/http.js";
import { requireAccessUserId } from "../../../../lib/server/auth/session.js";
import { requireAdmin } from "../../../../lib/server/services/admin.js";
import { writeAuditLog } from "../../../../lib/server/repositories/audit.js";
import {
  createCodOrder,
  getAllOrdersForRoute,
  getOrderByIdForUser,
  getUserOrders,
  updateOrderStatus,
} from "../../../../lib/server/services/orders.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function parseJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function requireAdminRequest(request) {
  const userId = requireAccessUserId(request);
  await requireAdmin(userId);
  return userId;
}

async function dispatchNativeRoute(request, segments) {
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
    return ok(await getOrderByIdForUser(requireAccessUserId(request), first));
  }

  if (request.method === "PUT" && first && second === "status") {
    const adminId = await requireAdminRequest(request);
    const body = await parseJson(request);
    const result = await updateOrderStatus(first, body?.status);
    const fwd = request.headers.get("x-forwarded-for");
    const ip = fwd ? fwd.split(",")[0].trim() : (request.headers.get("x-real-ip") || null);
    await writeAuditLog({ adminId, action: "UPDATE", entity: "order", entityId: first, detail: `Order status changed to ${body?.status}`, ip });
    return ok(result);
  }

  return null;
}

async function handle(request, context) {
  const params = context?.params ? await context.params : {};
  const segments = Array.isArray(params.path) ? params.path : [];

  try {
    const nativeResponse = await dispatchNativeRoute(request, segments);
    if (nativeResponse) return nativeResponse;
    return fail(404, "Route not found");
  } catch (error) {
    return handleRouteError(error);
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
export const HEAD = handle;
