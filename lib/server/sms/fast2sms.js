const API_KEY = process.env.FAST2SMS_API_KEY;
const BASE_URL = "https://www.fast2sms.com/dev/bulkV2";
const SITE_HOST = (process.env.NEXT_PUBLIC_SITE_URL || "https://infixmart.com").replace(/^https?:\/\//, "").replace(/\/$/, "");

async function sendSms(phone, message) {
  if (!API_KEY) return { success: false, error: "FAST2SMS_API_KEY not configured" };
  if (!phone) return { success: false, error: "Missing phone number" };

  const mobile = String(phone).replace(/\D/g, "").slice(-10);
  if (mobile.length !== 10) return { success: false, error: "Invalid phone number" };

  try {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        authorization: API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: "q",
        message,
        language: "english",
        numbers: mobile,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.return === false) {
      return { success: false, error: json?.message || `fast2sms error (HTTP ${res.status})`, raw: json };
    }
    return { success: true, raw: json };
  } catch (err) {
    return { success: false, error: err?.message || "fast2sms request failed" };
  }
}

export async function sendOrderPlacedSms(phone, orderId, total) {
  await sendSms(
    phone,
    `InfixMart: Your order #${orderId} for Rs.${total} has been placed successfully! We'll notify you when it ships. Track at infixmart.com/my-orders`
  );
}

export async function sendOrderShippedSms(phone, orderId, trackingNumber, courierName, trackingUrl) {
  const tracking = trackingNumber ? ` Tracking: ${trackingNumber} (${courierName || "courier"}).` : "";
  // Always link to the public /track page — it's short, brand-safe, and surfaces
  // the courier-site CTA. Falls back to the bare site URL when no orderId.
  const trackLink = orderId ? `${SITE_HOST}/track?orderId=${orderId}` : SITE_HOST;
  await sendSms(
    phone,
    `InfixMart: Order #${orderId} has been shipped!${tracking} Track: ${trackLink}`
  );
}

export async function sendOrderDeliveredSms(phone, orderId) {
  await sendSms(
    phone,
    `InfixMart: Order #${orderId} has been delivered! Hope you love it. Rate your experience at infixmart.com/my-orders`
  );
}

export async function sendAbandonedCartSms(phone, { firstName, itemCount, subtotal }) {
  const name = firstName || "there";
  const itemsLabel = itemCount > 1 ? `${itemCount} items` : `1 item`;
  const total = Math.round(Number(subtotal) || 0).toLocaleString("en-IN");
  return sendSms(
    phone,
    `Hi ${name}! You left ${itemsLabel} (Rs.${total}) in your InfixMart cart. Complete your order at ${SITE_HOST}/cart`
  );
}
