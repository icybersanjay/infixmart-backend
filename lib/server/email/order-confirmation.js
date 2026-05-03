import { sendEmail, ADMIN_EMAIL } from "./send-email.js";

function inr(value) {
  return `Rs.${Number(value || 0).toLocaleString("en-IN")}`;
}

function buildOrderEmailHtml(order, user) {
  const items = Array.isArray(order.items) ? order.items : [];
  const address = order.shippingAddress || {};
  const itemRows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">${item.name || "Product"}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${item.qty || 1}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${inr(
            Number(item.price || 0) * Number(item.qty || 1)
          )}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
  <html>
    <body style="margin:0;padding:24px;background:#f4f6f9;font-family:Arial,sans-serif;color:#333;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden;">
          <tr><td style="background:#1565C0;color:#fff;padding:18px 24px;font-size:20px;font-weight:700;">InfixMart Order Confirmation</td></tr>
          <tr><td style="padding:24px;">
            <p style="margin:0 0 12px;">Hi <strong>${user?.name || "Customer"}</strong>,</p>
            <p style="margin:0 0 18px;">Your order #${order.id} has been placed successfully.</p>
            <p style="margin:0 0 18px;"><strong>Total:</strong> ${inr(order.totalPrice)}</p>
            <p style="margin:0 0 18px;"><strong>Payment:</strong> ${order.paymentMethod || "COD"}</p>
            <p style="margin:0 0 18px;"><strong>Shipping Address:</strong> ${
              [address.name, address.address, address.city, address.state, address.postalCode]
                .filter(Boolean)
                .join(", ") || "Not available"
            }</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8eaed;border-collapse:collapse;">
              <thead>
                <tr style="background:#f0f5ff;color:#1565C0;">
                  <th style="padding:10px 12px;text-align:left;">Item</th>
                  <th style="padding:10px 12px;text-align:center;">Qty</th>
                  <th style="padding:10px 12px;text-align:right;">Amount</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>
          </td></tr>
        </table>
      </td></tr></table>
    </body>
  </html>`;
}

async function sendOrderConfirmationEmail(order, user) {
  if (!user?.email) return;
  try {
    await sendEmail({
      to: user.email,
      subject: `Order Confirmed! #${order.id} - InfixMart`,
      text: `Hi ${user.name || "Customer"}, your order #${order.id} has been confirmed. Total: ${inr(order.totalPrice)}.`,
      html: buildOrderEmailHtml(order, user),
    });
  } catch (error) {
    console.error("[order-email]", error);
  }
}

const STATUS_EMAIL_CONFIG = {
  processing: {
    subject: (id) => `Order #${id} is being prepared — InfixMart`,
    headline: "We're preparing your order",
    message: "Great news! Your order is now being processed and will be handed over to our shipping partner soon.",
    badgeColor: "#1565C0",
    badgeLabel: "Processing",
  },
  shipped: {
    subject: (id) => `Your order #${id} has been shipped! 🚚 — InfixMart`,
    headline: "Your order is on its way!",
    message: "Your order has been handed over to the courier and is on its way to you. It should arrive within the estimated delivery window.",
    badgeColor: "#F59E0B",
    badgeLabel: "Shipped",
  },
  delivered: {
    subject: (id) => `Order #${id} delivered — InfixMart`,
    headline: "Your order has been delivered",
    message: "We hope you love your purchase! If you have any issues with your order, please contact our support team.",
    badgeColor: "#00A651",
    badgeLabel: "Delivered",
  },
  cancelled: {
    subject: (id) => `Order #${id} has been cancelled — InfixMart`,
    headline: "Your order has been cancelled",
    message: "Your order has been cancelled. If you did not request this, or if you have any questions, please contact our support team immediately.",
    badgeColor: "#E53935",
    badgeLabel: "Cancelled",
  },
};

