// Sentry server config. Only initialises when a DSN is configured.
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.05),
      beforeSend(event) {
        if (process.env.NODE_ENV !== "production") return null;
        return event;
      },
    });
  }).catch(() => {});
}
