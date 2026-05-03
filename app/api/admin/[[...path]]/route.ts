import type { NextRequest } from "next/server";
import { fail, handleRouteError, ok } from "../../../../lib/server/api/http.js";
import { setAuthCookies } from "../../../../lib/server/auth/cookies.js";
import { requireAccessUserId } from "../../../../lib/server/auth/session.js";
import { writeAuditLog } from "../../../../lib/server/repositories/audit.js";
import {
  adminLogin,
  bulkSetUserStatus,
  exportCouponsCsv,
  exportOrdersCsv,
  exportProductsCsv,
  exportUsersCsv,
  getAllOrdersAdmin,
  getAllUsers,
  getDashboardStats,
  getSingleUserStats,
  requireAdmin,
  requireManagerOrAbove,
  requireSuperAdmin,
  sendAdminTestEmail,
  updateUserStatus,
} from "../../../../lib/server/services/admin.js";
import { listLowStockProducts } from "../../../../lib/server/repositories/products.js";
import { listTopSearches, listZeroResultSearches } from "../../../../lib/server/repositories/search-logs.js";
import { quickSearch } from "../../../../lib/server/services/admin-search.js";
import { importProductsCsv, buildSampleCsv } from "../../../../lib/server/services/product-import.js";
import {
  addAttributeType,
  addAttributeTypeValue,
  editAttributeType,
  getAttributeTypes,
  getAttributeValues,
  removeAttributeType,
  removeAttributeTypeValue,
} from "../../../../lib/server/services/attributes.js";
import {
  getSettingsAdmin,
  saveSetting,
} from "../../../../lib/server/services/settings.js";
import {
  createHomePageItemRecord,
  deleteHomePageItemRecord,
  getAllSectionsAdmin,
  updateHomePageItemRecord,
  uploadHomePageImage,
} from "../../../../lib/server/services/homepage.js";
import {
  createCouponRecord,
  deleteCouponRecord,
  getAllCouponsAdmin,
  updateCouponRecord,
} from "../../../../lib/server/services/coupons.js";
import { bulkSetOrderStatus, cancelOrder } from "../../../../lib/server/services/orders.js";
import {
  listRefundsForOrder,
  refundOnUserCancellation,
  requestRefund,
} from "../../../../lib/server/services/refunds.js";
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

async function requireSuperAdminRequest(request: NextRequest): Promise<Id> {
  const userId = requireAccessUserId(request);
  await requireSuperAdmin(userId);
  return userId;
}

// Reserved for future routes.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function requireManagerRequest(request: NextRequest): Promise<Id> {
  const userId = requireAccessUserId(request);
  await requireManagerOrAbove(userId);
  return userId;
}

function getIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : (request.headers.get("x-real-ip") || null);
}

