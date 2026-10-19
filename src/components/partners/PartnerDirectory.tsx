'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { loadPartnerCatalog, partnerClickEndpoint } from '@/lib/partners/api';
import {
  partnerTrackingAllowed,
  recordPartnerClick,
} from '@/lib/partners/tracking';
import {
  PARTNER_CATEGORIES,
  RELATIONSHIP_LABELS,
  type PartnerCategory,
  type PartnerEntry,
} from '@/lib/partners/types';
import {
  COOKIE_CONSENT_EVENT,
  readCookieConsent,
  openCookiePreferences,
} from '@/lib/privacy/cookieConsent';

const linkClass =
  'inline-flex min-h-11 cursor-pointer items-center rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--bg-hover)] active:bg-[var(--bg-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-blue)]';

export default function PartnerDirectory({
  category,
}: {
  category?: PartnerCategory;
}) {
  const [entries, setEntries] = useState<PartnerEntry[] | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    loadPartnerCatalog(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setEntries(data.entries);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError('The directory could not be loaded. Please retry.');
      });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    function updatePreference() {
      const privacy = navigator as Navigator & {
        globalPrivacyControl?: boolean;
      };
      setTracking(
        partnerTrackingAllowed(
          readCookieConsent(),
          navigator.doNotTrack,
          privacy.globalPrivacyControl,
        ),
      );
    }
    updatePreference();
    window.addEventListener(COOKIE_CONSENT_EVENT, updatePreference);
    window.addEventListener('storage', updatePreference);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, updatePreference);
      window.removeEventListener('storage', updatePreference);
    };
  }, []);

  const visible = entries?.filter(
    (entry) => !category || entry.category === category,
  );
  const title = category
    ? PARTNER_CATEGORIES[category]
    : 'Partners & ecosystem services';

  function retry() {
    setError('');
    setAttempt((value) => value + 1);
  }

  function track(entry: PartnerEntry) {
    const privacy = navigator as Navigator & { globalPrivacyControl?: boolean };
    const allowed = partnerTrackingAllowed(
      readCookieConsent(),
      navigator.doNotTrack,
      privacy.globalPrivacyControl,
    );
    recordPartnerClick(
      partnerClickEndpoint(),
      entry.id,
      category ? 'category' : 'directory',
      allowed,
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 px-4 py-5 pb-24 md:py-6">
      <header>
        {category && (
          <Link
            href="/partners"
            className="text-sm text-[var(--text-secondary)] underline hover:text-[var(--text-primary)]"
          >
            All partners & services
          </Link>
        )}
        <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)] md:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
          Discover services in the Stellar ecosystem. Each listing states its
          relationship with StellarChain; inclusion does not imply a commercial
          partnership, verification or endorsement.
        </p>
      </header>
      <nav aria-label="Service categories" className="flex flex-wrap gap-2">
        <Link
          href="/partners"
          aria-current={!category ? 'page' : undefined}
          className={`${linkClass} border-[var(--border-default)] text-[var(--text-primary)]`}
        >
          All services
        </Link>
        {Object.entries(PARTNER_CATEGORIES).map(([key, label]) => (
          <Link
            key={key}
            href={`/partners/${key}`}
            aria-current={category === key ? 'page' : undefined}
            className={`${linkClass} border-[var(--border-default)] ${category === key ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="min-h-48" aria-busy={!entries && !error}>
        {error ? (
          <Card variant="bordered" className="p-5">
            <p role="alert" className="mb-3 text-sm text-[var(--text-primary)]">
              {error}
            </p>
            <Button onClick={retry} className="cursor-pointer">
              Retry
            </Button>
          </Card>
        ) : !visible ? (
          <p
            role="status"
            className="py-8 text-sm text-[var(--text-secondary)]"
          >
            Loading services…
          </p>
        ) : visible.length === 0 ? (
          <p
            role="status"
            className="py-8 text-sm text-[var(--text-secondary)]"
          >
            No services are currently listed in this category. Browse another
            category.
          </p>
        ) : (
          <ul
            aria-label={`${title} listings`}
            className="grid items-stretch gap-4 md:grid-cols-2"
          >
            {visible.map((entry) => (
              <li key={entry.id} className="min-w-0">
                <Card
                  variant="bordered"
                  className="flex h-full flex-col p-5 md:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-[var(--text-secondary)]">
                        {PARTNER_CATEGORIES[entry.category]}
                      </p>
                      <h2 className="mt-1 break-words text-xl font-semibold text-[var(--text-primary)]">
                        {entry.name}
                      </h2>
                    </div>
                    <Badge
                      variant={
                        entry.relationship === 'directory' ? 'neutral' : 'info'
                      }
                      className="px-3 py-1 text-xs"
                    >
                      {RELATIONSHIP_LABELS[entry.relationship]}
                    </Badge>
                  </div>
                  <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-[var(--text-secondary)]">
                    {entry.description}
                  </p>
                  {entry.relationship === 'affiliate' && (
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      StellarChain may earn a commission through this affiliate
                      link.
                    </p>
                  )}
                  {entry.relationship === 'sponsored' && (
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      This is a paid listing.
                    </p>
                  )}
                  <dl className="my-5 space-y-3 border-t border-[var(--border-subtle)] pt-4 text-sm">
                    <div>
                      <dt className="font-semibold text-[var(--text-primary)]">
                        Availability & region
                      </dt>
                      <dd className="mt-1 whitespace-pre-line break-words leading-6 text-[var(--text-secondary)]">
                        {entry.regionNotes}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[var(--text-primary)]">
                        Network notes
                      </dt>
                      <dd className="mt-1 whitespace-pre-line break-words leading-6 text-[var(--text-secondary)]">
                        {entry.networkNotes}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-auto">
                    <a
                      href={
                        tracking && entry.trackingUrl
                          ? entry.trackingUrl
                          : entry.websiteUrl
                      }
                      target="_blank"
                      rel={`${entry.relationship !== 'directory' ? 'sponsored ' : ''}noopener noreferrer`}
                      referrerPolicy="no-referrer"
                      onClick={() => track(entry)}
                      onAuxClick={(event) => {
                        if (event.button === 1) track(entry);
                      }}
                      className={`${linkClass} border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]`}
                    >
                      Visit {entry.name}
                      <span aria-hidden="true" className="ml-2">
                        ↗
                      </span>
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
      <section
        aria-labelledby="partner-disclosure"
        className="max-w-3xl space-y-2 text-sm leading-6 text-[var(--text-secondary)]"
      >
        <h2
          id="partner-disclosure"
          className="text-base font-semibold text-[var(--text-primary)]"
        >
          Disclosure & privacy
        </h2>
        <p>
          Paid listings and affiliate links are labeled. Advertising and
          commercial relationships do not affect explorer rankings,
          verification, account trust assessments or blockchain data.
        </p>
        <p>
          Optional click counting records only the UTC day, service, directory
          placement and total activations after you accept optional cookies. It
          respects Do Not Track and Global Privacy Control. Direct service links
          remain available when counting is disabled.
        </p>
        <p>
          Sevio advertisements use the same optional-cookie choice. Sevio
          provides its own campaign reporting; these directory totals measure
          outbound listing activations only.
        </p>
        <Button
          type="button"
          onClick={openCookiePreferences}
          className="min-h-11 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)]"
        >
          Cookie preferences
        </Button>
      </section>
    </div>
  );
}
