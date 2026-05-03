// Lazy-loaded Sentry breadcrumb helper.
//
// We don't want every component to statically import @sentry/nextjs (it's
// ~150KB), and we don't want breadcrumb calls to throw when no DSN is set.
// This module loads the SDK once on first call, only if a DSN is configured,
// and silently no-ops otherwise. Errors loading Sentry are swallowed — a
// breadcrumb failing should never break the user flow it's instrumenting.

let sentryPromise = null;

function shouldLoadSentry() {
  return Boolean(
    process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN
  );
}

function getSentry() {
  if (!shouldLoadSentry()) return null;
  if (!sentryPromise) {
    sentryPromise = import("@sentry/nextjs").catch(() => null);
  }
  return sentryPromise;
}

/**
 * Add a breadcrumb to the current Sentry scope. No-op when Sentry is not configured.
 *
 * Usage: breadcrumb("checkout", "razorpay_open", { amount: 1000, orderId: "..." })
 *
 * @param {string} category - Logical group, e.g. "cart", "checkout", "payment"
 * @param {string} message  - Short event name, snake_case preferred
 * @param {object} [data]   - Optional structured payload (kept small; PII-free)
 * @param {"info"|"warning"|"error"} [level="info"]
 */
export async function breadcrumb(category, message, data = undefined, level = "info") {
  try {
    const Sentry = await getSentry();
    if (!Sentry) return;
    Sentry.addBreadcrumb({
      category,
      message,
      level,
      data,
      timestamp: Date.now() / 1000,
    });
  } catch {
    // Never let observability code break the UI flow.
  }
}