async function dispatchNativeRoute(request: NextRequest, segments: string[]) {
  const [first, second, third] = segments;

  if (request.method === "POST" && first === "login") {
    const result = await adminLogin(await parseJson(request));
    const response = ok(result.body);
    setAuthCookies(response, result.tokens);
    return response;
  }

  if (request.method === "GET" && first === "stats") {
    await requireAdminRequest(request);
    const { searchParams } = new URL(request.url);
    const windowDays = Number(searchParams.get("windowDays")) || 30;
    return ok(await getDashboardStats({ windowDays }));
  }

  if (request.method === "GET" && first === "export" && second === "orders") {
    await requireAdminRequest(request);
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    const status = searchParams.get("status") || "";
    const csv = await exportOrdersCsv({ from, to, status });
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orders-export-${Date.now()}.csv"`,
      },
    });
  }

  if (request.method === "GET" && first === "export" && second === "products") {
    await requireAdminRequest(request);
    const { searchParams } = new URL(request.url);
    const csv = await exportProductsCsv({
      status: searchParams.get("status") || "",
      category: searchParams.get("category") || "",
    });
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="products-export-${Date.now()}.csv"`,
      },
    });
  }

  if (request.method === "GET" && first === "export" && second === "users") {
    await requireAdminRequest(request);
    const { searchParams } = new URL(request.url);
    const csv = await exportUsersCsv({ segment: searchParams.get("segment") || "" });
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="users-export-${Date.now()}.csv"`,
      },
    });
  }

  if (request.method === "GET" && first === "export" && second === "coupons") {
    await requireAdminRequest(request);
    const csv = await exportCouponsCsv();
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="coupons-export-${Date.now()}.csv"`,
      },
    });
  }

  if (request.method === "GET" && first === "low-stock") {
    await requireAdminRequest(request);
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 200);
    const products = await listLowStockProducts({ limit });
    return ok({
      success: true,
      error: false,
      products,
      count: products.length,
    });
  }

  if (request.method === "GET" && first === "import" && second === "products" && segments[2] === "sample") {
    await requireAdminRequest(request);
    const csv = buildSampleCsv();
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="products-import-sample.csv"`,
      },
    });
  }

  if (request.method === "POST" && first === "import" && second === "products") {
    const adminId = await requireAdminRequest(request);
    const body = await parseJson(request);
    const csvText = typeof body?.csv === "string" ? body.csv : "";
    const dryRun = body?.dryRun !== false;
    const result = await importProductsCsv(csvText, { dryRun });
    if (!dryRun) {
      await writeAuditLog({
        adminId,
        action: "IMPORT",
        entity: "product",
        detail: `CSV import: created ${result.created}, updated ${result.updated}, errors ${result.errors.length}`,
        ip: getIp(request),
      });
    }
    return ok(result);
  }

  if (request.method === "GET" && first === "search") {
    await requireAdminRequest(request);
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const limit = Math.min(20, Math.max(1, Number(searchParams.get("limit") || 6)));
    const results = await quickSearch(q, { limit });
    return ok({ success: true, error: false, query: q, ...results });
  }

  if (request.method === "GET" && first === "search-analytics") {
    await requireAdminRequest(request);
    const { searchParams } = new URL(request.url);
    const days = Number(searchParams.get("days") || 30);
    const limit = Number(searchParams.get("limit") || 50);
    const [top, zero] = await Promise.all([
      listTopSearches({ days, limit }),
      listZeroResultSearches({ days, limit }),
    ]);
    return ok({ success: true, error: false, top, zero, days });
  }

  if (request.method === "GET" && first === "orders" && second && third === "refunds") {
    await requireAdminRequest(request);
    return ok(await listRefundsForOrder(Number(second)));
  }

  if (request.method === "GET" && first === "orders" && !second) {
    await requireAdminRequest(request);
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || 1);
    const perPage = Number(searchParams.get("perPage") || 10);
    const status = searchParams.get("status") || "";
    return ok(await getAllOrdersAdmin({ page, perPage, status }));
  }

  if (request.method === "POST" && first === "orders" && second && third === "refund") {
    const adminId = await requireAdminRequest(request);
    const body = await parseJson(request);
    const refund = await requestRefund({
      orderId: Number(second),
      amount: body?.amount as number | null,
      reason: (body?.reason as string) || null,
      note: (body?.note as string) || null,
      requestedBy: "admin",
      requestedById: adminId,
      restockItems: Boolean(body?.restock),
    });
    await writeAuditLog({
      adminId,
      action: "REFUND",
      entity: "order",
      entityId: second,
      detail: `Refund ₹${refund?.amount} (${refund?.status})`,
      ip: getIp(request),
    });
    return ok(refund);
  }

  if (request.method === "POST" && first === "orders" && second === "bulk-status") {
    const adminId = await requireAdminRequest(request);
    const body = await parseJson(request);
    const result = await bulkSetOrderStatus({ ids: body?.ids as Array<number | string>, status: body?.status as string });
    await writeAuditLog({
      adminId,
      action: "UPDATE",
      entity: "order",
      detail: `Bulk status → ${result.status}: ${(body?.ids as Array<unknown> || []).join(", ")}`,
      ip: getIp(request),
    });
    return ok(result);
  }

  if (request.method === "POST" && first === "orders" && second && third === "cancel") {
    const adminId = await requireAdminRequest(request);
    const body = await parseJson(request);
    const reason = String(body?.reason || "").slice(0, 500);
    const cancelResult = await cancelOrder({
      orderId: Number(second),
      userId: adminId,
      reason,
      by: "admin",
    });
    let refund: unknown = null;
    if (cancelResult.requiresRefund && body?.refund !== false) {
      try {
        refund = await refundOnUserCancellation({
          orderId: cancelResult.id,
          requestedById: adminId,
          reason: reason || "Admin cancellation",
        });
      } catch (refundError) {
        console.error("[admin-cancel] refund failed:", refundError);
      }
    }
    await writeAuditLog({
      adminId,
      action: "CANCEL",
      entity: "order",
      entityId: second,
      detail: reason || "Cancelled by admin",
      ip: getIp(request),
    });
    return ok({ cancel: cancelResult, refund });
  }

  if (request.method === "GET" && first === "users" && !second) {
    await requireAdminRequest(request);
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || 1);
    const perPage = Number(searchParams.get("perPage") || 20);
    const search = searchParams.get("search") || "";
    const segment = searchParams.get("segment") || "";
    return ok(await getAllUsers({ page, perPage, search, segment }));
  }

  if (request.method === "PUT" && first === "users" && second && third === "status") {
    const adminId = await requireAdminRequest(request);
    const body = await parseJson(request);
    const result = await updateUserStatus(Number(second), body?.isActive === true);
    await writeAuditLog({ adminId, action: "UPDATE", entity: "user", entityId: second, detail: `Status set to ${body?.isActive ? "active" : "Suspended"}`, ip: getIp(request) });
    return ok(result);
  }

  if (request.method === "POST" && first === "users" && second === "bulk-status") {
    const adminId = await requireAdminRequest(request);
    const body = await parseJson(request);
    const result = await bulkSetUserStatus({ ids: body?.ids as Array<number | string>, isActive: body?.isActive === true, adminId });
    return ok(result);
  }

  if (request.method === "GET" && first === "users" && second && third === "stats") {
    await requireAdminRequest(request);
    return ok(await getSingleUserStats(Number(second)));
  }

  if (request.method === "GET" && first === "settings" && !second) {
    await requireAdminRequest(request);
    return ok(await getSettingsAdmin());
  }

  if (request.method === "GET" && first === "test-email" && !second) {
    await requireAdminRequest(request);
    const { searchParams } = new URL(request.url);
    return ok(await sendAdminTestEmail(searchParams.get("to") || ""));
  }

  if (request.method === "PUT" && first === "settings" && !second) {
    const adminId = await requireSuperAdminRequest(request);
    const body = await parseJson(request);
    const result = await saveSetting(body);
    await writeAuditLog({ adminId, action: "UPDATE", entity: "settings", detail: `Settings updated`, ip: getIp(request) });
    return ok(result);
  }

  if (request.method === "GET" && first === "homepage" && !second) {
    await requireAdminRequest(request);
    return ok(await getAllSectionsAdmin());
  }

  if (request.method === "POST" && first === "homepage" && second === "upload") {
    await requireAdminRequest(request);
    return ok(await uploadHomePageImage(request));
  }

  if (request.method === "POST" && first === "homepage" && !second) {
    await requireAdminRequest(request);
    return ok(await createHomePageItemRecord(await parseJson(request)), 201);
  }

  if (request.method === "PUT" && first === "homepage" && second && !third) {
    await requireAdminRequest(request);
    return ok(await updateHomePageItemRecord(Number(second), await parseJson(request)));
  }

  if (request.method === "DELETE" && first === "homepage" && second && !third) {
    await requireAdminRequest(request);
    return ok(await deleteHomePageItemRecord(Number(second)));
  }

  if (request.method === "GET" && first === "coupons" && !second) {
    await requireAdminRequest(request);
    return ok(await getAllCouponsAdmin());
  }

  if (request.method === "POST" && first === "coupons" && !second) {
    const adminId = await requireAdminRequest(request);
    const body = await parseJson(request);
    const result = await createCouponRecord(body);
    await writeAuditLog({ adminId, action: "CREATE", entity: "coupon", detail: `Coupon created: ${body?.code || ""}`, ip: getIp(request) });
    return ok(result, 201);
  }

  if (request.method === "PUT" && first === "coupons" && second && !third) {
    const adminId = await requireAdminRequest(request);
    const body = await parseJson(request);
    const result = await updateCouponRecord(Number(second), body);
    await writeAuditLog({ adminId, action: "UPDATE", entity: "coupon", entityId: second, detail: `Coupon updated`, ip: getIp(request) });
    return ok(result);
  }

  if (request.method === "DELETE" && first === "coupons" && second && !third) {
    const adminId = await requireAdminRequest(request);
    const result = await deleteCouponRecord(Number(second));
    await writeAuditLog({ adminId, action: "DELETE", entity: "coupon", entityId: second, ip: getIp(request) });
    return ok(result);
  }

  if (first === "attributes" && request.method === "GET" && !second) {
    await requireAdminRequest(request);
    return ok(await getAttributeTypes());
  }

  if (first === "attributes" && request.method === "POST" && !second) {
    await requireAdminRequest(request);
    return ok(await addAttributeType(await parseJson(request)), 201);
  }

  if (first === "attributes" && request.method === "PUT" && second && !third) {
    await requireAdminRequest(request);
    return ok(await editAttributeType(Number(second), await parseJson(request)));
  }

  if (first === "attributes" && request.method === "DELETE" && second && !third) {
    await requireAdminRequest(request);
    return ok(await removeAttributeType(Number(second)));
  }

  if (first === "attributes" && request.method === "GET" && second && third === "values") {
    await requireAdminRequest(request);
    return ok(await getAttributeValues(Number(second)));
  }

  if (first === "attributes" && request.method === "POST" && second && third === "values") {
    await requireAdminRequest(request);
    return ok(await addAttributeTypeValue(Number(second), await parseJson(request)), 201);
  }

  if (first === "attributes" && request.method === "DELETE" && second && third === "values") {
    const valueId = segments[3];
    await requireAdminRequest(request);
    return ok(await removeAttributeTypeValue(Number(valueId)));
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
