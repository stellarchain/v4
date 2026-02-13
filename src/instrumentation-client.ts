import * as Sentry from '@sentry/nextjs';

const isDevelopment = process.env.NODE_ENV === 'development';

if (!isDevelopment) {
  Sentry.init({
    dsn: 'https://07422b261d2613de6ddb8dedec9e459d@monitoring.wifcloud.com/7',
    integrations: [Sentry.replayIntegration()],
    tracesSampleRate: 1,
    enableLogs: true,
    replaysSessionSampleRate: 1.0,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: true,
  });
}

export const onRouterTransitionStart = (...args: Parameters<typeof Sentry.captureRouterTransitionStart>) => {
  if (isDevelopment) return;
  return Sentry.captureRouterTransitionStart(...args);
};
