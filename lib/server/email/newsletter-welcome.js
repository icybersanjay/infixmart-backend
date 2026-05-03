import { sendEmail } from "./send-email.js";

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "InfixMart";
const SITE_URL =
  process.env.FRONTEND_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://infixmart.com";

function buildWelcomeHtml(email) {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:24px;background:#f4f6f9;font-family:Arial,sans-serif;color:#333;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden;">
      <tr><td style="background:#1565C0;color:#fff;padding:18px 24px;font-size:20px;font-weight:700;">Welcome to ${SITE_NAME}</td></tr>
      <tr><td style="padding:28px 24px;">
        <p style="margin:0 0 14px;font-size:15px;">Hey 👋</p>
        <p style="margin:0 0 14px;font-size:14px;line-height:1.6;">
          Thanks for joining the ${SITE_NAME} newsletter. You'll get early access to wholesale price drops,
          new arrivals, and members-only offers — straight to <strong>${email}</strong>.
        </p>
        <p style="margin:18px 0;">
          <a href="${SITE_URL}/productListing"
             style="display:inline-block;background:#1565C0;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px;">
            Start browsing
          </a>
        </p>
        <p style="margin:14px 0 0;font-size:12px;color:#888;">
          You can unsubscribe anytime by replying to any of our emails. We don't share your address.
        </p>
      </td></tr>
      <tr><td style="padding:14px 24px;background:#fafafa;font-size:11px;color:#888;text-align:center;">
        ${SITE_NAME} · India's wholesale marketplace
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

async function sendNewsletterWelcomeEmail(email) {
  if (!email) return;
  await sendEmail({
    to: email,
    subject: `Welcome to ${SITE_NAME}!`,
    html: buildWelcomeHtml(email),
  });
}

export { sendNewsletterWelcomeEmail };
