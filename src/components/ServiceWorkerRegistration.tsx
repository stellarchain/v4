'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (process.env.NODE_ENV !== 'production' || isLocalhost) {
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Ignore registration failures to avoid runtime noise.
    });
  }, []);

  return null;
}
