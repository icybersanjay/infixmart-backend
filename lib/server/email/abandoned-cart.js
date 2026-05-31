import { sendEmail } from "./send-email.js";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function buildAbandonedCartHtml(user, items, subtotal) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://infixmart.com";
  const itemRows = items.map((item) => {
    const images = (() => { try { return JSON.parse(item.images || "[]"); } catch { return []; } })();
    const rawImg = Array.isArray(images) ? images[0] : images;
    const img = rawImg && !rawImg.startsWith("emoji:")
      ? (rawImg.startsWith("http") ? rawImg : `${baseUrl}${rawImg}`)
      : null;
    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">
          ${img ? `<img src="${img}" width="48" height="48" style="object-fit:cover;border-radius:6px;margin-right:10px;vertical-align:middle;" alt="${item.name}"/>` : ""}
          <span style="font-size:13px;color:#333;">${item.name}</span>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:13px;color:#555;">x${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;font-weight:700;color:#1565C0;">${inr(Number(item.price) * item.quantity)}</td>
      </tr>`;
  }).join("");

  return `<!DOCTYPE html>
  <html>
    <body style="margin:0;padding:24px;background:#f4f6f9;font-family:Arial,sans-serif;color:#333;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr><td style="background:linear-gradient(135deg,#1A237E,#1565C0);padding:28px 24px;text-align:center;">
            <p style="margin:0;color:rgba(255,255,255,0.7);font-size:13px;">InfixMart</p>
            <h2 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:800;">You left something behind! 🛒</h2>
          </td></tr>

          <!-- Body -->
          <tr><td style="padding:28px 24px;">
            <p style="margin:0 0 16px;font-size:15px;">
              Hi <strong>${user.name || "there"}</strong>,
            </p>
            <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6;">
              You added some great items to your cart but didn't complete your order.
              Your cart is saved — come back and grab them before they sell out!
            </p>

            <!-- Cart items -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8eaed;border-radius:8px;overflow:hidden;margin-bottom:20px;">
              <thead>
                <tr style="background:#f0f5ff;">
                  <th style="padding:10px 12px;text-align:left;font-size:12px;color:#1565C0;text-transform:uppercase;letter-spacing:0.5px;">Product</th>
                  <th style="padding:10px 12px;text-align:center;font-size:12px;color:#1565C0;text-transform:uppercase;letter-spacing:0.5px;">Qty</th>
                  <th style="padding:10px 12px;text-align:right;font-size:12px;color:#1565C0;text-transform:uppercase;letter-spacing:0.5px;">Amount</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
              <tfoot>
                <tr style="background:#f8faff;">
                  <td colspan="2" style="padding:12px;font-weight:700;font-size:14px;">Cart Total</td>
                  <td style="padding:12px;text-align:right;font-weight:800;font-size:16px;color:#1565C0;">${inr(subtotal)}</td>
                </tr>
              </tfoot>
            </table>

            <!-- CTA -->
            <div style="text-align:center;margin:24px 0 16px;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://infixmart.com"}/cart"
                 style="display:inline-block;background:#1565C0;color:#fff;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">
                Complete My Order →
              </a>
            </div>

            <p style="margin:0;font-size:12px;color:#999;text-align:center;line-height:1.6;">
              Minimum order ₹999 &nbsp;·&nbsp; Secure checkout &nbsp;·&nbsp; COD available
            </p>
          </td></tr>

          <!-- Footer -->
          <tr><td style="background:#f4f6f9;padding:14px 24px;text-align:center;font-size:11px;color:#aaa;">
            &copy; ${new Date().getFullYear()} InfixMart. Need help? <a href="mailto:support@infixmart.com" style="color:#1565C0;">support@infixmart.com</a>
          </td></tr>
        </table>
      </td></tr></table>
    </body>
  </html>`;
}

async function sendAbandonedCartEmail(user, items, subtotal) {
  if (!user?.email) return;
  try {
    await sendEmail({
      to: user.email,
      subject: `Hey ${user.name?.split(" ")[0] || "there"}, your cart is waiting! 🛒`,
      text: `Hi ${user.name || "there"}, you left ₹${subtotal} worth of items in your cart. Come back and complete your order: ${process.env.NEXT_PUBLIC_SITE_URL || "https://infixmart.com"}/cart`,
      html: buildAbandonedCartHtml(user, items, subtotal),
    });
    return { success: true };
  } catch (err) {
    console.error("[abandoned-cart-email]", err);
    return { success: false, error: err.message };
  }
}

export { sendAbandonedCartEmail };
