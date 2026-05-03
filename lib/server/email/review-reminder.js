import { sendEmail } from "./send-email.js";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://infixmart.com";

function buildReviewReminderHtml(order, user) {
  const items = Array.isArray(order.items) ? order.items : [];
  const itemRows = items
    .map((item) => {
      // Each item links to the PDP with a #reviews anchor so the user lands
      // directly on the review form.
      const slug = item.slug || item.productSlug;
      const id = item.productId || item.id;
      const link = slug
        ? `${SITE_URL}/product/${slug}#reviews`
        : `${SITE_URL}/product/${id}#reviews`;
      return `
        <tr>
          <td style="padding:14px 12px;border-bottom:1px solid #f0f0f0;">
            <strong>${item.name || "Product"}</strong>
          </td>
          <td style="padding:14px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">
            <a href="${link}" style="display:inline-block;padding:8px 14px;background:#1565C0;color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">
              ⭐ Rate this
            </a>
          </td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
  <html>
    <body style="margin:0;padding:24px;background:#f4f6f9;font-family:Arial,sans-serif;color:#333;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden;">
          <tr><td style="background:#1565C0;color:#fff;padding:18px 24px;font-size:20px;font-weight:700;">How was your order?</td></tr>
          <tr><td style="padding:24px;">
            <p style="margin:0 0 12px;">Hi <strong>${user?.name || "Customer"}</strong>,</p>
            <p style="margin:0 0 18px;">Your order #${order.id} arrived a few days ago. We'd love to hear how it went! A quick rating helps other shoppers and takes less than a minute.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8eaed;border-collapse:collapse;border-radius:6px;overflow:hidden;">
              <tbody>${itemRows || `<tr><td style="padding:14px;text-align:center;color:#888;">No items found</td></tr>`}</tbody>
            </table>
            <p style="margin:18px 0 0;font-size:13px;color:#666;">If something wasn't right, <a href="mailto:support@infixmart.com" style="color:#1565C0;">contact support</a> and we'll make it right.</p>
          </td></tr>
          <tr><td style="background:#fafbfc;padding:14px 24px;font-size:12px;color:#999;text-align:center;">
            &copy; ${new Date().getFullYear()} InfixMart &middot; <a href="mailto:support@infixmart.com" style="color:#aaa;">support@infixmart.com</a>
          </td></tr>
        </table>
      </td></tr></table>
    </body>
  </html>`;
}

async function sendReviewReminderEmail(order, user) {
  if (!user?.email) return false;
  const items = Array.isArray(order.items) ? order.items : [];
  const itemNames = items.map((i) => i.name).filter(Boolean).join(", ");
  await sendEmail({
    to: user.email,
    subject: `How was your order #${order.id}? Rate your purchase — InfixMart`,
    text: `Hi ${user.name || "Customer"}, your order #${order.id} arrived a few days ago. We'd love a quick rating on what you bought (${itemNames || "your products"}). Visit ${SITE_URL}/my-orders to leave a review.`,
    html: buildReviewReminderHtml(order, user),
  });
  return true;
}

export { sendReviewReminderEmail };
