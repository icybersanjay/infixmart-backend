// Sentry browser config. Only initialises when a DSN is configured.
// We use dynamic import so the heavy @sentry/nextjs SDK never loads in dev
// when SENTRY_DSN isn't set.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (dsn) {
  import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.05),
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      beforeSend(event) {
        if (process.env.NODE_ENV !== "production") return null;
        return event;
      },
    });
  }).catch(() => {});
}
