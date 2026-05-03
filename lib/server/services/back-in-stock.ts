import {
  findWishlistItemsBackInStock,
  markWishlistBackInStockNotified,
} from "../repositories/wishlist.js";
import { sendBackInStockEmail } from "../email/back-in-stock.js";
import { log } from "../logger.js";
import type { Id } from "../types.js";

export interface BackInStockResultEntry {
  wishlistId: Id;
  status: "sent" | "skipped_no_email" | "failed";
  error?: string;
}

export interface BackInStockRunResult {
  totalEligible: number;
  sent: number;
  failed: number;
  results: BackInStockResultEntry[];
}

/**
 * Email wishlist owners when a previously-wishlisted product is back in stock.
 * Each (user, product) pair is notified at most once per wishlist row — once
 * `backInStockNotifiedAt` is stamped, the cron skips it forever (until the user
 * removes + re-adds the item, which creates a new MyLists row).
 */
export async function sendBackInStockNotifications({
  limit = 100,
}: { limit?: number } = {}): Promise<BackInStockRunResult> {
  const eligible = await findWishlistItemsBackInStock({ limit });

  let sent = 0;
  let failed = 0;
  const results: BackInStockResultEntry[] = [];

  for (const item of eligible) {
    try {
      const ok = await sendBackInStockEmail(item);
      if (ok) {
        await markWishlistBackInStockNotified(item.wishlistId);
        sent += 1;
        results.push({ wishlistId: item.wishlistId, status: "sent" });
      } else {
        results.push({ wishlistId: item.wishlistId, status: "skipped_no_email" });
      }
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      log.warn(
        { wishlistId: item.wishlistId, productId: item.productId, err: { message } },
        "back_in_stock_send_failed"
      );
      results.push({
        wishlistId: item.wishlistId,
        status: "failed",
        error: message,
      });
    }
  }

  log.info(
    { totalEligible: eligible.length, sent, failed },
    "back_in_stock_run_complete"
  );

  return { totalEligible: eligible.length, sent, failed, results };
}
