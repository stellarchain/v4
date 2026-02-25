import * as Sentry from "@sentry/nextjs";
Sentry.init({
  dsn: "REMOVED_SENTRY_DSN",
  tracesSampleRate: 1,
  enableLogs: true,
  sendDefaultPii: true,
});