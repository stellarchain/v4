'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';

const COOKIE_CONSENT_KEY = 'stellarchain-cookie-consent';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    setVisible(!savedConsent);
  }, []);

  const handleConsent = (value: 'accepted' | 'declined') => {
    localStorage.setItem(COOKIE_CONSENT_KEY, value);
    setVisible(false);
  };

  if (!visible) {
    return null;
  }

  return (
    <aside
      className='fixed left-3 bottom-24 md:left-4 md:bottom-4 z-[95] w-[min(320px,calc(100vw-1.5rem))] rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 shadow-lg'
      role='dialog'
      aria-live='polite'
      aria-label='Cookie consent'
    >
      <p className='text-xs leading-5 text-[var(--text-secondary)]'>
        We use cookies to improve your experience. Choose whether to allow optional cookies.
      </p>
      <div className='mt-3 flex items-center gap-2'>
        <Button
          type='button'
          variant='primary'
          className='h-8 px-3 py-0 text-xs'
          onClick={() => handleConsent('accepted')}
        >
          Accept
        </Button>
        <Button
          type='button'
          variant='secondary'
          className='h-8 px-3 py-0 text-xs'
          onClick={() => handleConsent('declined')}
        >
          Decline
        </Button>
      </div>
    </aside>
  );
}
