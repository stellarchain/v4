'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { StrKey } from '@stellar/stellar-sdk';
import type { PaymentFlowDirection, PaymentFlowInvestigationResponse } from '@/lib/stellar';
import { fetchPaymentFlowInvestigationData } from '@/services/api';
import PaymentFlowInvestigationView from '@/components/scam-flow/PaymentFlowInvestigationView';
import { getDetailRouteValue } from '@/lib/shared/routeDetail';
import { investigationCsv, investigationJson } from '@/lib/shared/investigationExport';
import type { InvestigationFilters, InvestigationErrors } from '@/lib/shared/investigationTypes';

function normalizeDirection(value: string | null): PaymentFlowDirection {
  return value === 'outgoing' || value === 'incoming' ? value : 'both';
}

function targetKey(query: string): 'txHash' | 'address' {
  return /^[a-f0-9]{64}$/i.test(query) ? 'txHash' : 'address';
}

function validate(query: string, filters: InvestigationFilters): InvestigationErrors {
  const errors: InvestigationErrors = {};
  if (!query || (targetKey(query) === 'address' && !StrKey.isValidEd25519PublicKey(query.toUpperCase()))) {
    errors.query = 'Enter a valid Stellar G-address or a 64-character transaction hash.';
  }
  for (const key of ['ledgerFrom', 'ledgerTo'] as const) {
    const value = filters[key];
    if (value && (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 2147483647)) {
      errors[key] = 'Use a positive ledger number up to 2147483647.';
    }
  }
  if (!errors.ledgerFrom && !errors.ledgerTo && filters.ledgerFrom && filters.ledgerTo
    && Number(filters.ledgerFrom) > Number(filters.ledgerTo)) {
    errors.ledgerTo = 'End ledger must be at least the start ledger.';
  }
  return errors;
}

export default function InvestigateClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ account?: string }>();
  const pathname = usePathname();
  const urlParams = searchParams.toString();
  const pathAccount = getDetailRouteValue({ pathname, searchParams, queryKey: 'address', routeParam: params.account, aliases: ['/investigate'] });
  const activeQuery = (pathAccount || searchParams.get('q') || searchParams.get('address') || searchParams.get('txHash') || '').trim();
  const activeDirection = normalizeDirection(searchParams.get('direction'));
  const [query, setQuery] = useState(activeQuery);
  const [direction, setDirection] = useState<PaymentFlowDirection>(activeDirection);
  const [filters, setFilters] = useState<InvestigationFilters>({ ledgerFrom: '', ledgerTo: '', operationType: '' });
  const [fieldErrors, setFieldErrors] = useState<InvestigationErrors>({});
  const [investigation, setInvestigation] = useState<PaymentFlowInvestigationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const request = useRef<AbortController | null>(null);

  useEffect(() => { document.title = 'Investigator — StellarChain'; }, []);

  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    const committed = new URLSearchParams(urlParams);
    const nextFilters = { ledgerFrom: committed.get('ledgerFrom') ?? '', ledgerTo: committed.get('ledgerTo') ?? '', operationType: committed.get('operationType') ?? '' };
    setQuery(activeQuery);
    setDirection(activeDirection);
    setFilters(nextFilters);
    setError(null);
    setFieldErrors({});
    setInvestigation(null);
    setIsLoading(false);
    if (!activeQuery) return () => controller.abort();

    const invalid = validate(activeQuery, nextFilters);
    if (Object.keys(invalid).length) {
      setFieldErrors(invalid);
      return () => controller.abort();
    }
    setIsLoading(true);
    async function load() {
      try {
        const data = await fetchPaymentFlowInvestigationData({
          [targetKey(activeQuery)]: activeQuery,
          direction: activeDirection, limit: 50,
          ledgerFrom: nextFilters.ledgerFrom || undefined, ledgerTo: nextFilters.ledgerTo || undefined,
          operationType: nextFilters.operationType || undefined, cursor: committed.get('cursor') || undefined,
        }, { signal: controller.signal }) as PaymentFlowInvestigationResponse;
        if (!controller.signal.aborted) setInvestigation(data);
      } catch {
        if (!controller.signal.aborted) setError('Unable to read this page. Retry, or return to the latest page if the cursor is no longer valid.');
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [activeQuery, activeDirection, urlParams, revision]);

  function submitSearch() {
    if (isLoading) return;
    const normalized = query.trim();
    const invalid = validate(normalized, filters);
    setFieldErrors(invalid);
    const firstError = Object.keys(invalid)[0];
    if (firstError) {
      document.getElementById(`investigation-${firstError}`)?.focus();
      return;
    }
    const next = new URLSearchParams();
    next.set('direction', direction);
    for (const [key, value] of Object.entries(filters)) if (value) next.set(key, value);
    const key = targetKey(normalized);
    if (key === 'txHash') next.set('txHash', normalized.toLowerCase());
    const base = key === 'address' ? `/investigate/${normalized.toUpperCase()}` : '/investigate';
    const destination = `${base}?${next}`;
    if (destination === `${pathname}?${urlParams}`) setRevision((value) => value + 1);
    else router.push(destination, { scroll: false });
  }

  function clearSearch() {
    request.current?.abort();
    setQuery('');
    setDirection('both');
    setFilters({ ledgerFrom: '', ledgerTo: '', operationType: '' });
    setInvestigation(null);
    setIsLoading(false);
    setError(null);
    setFieldErrors({});
    router.push('/investigate', { scroll: false });
    document.getElementById('investigation-query')?.focus();
  }

  function navigatePage(cursor: string | null) {
    if (isLoading) return;
    const next = new URLSearchParams(urlParams);
    if (cursor) next.set('cursor', cursor);
    else next.delete('cursor');
    router.push(`${pathname}?${next}`, { scroll: false });
  }

  function exportPage(format: 'json' | 'csv') {
    if (!investigation || isLoading) return;
    const content = format === 'json' ? investigationJson(investigation) : investigationCsv(investigation);
    const url = URL.createObjectURL(new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `stellarchain-investigation-page.${format}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="mx-auto max-w-[1400px] p-4 lg:p-4">
      <PaymentFlowInvestigationView
        query={query} direction={direction} filters={filters} fieldErrors={fieldErrors}
        investigation={investigation} isLoading={isLoading} error={error}
        onQueryChange={setQuery} onDirectionChange={setDirection} onFiltersChange={setFilters}
        onSubmit={submitSearch} onClear={clearSearch} onRetry={() => setRevision((value) => value + 1)}
        onPageChange={navigatePage} onExport={exportPage} isOlderPage={searchParams.has('cursor')}
      />
    </div>
  );
}
