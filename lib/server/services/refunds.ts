import { HttpError } from "../api/http.js";
import { getMysqlPool } from "../db/mysql.js";
import {
  createRefund,
  findRefundByRazorpayId,
  listRefundsByOrderId,
  updateRefund,
} from "../repositories/refunds.js";
import {
  findOrderById,
  markOrderRefunded,
} from "../repositories/orders.js";
import { getRazorpayClient } from "./payments.js";
import { restoreStockForOrder, roundMoney } from "./orders.js";
import type { Id, OrderItem } from "../types.js";

const REFUNDABLE_PAYMENT_METHODS = new Set(["Razorpay"]);

interface PaymentResultLike {
  id?: string;
  currency?: string;
}

function readPaymentResult(order: { paymentResult?: unknown } | null | undefined): PaymentResultLike {
  const raw = order?.paymentResult;
  if (!raw) return {};
  if (typeof raw === "object") return raw as PaymentResultLike;
  try {
    return JSON.parse(raw as string);
  } catch {
    return {};
  }
}

function clampAmount(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    throw new HttpError(400, "Refund amount must be a positive number.");
  }
  return roundMoney(num);
}

interface RequestRefundParams {
  orderId: Id;
  amount?: number | null;
  reason?: string | null;
  note?: string | null;
  requestedBy?: string;
  requestedById?: Id | null;
  restockItems?: boolean;
}

interface RazorpayErrorLike {
  error?: { description?: string };
  message?: string;
}

export async function requestRefund({
  orderId,
  amount,
  reason = null,
  note = null,
  requestedBy = "admin",
  requestedById = null,
  restockItems = false,
}: RequestRefundParams) {
  const order = await findOrderById(orderId);
  if (!order) {
    throw new HttpError(404, "Order not found");
  }

  if (!order.isPaid) {
    throw new HttpError(400, "Order is not paid. Use cancellation instead of refund.");
  }

  if (!REFUNDABLE_PAYMENT_METHODS.has(order.paymentMethod)) {
    throw new HttpError(
      400,
      `Refunds are not supported for payment method "${order.paymentMethod}". Refund the customer manually and update the order.`
    );
  }

  const paymentResult = readPaymentResult(order);
  const razorpayPaymentId = paymentResult.id;
  if (!razorpayPaymentId) {
    throw new HttpError(400, "Razorpay payment id is missing on this order.");
  }

  const refundedSoFar = (await listRefundsByOrderId(orderId))
    .filter((r) => r.status !== "failed")
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const requestedAmount = amount === undefined || amount === null
    ? Number(order.totalPrice || 0) - refundedSoFar
    : clampAmount(amount);

  if (requestedAmount <= 0) {
    throw new HttpError(400, "Refund amount must be greater than zero.");
  }

  if (refundedSoFar + requestedAmount > Number(order.totalPrice || 0) + 0.01) {
    throw new HttpError(
      400,
      `Refund total would exceed order total. Already refunded ₹${refundedSoFar}, max ₹${Number(order.totalPrice || 0) - refundedSoFar}.`
    );
  }

  const refundRow = await createRefund({
    orderId,
    userId: order.userId,
    amount: requestedAmount,
    currency: paymentResult.currency || "INR",
    razorpayPaymentId,
    status: "processing",
    reason,
    note,
    requestedBy,
    requestedById,
  });

  let razorpayRefund: { id?: string; status?: string } | undefined;
  try {
    const razorpay = getRazorpayClient();
    razorpayRefund = await razorpay.payments.refund(razorpayPaymentId, {
      amount: Math.round(requestedAmount * 100),
      speed: "normal",
      notes: {
        orderId: String(orderId),
        refundId: String(refundRow!.id),
        reason: reason || "",
      },
    });
  } catch (error) {
    const e = error as RazorpayErrorLike;
    await updateRefund(refundRow!.id, {
      status: "failed",
      failureReason: String(e?.error?.description || e?.message || error).slice(0, 2000),
      processedAt: new Date(),
    });
    throw new HttpError(502, "Razorpay refund request failed: " + String(e?.error?.description || e?.message || "unknown"));
  }

  const updated = await updateRefund(refundRow!.id, {
    razorpayRefundId: razorpayRefund?.id || null,
    status: razorpayRefund?.status === "processed" ? "completed" : "processing",
    processedAt: razorpayRefund?.status === "processed" ? new Date() : null,
  });

  if (updated && updated.status === "completed") {
    await afterRefundCompleted({
      order,
      refund: updated,
      restockItems,
    });
  }

  return updated;
}

async function afterRefundCompleted({
  order,
  refund,
  restockItems,
}: {
  order: { id: Id; totalPrice: number | string; items?: OrderItem[] | string };
  refund: { amount: number | string };
  restockItems: boolean;
}) {
  const conn = await getMysqlPool().getConnection();
  try {
    await conn.beginTransaction();

    const isFullRefund = Number(refund.amount) >= Number(order.totalPrice || 0) - 0.01;
    if (isFullRefund) {
      await markOrderRefunded(order.id, conn);
    }

    if (restockItems) {
      const items = Array.isArray(order.items) ? order.items : [];
      await restoreStockForOrder(items, conn);
    }

    await conn.commit();
  } catch (error) {
    try {
      await conn.rollback();
    } catch {}
    throw error;
  } finally {
    conn.release();
  }
}

interface RazorpayWebhookRefund {
  id?: string;
  notes?: { failure_reason?: string };
  error_description?: string;
}

export async function handleWebhookRefundProcessed(razorpayRefund: RazorpayWebhookRefund) {
  if (!razorpayRefund?.id) return;
  const refundRow = await findRefundByRazorpayId(razorpayRefund.id);
  if (!refundRow) return;
  if (refundRow.status === "completed") return;

  const updated = await updateRefund(refundRow.id, {
    status: "completed",
    processedAt: new Date(),
  });

  const order = await findOrderById(refundRow.orderId);
  if (order && updated) {
    await afterRefundCompleted({ order, refund: updated, restockItems: false });
  }
}

export async function handleWebhookRefundFailed(razorpayRefund: RazorpayWebhookRefund) {
  if (!razorpayRefund?.id) return;
  const refundRow = await findRefundByRazorpayId(razorpayRefund.id);
  if (!refundRow) return;
  if (refundRow.status === "failed") return;
  await updateRefund(refundRow.id, {
    status: "failed",
    failureReason: razorpayRefund?.notes?.failure_reason || razorpayRefund?.error_description || null,
    processedAt: new Date(),
  });
}

export async function refundOnUserCancellation({
  orderId,
  requestedById,
  reason,
}: {
  orderId: Id;
  requestedById: Id | null;
  reason?: string | null;
}) {
  const order = await findOrderById(orderId);
  if (!order || !order.isPaid) return null;
  if (!REFUNDABLE_PAYMENT_METHODS.has(order.paymentMethod)) return null;

  return requestRefund({
    orderId,
    amount: Number(order.totalPrice),
    reason: reason || "Customer cancellation",
    requestedBy: "user",
    requestedById: requestedById || null,
    restockItems: false,
  });
}

export async function listRefundsForOrder(orderId: Id) {
  return listRefundsByOrderId(orderId);
}
