import type { NextRequest } from "next/server";
import { fail, handleRouteError, ok } from "../../../../lib/server/api/http.js";
import { requireAccessUserId } from "../../../../lib/server/auth/session.js";
import { requireAdmin } from "../../../../lib/server/services/admin.js";
import {
  getAbandonedCarts,
  sendAbandonedCartReminder,
  dismissAbandonedCart,
} from "../../../../lib/server/services/abandoned-cart.js";
import type { Id } from "../../../../lib/server/types.js";
import type { ReminderChannel } from "../../../../lib/server/repositories/abandoned-cart.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params?: Promise<{ path?: string[] }> };

async function parseJson(request: NextRequest): Promise<Record<string, unknown>> {
  try { return await request.json(); } catch { return {}; }
}

async function requireAdminRequest(request: NextRequest): Promise<Id> {
  const userId = requireAccessUserId(request);
  await requireAdmin(userId);
  return userId;
}

async function dispatch(request: NextRequest, segments: string[]) {
  const [first] = segments;

  if (request.method === "GET" && first === "detail") {
    await requireAdminRequest(request);
    const { searchParams } = new URL(request.url);
    const userId = Number(searchParams.get("userId"));
    if (!userId) {
      return fail(400, "User ID is required");
    }
    const { getCartItems } = await import("../../../../lib/server/services/cart.js");
    const result = await getCartItems(userId);
    return ok(result);
  }

  if (request.method === "GET" && segments.length === 0) {
    await requireAdminRequest(request);
    const { searchParams } = new URL(request.url);
    const exportAll = searchParams.get("export") === "1";
    const data = await getAbandonedCarts({
      page:           Number(searchParams.get("page")     || 1),
      perPage:        Number(searchParams.get("perPage")  || 30),
      minIdleMinutes: Number(searchParams.get("minIdle")  || 60),
      dateFrom:       searchParams.get("dateFrom") || null,
      dateTo:         searchParams.get("dateTo")   || null,
      exportAll,
    });

    if (exportAll) {
      const rows = data.carts;
      const headers = ["Name", "Email", "Phone", "Items", "Cart Value (INR)", "Last Activity", "Idle (hours)", "Emails Sent", "WhatsApp Sent", "Last Email", "Last WhatsApp"];
      const csvRows = rows.map((r) => [
        r.userName || "",
        r.userEmail || "",
        r.userPhone || "",
        r.itemCount,
        r.cartSubtotal,
        r.lastCartActivity ? new Date(r.lastCartActivity as string | Date).toLocaleString("en-IN") : "",
        r.idleMinutes ? (r.idleMinutes / 60).toFixed(1) : "",
        r.emailCount,
        r.whatsappCount,
        r.lastEmailSentAt    ? new Date(r.lastEmailSentAt as string | Date).toLocaleString("en-IN")    : "",
        r.lastWhatsappSentAt ? new Date(r.lastWhatsappSentAt as string | Date).toLocaleString("en-IN") : "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));

      const csv = [headers.join(","), ...csvRows].join("\r\n");
      return new Response("﻿" + csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="abandoned-carts-${new Date().toISOString().slice(0,10)}.csv"`,
        },
      });
    }

    return ok(data);
  }

  if (request.method === "POST" && first === "remind") {
    await requireAdminRequest(request);
    const body = await parseJson(request);
    const result = await sendAbandonedCartReminder(Number(body.userId), body.channel as ReminderChannel);
    return ok(result);
  }

  if (request.method === "POST" && first === "dismiss") {
    await requireAdminRequest(request);
    const body = await parseJson(request);
    return ok(await dismissAbandonedCart(Number(body.userId)));
  }

  return null;
}

async function handle(request: NextRequest, context: RouteContext) {
  const params = context?.params ? await context.params : {};
  const segments = Array.isArray(params.path) ? params.path : [];
  try {
    const res = await dispatch(request, segments);
    if (res) return res;
    return fail(404, "Route not found");
  } catch (err) {
    return handleRouteError(err);
  }
}

export const GET    = handle;
export const POST   = handle;
export const PUT    = handle;
export const DELETE = handle;
export const OPTIONS = handle;
export const HEAD   = handle;
