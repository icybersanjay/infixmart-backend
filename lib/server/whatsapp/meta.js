const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://infixmart.com";

async function sendWhatsApp(phone, body) {
  const token   = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId || !phone) return;

  const raw = String(phone).replace(/\D/g, "");
  const to  = raw.startsWith("91") ? raw : `91${raw}`;
  if (to.length < 11) return;

  try {
    await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } }),
    });
  } catch {
    // fire-and-forget
  }
}

export async function sendOrderPlacedWhatsApp(phone, name, orderId, total) {
  const first = (name || "there").split(" ")[0];
  await sendWhatsApp(
    phone,
    `Hi ${first}! 🎉 Your InfixMart order #${orderId} for ₹${Number(total).toLocaleString("en-IN")} has been placed. We'll notify you when it ships. Track: ${SITE_URL}/my-orders`
  );
}

export async function sendOrderShippedWhatsApp(phone, name, orderId, trackingNumber, courierName, trackingUrl) {
  const first = (name || "there").split(" ")[0];
  const tracking = trackingNumber ? ` Tracking: ${trackingNumber} via ${courierName || "courier"}.` : "";
  // Public, login-free order-status page on InfixMart.
  const orderTrack = `${SITE_URL}/track?orderId=${orderId}`;
  // Direct courier-site link when we have one. Both included since WhatsApp
  // has no length limit and customers may want the carrier's own UI.
  const courierLink = trackingUrl ? `\nCourier site: ${trackingUrl}` : "";
  await sendWhatsApp(
    phone,
    `Hi ${first}! 📦 Your InfixMart order #${orderId} has been shipped.${tracking}\nTrack: ${orderTrack}${courierLink}`
  );
}

export async function sendOrderDeliveredWhatsApp(phone, name, orderId) {
  const first = (name || "there").split(" ")[0];
  await sendWhatsApp(
    phone,
    `Hi ${first}! ✅ Your InfixMart order #${orderId} has been delivered. Enjoy your purchase! Rate it: ${SITE_URL}/my-orders`
  );
}
