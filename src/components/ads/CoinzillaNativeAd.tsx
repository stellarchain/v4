'use client';

import { useEffect, useState } from 'react';
import InfoTooltip from '@/components/InfoTooltip';
import Card from '@/components/ui/Card';
import { getCoinzillaConfig } from '@/lib/ads/coinzilla';
import { COOKIE_CONSENT_EVENT, readCookieConsent } from '@/lib/privacy/cookieConsent';
import type { CookieConsentValue } from '@/lib/privacy/cookieConsent';

const COINZILLA_NATIVE_SCRIPT_ID = 'coinzilla-native-script';
const COINZILLA_NATIVE_SCRIPT_URL = 'https://coinzillatag.com/lib/wdnative.js';
const COINZILLA_CONFIG = getCoinzillaConfig();

interface CoinzillaWidgetPreferences {
  zone: string;
  article: boolean;
  custom_class: string;
  breakpoint: number;
  mobile: boolean;
  image: boolean;
  description: boolean;
  website: boolean;
  sponsored: boolean;
  css_defaults: boolean;
}

declare global {
  interface Window {
    czilla_widget?: CoinzillaWidgetPreferences[];
  }
}

let coinzillaScriptPromise: Promise<void> | null = null;

function buildWidgetPreferences(zoneId: string): CoinzillaWidgetPreferences {
  return {
    zone: zoneId,
    article: true,
    custom_class: 'stellarchain-coinzilla-native',
    breakpoint: 640,
    mobile: true,
    image: true,
    description: true,
    website: true,
    sponsored: true,
    css_defaults: true,
  };
}

function loadCoinzillaNativeScript(): Promise<void> {
  if (coinzillaScriptPromise) {
    return coinzillaScriptPromise;
  }

  coinzillaScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(COINZILLA_NATIVE_SCRIPT_ID) as HTMLScriptElement | null;

    if (existingScript?.dataset.state === 'loaded') {
      resolve();
      return;
    }

    if (existingScript?.dataset.state === 'failed') {
      existingScript.remove();
    }

    const script = existingScript?.isConnected ? existingScript : document.createElement('script');

    function handleLoad() {
      script.dataset.state = 'loaded';
      resolve();
    }

    function handleError() {
      script.dataset.state = 'failed';
      coinzillaScriptPromise = null;
      reject(new Error('Coinzilla native script failed to load.'));
    }

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });

    if (!script.isConnected) {
      script.id = COINZILLA_NATIVE_SCRIPT_ID;
      script.src = COINZILLA_NATIVE_SCRIPT_URL;
      script.async = true;
      script.dataset.state = 'loading';
      document.head.appendChild(script);
    }
  });

  return coinzillaScriptPromise;
}

export default function CoinzillaNativeAd() {
  const config = COINZILLA_CONFIG;
  const [consent, setConsent] = useState<CookieConsentValue>(null);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');

  useEffect(() => {
    function updateConsent() {
      setConsent(readCookieConsent());
    }

    updateConsent();
    window.addEventListener(COOKIE_CONSENT_EVENT, updateConsent);
    window.addEventListener('storage', updateConsent);

    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, updateConsent);
      window.removeEventListener('storage', updateConsent);
    };
  }, []);

  useEffect(() => {
    if (config.preview || !config.enabled || !config.homeZoneId || consent !== 'accepted') {
      return;
    }

    let active = true;
    const preferences = buildWidgetPreferences(config.homeZoneId);
    window.czilla_widget = window.czilla_widget ?? [];

    if (!window.czilla_widget.some((item) => item.zone === preferences.zone)) {
      window.czilla_widget.push(preferences);
    }

    setLoadState('loading');
    loadCoinzillaNativeScript()
      .then(() => {
        if (active) {
          setLoadState('ready');
        }
      })
      .catch((error: unknown) => {
        console.warn('Coinzilla native placement is unavailable:', error);
        if (active) {
          setLoadState('failed');
        }
      });

    return () => {
      active = false;
    };
  }, [config, consent]);

  const canRenderLivePlacement = config.enabled && config.homeZoneId !== null && consent === 'accepted';

  if (!config.preview && (!canRenderLivePlacement || loadState === 'failed')) {
    return null;
  }

  return (
    <aside className="mx-auto w-full max-w-[1400px] px-4 py-5" aria-label="Advertisement">
      <Card
        variant="bordered"
        className="border-dashed bg-[var(--bg-secondary)] px-4 py-3 shadow-none"
      >
        <div className="mb-2 flex items-center gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Advertisement
          </span>
          <InfoTooltip
            ariaLabel="About this advertisement"
            content="Sponsored content is separate from blockchain data and does not affect rankings, verification, or account trust assessments."
            direction="bottom"
            align="start"
          />
        </div>

        {config.preview ? (
          <div className="flex min-h-24 items-center justify-center rounded-xl bg-[var(--bg-primary)] px-4 text-center">
            <div>
              <p className="text-sm font-semibold text-[var(--text-secondary)]">Coinzilla placement preview</p>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                A native ad will render here after the publisher zone is approved.
              </p>
            </div>
          </div>
        ) : (
          <div
            id={`c_widget_${config.homeZoneId}`}
            className="min-h-24"
            aria-busy={loadState === 'loading'}
          />
        )}
      </Card>
    </aside>
  );
}
