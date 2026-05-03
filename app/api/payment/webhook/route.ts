import crypto from "crypto";
import { type NextRequest, NextResponse } from "next/server";
import { findOrderByPaymentId, markOrderPaid } from "../../../../lib/server/repositories/orders.js";
import {
  recordWebhookEvent,
  markWebhookProcessed,
  markWebhookFailed,
} from "../../../../lib/server/repositories/webhook-events.js";
import {
  handleWebhookRefundFailed,
  handleWebhookRefundProcessed,
} from "../../../../lib/server/services/refunds.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROVIDER = "razorpay";

interface RazorpayEntity {
  id?: string;
  amount?: number | string;
  currency?: string;
  method?: string | null;
  created_at?: number | string;
  status?: string;
}

interface RazorpayWebhookEvent {
  event?: string;
  payload?: {
    payment?: { entity?: RazorpayEntity };
    refund?: { entity?: RazorpayEntity };
    order?: { entity?: RazorpayEntity };
  };
}

function verifySignature(rawBody: string, signature: string | null, secret: string | undefined): boolean {
  if (!signature || !secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = request.headers.get("x-razorpay-signature");
  const eventId =
    request.headers.get("x-razorpay-event-id") ||
    `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!secret) {
    console.error("[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "webhook secret not configured" },
      { status: 500 }
    );
  }

  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: RazorpayWebhookEvent;
  try {
    event = JSON.parse(rawBody || "{}");
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const eventType = event?.event || "unknown";
  const entityId = extractEntityId(event);

  const { inserted } = await recordWebhookEvent({
    provider: PROVIDER,
    eventId,
    type: eventType,
    entityId,
    payload: event,
  });

  if (!inserted) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  try {
    await dispatchEvent(event);
    await markWebhookProcessed(PROVIDER, eventId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[razorpay-webhook] handler error:", error);
    const message = error instanceof Error ? error.message : String(error);
    await markWebhookFailed(PROVIDER, eventId, message);
    return NextResponse.json(
      { ok: false, error: "handler failed" },
      { status: 500 }
    );
  }
}

function extractEntityId(event: RazorpayWebhookEvent): string | null {
  const refund = event?.payload?.refund?.entity;
  if (refund?.id) return refund.id;
  const payment = event?.payload?.payment?.entity;
  if (payment?.id) return payment.id;
  const order = event?.payload?.order?.entity;
  if (order?.id) return order.id;
  return null;
}

async function dispatchEvent(event: RazorpayWebhookEvent): Promise<void> {
  const type = event?.event;
  const payment = event?.payload?.payment?.entity;
  const refund = event?.payload?.refund?.entity;

  switch (type) {
    case "payment.captured":
      if (payment?.id) {
        const order = await findOrderByPaymentId(payment.id);
        if (order && !order.isPaid) {
          await markOrderPaid(order.id, {
            ...(order.paymentResult as Record<string, unknown>),
            id: payment.id,
            status: "captured",
            amount: Number(payment.amount || 0) / 100,
            currency: payment.currency,
            method: payment.method || null,
            capturedAt: payment.created_at
              ? new Date(Number(payment.created_at) * 1000).toISOString()
              : new Date().toISOString(),
          });
        }
      }
      return;
    case "payment.failed":
      return;
    case "refund.processed":
    case "refund.created":
      if (refund) await handleWebhookRefundProcessed(refund);
      return;
    case "refund.failed":
      if (refund) await handleWebhookRefundFailed(refund);
      return;
    default:
      return;
  }
}

export function GET() {
  return NextResponse.json({ ok: true, message: "Razorpay webhook endpoint" });
}
