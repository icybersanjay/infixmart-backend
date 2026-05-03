import { sendEmail } from "./send-email.js";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://infixmart.com";

function inr(value) {
  return `Rs.${Number(value || 0).toLocaleString("en-IN")}`;
}

function buildBackInStockHtml(item) {
  const link = item.productSlug
    ? `${SITE_URL}/product/${item.productSlug}`
    : `${SITE_URL}/product/${item.productId}`;

  return `<!DOCTYPE html>
  <html>
    <body style="margin:0;padding:24px;background:#f4f6f9;font-family:Arial,sans-serif;color:#333;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden;">
          <tr><td style="background:#00A651;color:#fff;padding:18px 24px;font-size:20px;font-weight:700;">It's back in stock! 🎉</td></tr>
          <tr><td style="padding:24px;">
            <p style="margin:0 0 12px;">Hi <strong>${item.userName || "there"}</strong>,</p>
            <p style="margin:0 0 18px;">Good news — an item from your wishlist is available again:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8eaed;border-radius:6px;overflow:hidden;margin-bottom:18px;">
              <tr>
                ${item.image ? `<td style="width:120px;padding:14px;"><img src="${item.image}" alt="" width="100" style="display:block;width:100px;border-radius:4px;"/></td>` : ""}
                <td style="padding:14px;">
                  <div style="font-size:15px;font-weight:600;margin-bottom:4px;">${item.productTitle || "Your wishlisted product"}</div>
                  ${item.price ? `<div style="font-size:14px;color:#1565C0;font-weight:600;">${inr(item.price)}</div>` : ""}
                </td>
              </tr>
            </table>
            <p style="margin:0 0 18px;text-align:center;">
              <a href="${link}" style="display:inline-block;padding:12px 24px;background:#1565C0;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">
                Shop now →
              </a>
            </p>
            <p style="margin:18px 0 0;font-size:12px;color:#888;">Stock can move quickly, so don't wait too long.</p>
          </td></tr>
          <tr><td style="background:#fafbfc;padding:14px 24px;font-size:12px;color:#999;text-align:center;">
            &copy; ${new Date().getFullYear()} InfixMart &middot; <a href="mailto:support@infixmart.com" style="color:#aaa;">support@infixmart.com</a>
          </td></tr>
        </table>
      </td></tr></table>
    </body>
  </html>`;
}

async function sendBackInStockEmail(item) {
  if (!item?.userEmail) return false;
  await sendEmail({
    to: item.userEmail,
    subject: `${item.productTitle || "An item you wishlisted"} is back in stock — InfixMart`,
    text: `Hi ${item.userName || "there"}, great news — ${item.productTitle || "an item from your wishlist"} is back in stock at InfixMart. Shop now: ${SITE_URL}/product/${item.productSlug || item.productId}`,
    html: buildBackInStockHtml(item),
  });
  return true;
}

export { sendBackInStockEmail };
