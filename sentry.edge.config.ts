import * as Sentry from '@sentry/nextjs';

const sentryDsn = process.env.SENTRY_DSN;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    tracesSampleRate: 1,
    enableLogs: true,
    sendDefaultPii: true,
  });
}
