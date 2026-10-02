'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { StrKey } from '@stellar/stellar-sdk';
import type { PaymentFlowDirection, PaymentFlowInvestigationResponse } from '@/lib/stellar';
import { fetchPaymentFlowInvestigationData } from '@/services/api';
import PaymentFlowInvestigationView from '@/components/scam-flow/PaymentFlowInvestigationView';
import InvestigationCaseQueue from '@/components/scam-flow/InvestigationCaseQueue';
import { isNetworkType } from '@/lib/network/config';
import { useNetwork } from '@/contexts/NetworkContext';
import { getDetailRouteValue } from '@/lib/shared/routeDetail';
import { investigationCsv, investigationJson, investigationReportHtml } from '@/lib/shared/investigationExport';
import type { InvestigationFilters, InvestigationErrors } from '@/lib/shared/investigationTypes';

const FOCUS_QUERY_AFTER_CLEAR_KEY = 'stellarchain-investigator-focus-after-clear';

function normalizeDirection(value: string | null): PaymentFlowDirection {
  return value === 'outgoing' || value === 'incoming' ? value : 'both';
}

function targetKey(query: string): 'txHash' | 'address' {
  return /^[a-f0-9]{64}$/i.test(query) ? 'txHash' : 'address';
}

function validAsset(value: string): boolean {
  if (value === 'native:XLM') return true;
  const parts = value.split(':');
  if (parts.length !== 3) return false;
  const [type, code, issuer] = parts;
  if (!StrKey.isValidEd25519PublicKey(issuer)) return false;
  if (type === 'credit_alphanum4') return /^[A-Za-z0-9]{1,4}$/.test(code);
  if (type === 'credit_alphanum12') return /^[A-Za-z0-9]{5,12}$/.test(code);
  return false;
}

function validUtcDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
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
  for (const key of ['dateFrom', 'dateTo'] as const) {
    if (filters[key] && !validUtcDate(filters[key])) errors[key] = 'Use a valid UTC date in YYYY-MM-DD format.';
  }
  if (!errors.dateFrom && !errors.dateTo && filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
    errors.dateTo = 'End date must be at least the start date.';
  }
  if (filters.asset && !validAsset(filters.asset.trim())) {
    errors.asset = 'Use native:XLM or credit_alphanum4/12:CODE:ISSUER.';
  }
  if (filters.minAssetAmount && (!filters.asset.trim() || !/^(?:[0-9]{1,20})(?:\.[0-9]{1,14})?$/.test(filters.minAssetAmount.trim())
    || !/[1-9]/.test(filters.minAssetAmount))) {
    errors.minAssetAmount = 'Choose an asset and enter a positive amount (up to 14 decimal places).';
  }
  return errors;
}

