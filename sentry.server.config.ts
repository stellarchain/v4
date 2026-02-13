import * as Sentry from "@sentry/nextjs";
Sentry.init({
  dsn: "https://07422b261d2613de6ddb8dedec9e459d@monitoring.wifcloud.com/7",
  integrations: [Sentry.replayIntegration()],
  tracesSampleRate: 1,
  enableLogs: true,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  sendDefaultPii: true,
});