function buildStatusUpdateEmailHtml(order, user, config, opts = {}) {
  const address = order.shippingAddress || {};
  const line1 = [address.flatHouse, address.areaStreet].filter(Boolean).join(", ") || address.address;
  const cityLine = [address.townCity || address.city, address.state].filter(Boolean).join(", ");
  const pincode = address.pincode || address.postalCode;
  const shippingLine = [address.name, line1, cityLine, pincode]
    .filter(Boolean)
    .join(", ") || "Not available";

  const trackingUrl = opts.trackingUrl || null;
  const courierName = order.courierName || null;
  const trackingNumber = order.trackingNumber || null;

  // Tracking block — only when we have meaningful info to show.
  const trackingBlock = (trackingNumber || courierName || trackingUrl)
    ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbe6;border:1px solid #ffe58f;border-radius:8px;padding:16px;margin-bottom:18px;">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#555;"><strong>Courier:</strong></td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;">${courierName || "—"}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#555;"><strong>Tracking #:</strong></td>
          <td style="padding:6px 0;font-size:13px;font-family:monospace;letter-spacing:.5px;">${trackingNumber || "—"}</td>
        </tr>
        ${trackingUrl ? `
        <tr>
          <td colspan="2" style="padding:12px 0 0;text-align:center;">
            <a href="${trackingUrl}" target="_blank" rel="noopener" style="display:inline-block;background:#1565C0;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:700;font-size:13px;">
              📦 Track on courier site →
            </a>
          </td>
        </tr>` : ""}
      </table>`
    : "";

  return `<!DOCTYPE html>
  <html>
    <body style="margin:0;padding:24px;background:#f4f6f9;font-family:Arial,sans-serif;color:#333;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden;">
          <tr><td style="background:#1565C0;color:#fff;padding:18px 24px;font-size:20px;font-weight:700;">InfixMart</td></tr>
          <tr><td style="padding:24px;">
            <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#1A237E;">${config.headline}</p>
            <p style="margin:0 0 16px;">Hi <strong>${user?.name || "Customer"}</strong>,</p>
            <p style="margin:0 0 18px;">${config.message}</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f5ff;border-radius:8px;padding:16px;margin-bottom:18px;">
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#555;"><strong>Order ID:</strong></td>
                <td style="padding:6px 0;font-size:13px;color:#1565C0;font-weight:700;">#${order.id}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#555;"><strong>Status:</strong></td>
                <td style="padding:6px 0;">
                  <span style="display:inline-block;background:${config.badgeColor};color:#fff;padding:3px 12px;border-radius:999px;font-size:12px;font-weight:700;">${config.badgeLabel}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#555;"><strong>Total:</strong></td>
                <td style="padding:6px 0;font-size:13px;font-weight:700;">${inr(order.totalPrice)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#555;"><strong>Deliver to:</strong></td>
                <td style="padding:6px 0;font-size:13px;">${shippingLine}</td>
              </tr>
            </table>

            ${trackingBlock}

            <p style="margin:0;font-size:12px;color:#999;">If you have any questions, email us at <a href="mailto:support@infixmart.com" style="color:#1565C0;">support@infixmart.com</a>. Thank you for shopping with InfixMart!</p>
          </td></tr>
          <tr><td style="background:#f4f6f9;padding:12px 24px;text-align:center;font-size:11px;color:#aaa;">
            &copy; ${new Date().getFullYear()} InfixMart &nbsp;&middot;&nbsp; <a href="mailto:support@infixmart.com" style="color:#aaa;">support@infixmart.com</a>
          </td></tr>
        </table>
      </td></tr></table>
    </body>
  </html>`;
}

async function sendOrderStatusEmail(order, user, status, opts = {}) {
  const config = STATUS_EMAIL_CONFIG[status];
  if (!config || !user?.email) return;
  try {
    const trackingLine = opts.trackingUrl
      ? ` Track it: ${opts.trackingUrl}`
      : "";
    await sendEmail({
      to: user.email,
      subject: config.subject(order.id),
      text: `Hi ${user?.name || "Customer"}, your order #${order.id} status has been updated to: ${config.badgeLabel}. Total: ${inr(order.totalPrice)}.${trackingLine}`,
      html: buildStatusUpdateEmailHtml(order, user, config, opts),
    });
  } catch (error) {
    console.error("[order-status-email]", error);
  }
}

