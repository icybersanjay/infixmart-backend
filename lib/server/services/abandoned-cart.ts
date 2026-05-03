import {
  listAbandonedCarts,
  getCartItemsForUser,
  upsertReminder,
  setReminderStatus,
  type ReminderChannel,
} from "../repositories/abandoned-cart.js";
import { findUserById } from "../repositories/users.js";
import { sendAbandonedCartEmail } from "../email/abandoned-cart.js";
import { sendAbandonedCartSms } from "../sms/fast2sms.js";
import { log } from "../logger.js";
import type { Id, SqlDateTime, User } from "../types.js";

interface SendResult {
  success: boolean;
  error?: string;
}

interface CartItemForReminder {
  productId: Id;
  name: string;
  price: number | string;
  quantity: number;
}

async function sendWhatsAppMessage(
  phone: string,
  user: Pick<User, "name">,
  items: CartItemForReminder[],
  subtotal: number
): Promise<SendResult> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    return { success: false, error: "WhatsApp API not configured. Set WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID." };
  }

  const raw = String(phone || "").replace(/\D/g, "");
  const to = raw.startsWith("91") ? raw : `91${raw}`;

  if (to.length < 11) {
    return { success: false, error: "Invalid phone number" };
  }

  const cartUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://infixmart.com"}/cart`;
  const firstName = (user.name || "there").split(" ")[0];
  const itemSummary = items.slice(0, 3).map((i) => `• ${i.name} (x${i.quantity})`).join("\n");
  const body = `Hi ${firstName}! 👋\n\nYou left ₹${Number(subtotal).toLocaleString("en-IN")} worth of items in your InfixMart cart:\n\n${itemSummary}${items.length > 3 ? `\n• ...and ${items.length - 3} more` : ""}\n\nComplete your order here 👉 ${cartUrl}`;

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body },
        }),
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.error?.message || "WhatsApp API error" };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface GetAbandonedCartsParams {
  page?: number;
  perPage?: number;
  minIdleMinutes?: number;
  dateFrom?: string | null;
  dateTo?: string | null;
  exportAll?: boolean;
}

export async function getAbandonedCarts({
  page = 1,
  perPage = 30,
  minIdleMinutes = 60,
  dateFrom = null,
  dateTo = null,
  exportAll = false,
}: GetAbandonedCartsParams = {}) {
  const { rows, total } = await listAbandonedCarts({ minIdleMinutes, page, perPage, dateFrom, dateTo, exportAll });
  return {
    carts: rows.map((r) => ({
      userId: r.userId,
      userName: r.userName,
      userEmail: r.userEmail,
      userPhone: r.userPhone,
      itemCount: Number(r.itemCount || 0),
      cartSubtotal: Number(r.cartSubtotal || 0),
      lastCartActivity: r.lastCartActivity,
      idleMinutes: Number(r.idleMinutes || 0),
      reminderId: r.reminderId,
      reminderStatus: r.reminderStatus || "none",
      lastEmailSentAt: r.lastEmailSentAt,
      lastWhatsappSentAt: r.lastWhatsappSentAt,
      lastSmsSentAt: r.lastSmsSentAt,
      emailCount: Number(r.emailCount || 0),
      whatsappCount: Number(r.whatsappCount || 0),
      smsCount: Number(r.smsCount || 0),
    })),
    total,
    page,
    perPage,
    pages: Math.ceil(total / perPage),
  };
}

export async function sendAbandonedCartReminder(
  userId: Id,
  channel: ReminderChannel
): Promise<SendResult> {
  const [user, items] = await Promise.all([
    findUserById(userId),
    getCartItemsForUser(userId),
  ]);

  if (!user) throw new Error("User not found");
  if (!items.length) throw new Error("Cart is empty");

  const cartItems = items as unknown as CartItemForReminder[];
  const subtotal = cartItems.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
  const cartSnapshot = cartItems.map((i) => ({ name: i.name, price: i.price, qty: i.quantity }));

  let result: SendResult | undefined;

  if (channel === "email") {
    result = await sendAbandonedCartEmail(user, items, subtotal);
  } else if (channel === "whatsapp") {
    if (!user.mobile) return { success: false, error: "User has no phone number on file" };
    result = await sendWhatsAppMessage(user.mobile, user, cartItems, subtotal);
  } else if (channel === "sms") {
    if (!user.mobile) return { success: false, error: "User has no phone number on file" };
    const firstName = (user.name || "").split(" ")[0] || "there";
    result = await sendAbandonedCartSms(user.mobile, {
      firstName,
      itemCount: cartItems.length,
      subtotal,
    });
  } else {
    throw new Error("Invalid channel. Use 'email', 'whatsapp', or 'sms'.");
  }

  if (result?.success) {
    await upsertReminder(userId, { cartSubtotal: subtotal, cartSnapshot, channel });
  }

  return result || { success: false };
}

export async function dismissAbandonedCart(userId: Id) {
  await setReminderStatus(userId, "dismissed");
  return { success: true as const };
}

const HOURS_TO_MS = 60 * 60 * 1000;

function hoursSince(iso: SqlDateTime | null | undefined): number {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso as string | Date).getTime()) / HOURS_TO_MS;
}

export interface RunAbandonedCartRemindersParams {
  minIdleMinutes?: number;
  smsAfterEmailHours?: number;
  limit?: number;
}

export interface RunAbandonedCartRemindersResult {
  totalEligible: number;
  sentEmail: number;
  sentSms: number;
  skipped: number;
  failed: number;
}

export async function runAbandonedCartReminders({
  minIdleMinutes = 60,
  smsAfterEmailHours = 24,
  limit = 100,
}: RunAbandonedCartRemindersParams = {}): Promise<RunAbandonedCartRemindersResult> {
  const { rows } = await listAbandonedCarts({
    minIdleMinutes,
    page: 1,
    perPage: limit,
    exportAll: false,
  });

  let sentEmail = 0;
  let sentSms = 0;
  let skipped = 0;
  let failed = 0;

  for (const r of rows) {
    const userId = r.userId;
    const hasEmail = !!r.userEmail;
    const hasPhone = !!r.userPhone;

    let channel: ReminderChannel | null = null;
    if (!r.lastEmailSentAt && hasEmail) {
      channel = "email";
    } else if (
      r.lastEmailSentAt &&
      !r.lastSmsSentAt &&
      hasPhone &&
      hoursSince(r.lastEmailSentAt) >= smsAfterEmailHours
    ) {
      channel = "sms";
    }

    if (!channel) {
      skipped += 1;
      continue;
    }

    try {
      const result = await sendAbandonedCartReminder(userId, channel);
      if (result?.success) {
        if (channel === "email") sentEmail += 1;
        else if (channel === "sms") sentSms += 1;
      } else {
        failed += 1;
        log.warn(
          { userId, channel, err: result?.error },
          "abandoned_cart_reminder_send_failed"
        );
      }
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      log.warn(
        { userId, channel, err: { message } },
        "abandoned_cart_reminder_send_threw"
      );
    }
  }

  log.info(
    { totalEligible: rows.length, sentEmail, sentSms, skipped, failed },
    "abandoned_cart_reminders_run_complete"
  );

  return {
    totalEligible: rows.length,
    sentEmail,
    sentSms,
    skipped,
    failed,
  };
}
