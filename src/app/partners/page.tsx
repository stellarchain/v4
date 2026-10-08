'use client';

import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';

export default function PartnersPage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 px-4 py-5 pb-24 md:py-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] md:text-3xl">Partners</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          Explore the advertising integrations used by StellarChain and where they appear in the explorer.
        </p>
      </header>

      <ul aria-label="Integrated partners">
        <li>
          <Card variant="bordered" className="p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">Advertising provider</p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">Sevio Ad Manager</h2>
              </div>
              <Badge variant="info" className="px-3 py-1 text-xs">Integrated</Badge>
            </div>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              Sevio Ad Manager delivers banner advertising on StellarChain. Advertising helps support
              ongoing explorer maintenance while remaining separate from blockchain data.
            </p>

            <dl className="mt-5 grid gap-4 border-t border-[var(--border-subtle)] pt-5 md:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold text-[var(--text-secondary)]">Where it appears</dt>
                <dd className="mt-1 text-sm leading-6 text-[var(--text-primary)]">
                  Homepage, asset detail pages and explorer guides, on desktop and mobile.
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-[var(--text-secondary)]">Your cookie choice</dt>
                <dd className="mt-1 text-sm leading-6 text-[var(--text-primary)]">
                  Ads load only after you accept optional cookies. Ad availability varies by device and campaign.
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <a
                href="https://sevio.com/admanager/"
                target="_blank"
                rel="sponsored noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] active:bg-[var(--bg-hover)]"
              >
                Visit Sevio
                <span className="sr-only"> (opens in a new tab)</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 3h7m0 0v7m0-7L10 14M10 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-5" />
                </svg>
              </a>
              <Link href="/" className="inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
                Homepage
              </Link>
              <Link href="/assets" className="inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
                Browse assets
              </Link>
            </div>
          </Card>
        </li>
      </ul>

      <section aria-labelledby="partner-disclosure" className="max-w-3xl">
        <h2 id="partner-disclosure" className="text-base font-semibold text-[var(--text-primary)]">Advertising disclosure</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Paid placements are labeled Advertisement. Advertising does not affect explorer rankings,
          verification, account trust assessments, or the blockchain data shown on StellarChain.
          An integrated provider is not an endorsement of the products advertised.
        </p>
      </section>
    </div>
  );
}
