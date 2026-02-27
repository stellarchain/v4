import * as Sentry from '@sentry/nextjs';

const isDevelopment = process.env.NODE_ENV === 'development';
const isBrowser = typeof window !== 'undefined';

const getFeedbackColorScheme = (): 'light' | 'dark' | 'system' => {
  if (!isBrowser) {
    return 'system';
  }

  const storedTheme = window.localStorage.getItem('stellarchain-theme');
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme;
  }

  const dataTheme = document.documentElement.getAttribute('data-theme');
  if (dataTheme === 'light' || dataTheme === 'dark') {
    return dataTheme;
  }

  return 'system';
};

if (!isDevelopment) {
  Sentry.init({
    dsn: 'REMOVED_SENTRY_DSN',
    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: true,
        maskAllInputs: false,
      }),
      Sentry.feedbackIntegration({
        colorScheme: getFeedbackColorScheme(),
        themeDark: {
          background: 'var(--bg-secondary)',
        },
        showBranding: false,
        triggerLabel: "",
        formTitle: "Feedback",
        submitButtonLabel: "Send feedback",
        messagePlaceholder: "Tell us what did you observe and what we can improve.",
      }),
    ],
    tracesSampleRate: 1,
    enableLogs: true,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: true,
  });
}

export const onRouterTransitionStart = (...args: Parameters<typeof Sentry.captureRouterTransitionStart>) => {
  if (isDevelopment) return;
  return Sentry.captureRouterTransitionStart(...args);
};
