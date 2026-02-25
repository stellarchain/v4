import * as Sentry from '@sentry/nextjs';

const isDevelopment = process.env.NODE_ENV === 'development';

if (!isDevelopment) {
  Sentry.init({
    dsn: 'REMOVED_SENTRY_DSN',
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
