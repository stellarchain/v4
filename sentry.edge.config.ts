import * as Sentry from "@sentry/nextjs";
Sentry.init({
  dsn: "https://07422b261d2613de6ddb8dedec9e459d@monitoring.wifcloud.com/7",
  tracesSampleRate: 1,
  enableLogs: true,
  sendDefaultPii: true,
});