import { ADMIN_EMAIL, sendEmail } from "./send-email.js";

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "InfixMart";

function inr(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function buildLowStockHtml(product) {
  const remaining = Number(product.countInStock || 0);
  const threshold = Number(product.reorderThreshold ?? 5);
  const adminUrl =
    (process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL || "") +
    `/admin/products/${product.id}`;

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:24px;background:#f4f6f9;font-family:Arial,sans-serif;color:#333;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #ffe0b2;">
      <tr><td style="background:#E65100;color:#fff;padding:16px 24px;font-size:18px;font-weight:700;">⚠️ Low stock alert</td></tr>
      <tr><td style="padding:24px;">
        <p style="margin:0 0 12px;"><strong>${product.name}</strong> just dropped to <strong>${remaining}</strong> in stock (reorder threshold: ${threshold}).</p>
        <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:13px;color:#444;margin-top:12px;">
          <tr><td style="border-bottom:1px solid #f0f0f0;">SKU</td><td style="border-bottom:1px solid #f0f0f0;text-align:right;"><strong>${product.sku || "—"}</strong></td></tr>
          <tr><td style="border-bottom:1px solid #f0f0f0;">Brand</td><td style="border-bottom:1px solid #f0f0f0;text-align:right;">${product.brand || "—"}</td></tr>
          <tr><td style="border-bottom:1px solid #f0f0f0;">Category</td><td style="border-bottom:1px solid #f0f0f0;text-align:right;">${product.catName || "—"}</td></tr>
          <tr><td style="border-bottom:1px solid #f0f0f0;">Price</td><td style="border-bottom:1px solid #f0f0f0;text-align:right;">${inr(product.price)}</td></tr>
          <tr><td style="border-bottom:1px solid #f0f0f0;">Stock left</td><td style="border-bottom:1px solid #f0f0f0;text-align:right;color:#E53935;"><strong>${remaining}</strong></td></tr>
          <tr><td>Reorder threshold</td><td style="text-align:right;">${threshold}</td></tr>
        </table>
        ${adminUrl ? `<p style="margin:18px 0 0;"><a href="${adminUrl}" style="display:inline-block;background:#1565C0;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;font-size:13px;">Open in admin</a></p>` : ""}
      </td></tr>
      <tr><td style="padding:14px 24px;background:#fafafa;font-size:11px;color:#888;">
        ${SITE_NAME} · automated low-stock alert
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

/**
 * Email the admin when a product crosses below its reorder threshold.
 * Caller is responsible for only firing this at the right moment (i.e.
 * when a stock decrement actually pushed the count under threshold).
 */
async function sendLowStockAlertEmail(product) {
  if (!product || !product.id) return;
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `⚠️ Low stock: ${product.name} (${product.countInStock} left)`,
    html: buildLowStockHtml(product),
  });
}

export { sendLowStockAlertEmail };
