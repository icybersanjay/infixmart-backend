import type { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { execute } from "../../../../lib/server/db/mysql.js";
import { ok, fail, handleRouteError } from "../../../../lib/server/api/http.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  try {
    const expected = "sha256=" + createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
      
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    
    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    return timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("x-dpdpashield-signature");
    if (!signature) {
      return fail(401, "Missing signature");
    }

    const secret = process.env.DPDPA_WEBHOOK_SECRET;
    if (!secret) {
      console.error("[DPDPA Webhook] Missing DPDPA_WEBHOOK_SECRET in environment");
      return fail(500, "Webhook secret not configured");
    }

    const rawBody = await request.text();
    const isValid = verifySignature(rawBody, signature, secret);
    if (!isValid) {
      console.warn("[DPDPA Webhook] Invalid signature detected");
      return fail(401, "Invalid signature");
    }

    const event = JSON.parse(rawBody);
    console.log(`[DPDPA Webhook] Received event type: ${event.type}`);

    switch (event.type) {
      case "consent.withdrawn": {
        const email = String(event.data?.dataPrincipalEmail || "").trim().toLowerCase();
        const isFull = event.data?.isFullWithdrawal !== false;

        if (email && isFull) {
          console.log(`[DPDPA Webhook] Deleting newsletter subscriber: ${email}`);
          await execute(
            `DELETE FROM NewsletterSubscribers WHERE email = :email`,
            { email }
          );
        }
        break;
      }
      case "webhook.test":
        console.log("[DPDPA Webhook] Test event processed successfully");
        break;
      default:
        console.log(`[DPDPA Webhook] Event type "${event.type}" ignored`);
    }

    return ok({ message: "Webhook processed successfully" });
  } catch (error) {
    return handleRouteError(error, request);
  }
}
