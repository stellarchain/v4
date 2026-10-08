'use client';

import { useEffect, useRef, useState } from 'react';
import Card from '@/components/ui/Card';
import InfoTooltip from '@/components/InfoTooltip';
import { loadSevioScript, registerSevioBanner, type SevioBannerConfig } from '@/lib/ads/sevio';
import { COOKIE_CONSENT_EVENT, readCookieConsent } from '@/lib/privacy/cookieConsent';

interface SevioBannerAdProps {
  config: SevioBannerConfig;
  placement: 'desktop' | 'mobile';
}

function SevioBannerSlot({ config, placement }: SevioBannerAdProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    loadSevioScript()
      .then(() => {
        if (active && slotRef.current?.isConnected) registerSevioBanner(config);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => { active = false; };
  }, [config]);

  if (failed) return null;

  return (
    <aside aria-label="Advertisement">
      <Card variant="bordered" className={`border-dashed bg-[var(--bg-secondary)] shadow-none ${placement === 'mobile' ? 'px-1 py-3' : 'p-3'}`}>
        <div className={`mb-2 flex items-center gap-1 ${placement === 'mobile' ? 'px-2' : ''}`}>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Advertisement</span>
          <InfoTooltip
            ariaLabel="About this advertisement"
            content="Sponsored content is separate from blockchain data and does not affect rankings, verification, or account trust assessments."
            direction="bottom"
            align="start"
          />
        </div>
        <div className="flex justify-center">
          <div ref={slotRef} className="sevioads shrink-0" data-zone={config.zone} style={{ width: config.width, minHeight: config.height }} />
        </div>
      </Card>
    </aside>
  );
}

export default function SevioBannerAd({ config, placement }: SevioBannerAdProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Desktop needs 32px gutters + 26px card padding/borders; mobile needs 24px + 10px.
    const query = placement === 'desktop'
      ? `(min-width: ${Math.max(768, config.width + 58)}px)`
      : `(min-width: ${config.width + 34}px) and (max-width: 767px)`;
    const media = window.matchMedia(query);

    function updateVisibility() {
      setVisible(media.matches && readCookieConsent() === 'accepted');
    }

    updateVisibility();
    media.addEventListener('change', updateVisibility);
    window.addEventListener(COOKIE_CONSENT_EVENT, updateVisibility);
    window.addEventListener('storage', updateVisibility);
    return () => {
      media.removeEventListener('change', updateVisibility);
      window.removeEventListener(COOKIE_CONSENT_EVENT, updateVisibility);
      window.removeEventListener('storage', updateVisibility);
    };
  }, [config.width, placement]);

  return visible ? <SevioBannerSlot config={config} placement={placement} /> : null;
}