export default function InvestigateClient() {
  const router = useRouter();
  const { network: selectedNetwork } = useNetwork();
  const searchParams = useSearchParams();
  const params = useParams<{ account?: string }>();
  const pathname = usePathname();
  const urlParams = searchParams.toString();
  const pathAccount = getDetailRouteValue({ pathname, searchParams, queryKey: 'address', routeParam: params.account, aliases: ['/investigate'] });
  const activeQuery = (pathAccount || searchParams.get('q') || searchParams.get('address') || searchParams.get('txHash') || '').trim();
  const activeDirection = normalizeDirection(searchParams.get('direction'));
  const [query, setQuery] = useState(activeQuery);
  const [direction, setDirection] = useState<PaymentFlowDirection>(activeDirection);
  const [filters, setFilters] = useState<InvestigationFilters>({ ledgerFrom: '', ledgerTo: '', dateFrom: '', dateTo: '', operationType: '', asset: '', minAssetAmount: '' });
  const [fieldErrors, setFieldErrors] = useState<InvestigationErrors>({});
  const [investigation, setInvestigation] = useState<PaymentFlowInvestigationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const request = useRef<AbortController | null>(null);

  useEffect(() => { document.title = 'Investigator — StellarChain'; }, []);

  useEffect(() => {
    if (pathname !== '/investigate' || activeQuery) return;
    try {
      if (window.sessionStorage.getItem(FOCUS_QUERY_AFTER_CLEAR_KEY) !== '1') return;
      window.sessionStorage.removeItem(FOCUS_QUERY_AFTER_CLEAR_KEY);
    } catch {
      return;
    }
    document.getElementById('investigation-query')?.focus();
  }, [activeQuery, pathname, urlParams]);

  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    const committed = new URLSearchParams(urlParams);
    const nextFilters = { ledgerFrom: committed.get('ledgerFrom') ?? '', ledgerTo: committed.get('ledgerTo') ?? '', dateFrom: committed.get('dateFrom') ?? '', dateTo: committed.get('dateTo') ?? '', operationType: committed.get('operationType') ?? '', asset: committed.get('asset') ?? '', minAssetAmount: committed.get('minAssetAmount') ?? '' };
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
          network: selectedNetwork,
          [targetKey(activeQuery)]: activeQuery,
          direction: activeDirection, limit: 50,
          ledgerFrom: nextFilters.ledgerFrom || undefined, ledgerTo: nextFilters.ledgerTo || undefined,
          dateFrom: nextFilters.dateFrom || undefined, dateTo: nextFilters.dateTo || undefined,
          operationType: nextFilters.operationType || undefined, cursor: committed.get('cursor') || undefined,
          asset: nextFilters.asset || undefined,
          minAssetAmount: nextFilters.minAssetAmount || undefined,
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
  }, [activeQuery, activeDirection, urlParams, revision, selectedNetwork]);

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
    for (const [key, value] of Object.entries(filters)) if (value.trim()) next.set(key, value.trim());
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
    setFilters({ ledgerFrom: '', ledgerTo: '', dateFrom: '', dateTo: '', operationType: '', asset: '', minAssetAmount: '' });
    setInvestigation(null);
    setIsLoading(false);
    setError(null);
    setFieldErrors({});
    if (pathname === '/investigate' && !urlParams) {
      document.getElementById('investigation-query')?.focus();
      return;
    }
    try {
      window.sessionStorage.setItem(FOCUS_QUERY_AFTER_CLEAR_KEY, '1');
    } catch {
      // Navigation still clears the form when browser storage is unavailable.
    }
    router.push('/investigate', { scroll: false });
  }

  function navigatePage(cursor: string | null) {
    if (isLoading) return;
    const next = new URLSearchParams(urlParams);
    if (cursor) next.set('cursor', cursor);
    else next.delete('cursor');
    router.push(`${pathname}?${next}`, { scroll: false });
  }

  function exportPage(format: 'json' | 'csv' | 'html') {
    if (!investigation || isLoading) return;
    const content = format === 'json' ? investigationJson(investigation)
      : format === 'html' ? investigationReportHtml(investigation) : investigationCsv(investigation);
    const mimeType = format === 'json' ? 'application/json' : format === 'html' ? 'text/html;charset=utf-8' : 'text/csv;charset=utf-8';
    const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `stellarchain-investigation-page.${format}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function openSavedTarget(target: { type: 'address' | 'transaction'; value: string }) {
    const destination = target.type === 'address'
      ? `/investigate/${target.value}?direction=both`
      : `/investigate?direction=both&txHash=${target.value}`;
    if (destination === `${pathname}?${urlParams}`) setRevision((value) => value + 1);
    else router.push(destination, { scroll: false });
  }

  const queueNetwork = investigation && isNetworkType(investigation.network) ? investigation.network : selectedNetwork;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-4 lg:p-4">
      <PaymentFlowInvestigationView
        query={query} direction={direction} filters={filters} fieldErrors={fieldErrors}
        investigation={investigation} isLoading={isLoading} error={error}
        onQueryChange={setQuery} onDirectionChange={setDirection} onFiltersChange={setFilters}
        onSubmit={submitSearch} onClear={clearSearch} onRetry={() => setRevision((value) => value + 1)}
        onPageChange={navigatePage} onExport={exportPage} isOlderPage={searchParams.has('cursor')}
      />
      <InvestigationCaseQueue network={queueNetwork} target={investigation?.query.address ?? investigation?.query.txHash ?? null} onOpen={openSavedTarget} />
    </div>
  );
}
