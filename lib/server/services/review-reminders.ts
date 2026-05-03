import {
  findOrdersDueForReviewReminder,
  markReviewReminderSent,
} from "../repositories/orders.js";
import { sendReviewReminderEmail } from "../email/review-reminder.js";
import { log } from "../logger.js";
import type { Id } from "../types.js";

export interface ReviewReminderResultEntry {
  orderId: Id;
  status: "sent" | "skipped_no_email" | "failed";
  error?: string;
}

export interface ReviewReminderRunResult {
  totalEligible: number;
  sent: number;
  failed: number;
  results: ReviewReminderResultEntry[];
}

/**
 * Find delivered orders past the cooldown window that haven't received a review
 * reminder yet, and email each customer once. Idempotent — once marked, an order
 * never re-fires.
 */
export async function sendPendingReviewReminders({
  daysAfter = 7,
  limit = 50,
}: { daysAfter?: number; limit?: number } = {}): Promise<ReviewReminderRunResult> {
  const eligible = await findOrdersDueForReviewReminder({ daysAfter, limit });

  let sent = 0;
  let failed = 0;
  const results: ReviewReminderResultEntry[] = [];

  for (const order of eligible) {
    try {
      const ok = await sendReviewReminderEmail(
        { id: order.id, items: order.items },
        { email: order.userEmail, name: order.userName }
      );
      if (ok) {
        await markReviewReminderSent(order.id);
        sent += 1;
        results.push({ orderId: order.id, status: "sent" });
      } else {
        results.push({ orderId: order.id, status: "skipped_no_email" });
      }
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      log.warn(
        { orderId: order.id, err: { message } },
        "review_reminder_send_failed"
      );
      results.push({ orderId: order.id, status: "failed", error: message });
    }
  }

  log.info(
    { totalEligible: eligible.length, sent, failed, daysAfter },
    "review_reminder_run_complete"
  );

  return { totalEligible: eligible.length, sent, failed, results };
}
