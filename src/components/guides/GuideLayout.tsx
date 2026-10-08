'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SevioBannerAd from '@/components/ads/SevioBannerAd';
import { SEVIO_GUIDE_DESKTOP_BANNER, SEVIO_GUIDE_MOBILE_BANNER } from '@/lib/ads/sevio';

const GUIDE_LINKS = [
  { href: '/getting-started', label: 'Getting started' },
  { href: '/wallets', label: 'Wallet companion' },
  { href: '/learn', label: 'Learn' },
] as const;

export default function GuideLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 px-3 py-5 pb-24 md:px-4 md:py-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] md:text-3xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
      </header>

      <nav aria-label="Explorer guides" className="flex flex-wrap gap-2">
        {GUIDE_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${pathname === item.href ? 'border-[var(--info)] bg-[var(--info-muted)] text-[var(--info)]' : 'border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <article className="space-y-4">{children}</article>

      <SevioBannerAd key={`${pathname}-desktop`} config={SEVIO_GUIDE_DESKTOP_BANNER} placement="desktop" />
      <SevioBannerAd key={`${pathname}-mobile`} config={SEVIO_GUIDE_MOBILE_BANNER} placement="mobile" />
    </div>
  );
}
