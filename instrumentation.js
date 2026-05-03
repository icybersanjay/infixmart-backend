// Next.js 15 instrumentation hook — registers Sentry per runtime.
// Important: we ONLY load the Sentry SDK when a DSN is configured. Importing
// `@sentry/nextjs` at boot is expensive even when init() is skipped, so an
// unconfigured Sentry would otherwise add seconds to every dev-server start.
export async function register() {
  if (!process.env.SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config.js");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config.js");
  }
}

export async function onRequestError(err, request, context) {
  if (!process.env.SENTRY_DSN) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureRequestError?.(err, request, context);
  } catch {
    // Sentry import failed — fall back silently rather than throwing.
  }
}