async function sendNewOrderAdminEmail(order, user) {
  try {
    const address = order.shippingAddress || {};
    const shippingLine = [address.name, address.address, address.city, address.state, address.postalCode]
      .filter(Boolean).join(", ") || "N/A";
    const items = Array.isArray(order.items) ? order.items : [];
    const itemList = items.map((i) => `• ${i.name} x${i.qty || 1} — ${inr(Number(i.price || 0) * Number(i.qty || 1))}`).join("\n");
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `New Order #${order.id} — ${inr(order.totalPrice)} (${order.paymentMethod || "COD"})`,
      text: `New order placed!\n\nOrder #${order.id}\nCustomer: ${user?.name || "Guest"} <${user?.email || "N/A"}>\nTotal: ${inr(order.totalPrice)}\nPayment: ${order.paymentMethod || "COD"}\nShip to: ${shippingLine}\n\nItems:\n${itemList}`,
      html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:24px;background:#f4f6f9;color:#333;">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:600px;margin:auto;">
          <tr><td style="background:#1A237E;color:#fff;padding:18px 24px;font-size:18px;font-weight:700;">New Order Placed — #${order.id}</td></tr>
          <tr><td style="padding:24px;">
            <p style="margin:0 0 12px;"><strong>Customer:</strong> ${user?.name || "Guest"} &lt;${user?.email || "N/A"}&gt;</p>
            <p style="margin:0 0 12px;"><strong>Total:</strong> ${inr(order.totalPrice)}</p>
            <p style="margin:0 0 12px;"><strong>Payment:</strong> ${order.paymentMethod || "COD"}</p>
            <p style="margin:0 0 12px;"><strong>Ship to:</strong> ${shippingLine}</p>
            <p style="margin:12px 0 6px;"><strong>Items:</strong></p>
            <ul style="margin:0;padding-left:20px;">${items.map((i) => `<li>${i.name} x${i.qty || 1} — ${inr(Number(i.price || 0) * Number(i.qty || 1))}</li>`).join("")}</ul>
          </td></tr>
        </table>
      </body></html>`,
    });
  } catch (err) {
    console.error("[admin-order-email]", err);
  }
}

async function sendLowStockAdminEmail(products) {
  if (!products?.length) return;
  try {
    const rows = products.map((p) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${p.name}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;color:#E53935;font-weight:700;">${p.stock}</td></tr>`).join("");
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `Low Stock Alert — ${products.length} product(s) running low`,
      text: products.map((p) => `• ${p.name}: ${p.stock} left`).join("\n"),
      html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:24px;background:#f4f6f9;color:#333;">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:600px;margin:auto;">
          <tr><td style="background:#E53935;color:#fff;padding:18px 24px;font-size:18px;font-weight:700;">Low Stock Alert</td></tr>
          <tr><td style="padding:24px;">
            <p style="margin:0 0 16px;">The following products are running low on stock:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8eaed;border-collapse:collapse;">
              <thead><tr style="background:#fff5f5;"><th style="padding:8px 12px;text-align:left;color:#E53935;">Product</th><th style="padding:8px 12px;text-align:center;color:#E53935;">Stock Left</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <p style="margin:16px 0 0;font-size:13px;color:#555;">Please restock these items to avoid stockouts.</p>
          </td></tr>
        </table>
      </body></html>`,
    });
  } catch (err) {
    console.error("[low-stock-email]", err);
  }
}

export { sendOrderConfirmationEmail, sendOrderStatusEmail, sendNewOrderAdminEmail, sendLowStockAdminEmail };
