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
import type { InvestigationFilters, InvestigationErrors, InvestigationMode } from '@/lib/shared/investigationTypes';

const FOCUS_QUERY_AFTER_CLEAR_KEY = 'stellarchain-investigator-focus-after-clear';

function normalizeDirection(value: string | null): PaymentFlowDirection {
  return value === 'outgoing' || value === 'incoming' ? value : 'both';
}

function emptyFilters(): InvestigationFilters {
  return { ledgerFrom: '', ledgerTo: '', dateFrom: '', dateTo: '', operationType: '', depth: '1', asset: '', minAssetAmount: '' };
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

type InvestigationTargetType = 'address' | 'transaction' | 'invalid';

type InvestigationApiError = {
  response?: {
    status?: number;
    data?: {
      error?: {
        type?: string;
      };
    };
  };
};

function targetType(query: string): InvestigationTargetType {
  if (/^[a-f0-9]{64}$/i.test(query)) return 'transaction';
  if (StrKey.isValidEd25519PublicKey(query.toUpperCase())) return 'address';
  return 'invalid';
}

function requestErrorMessage(error: unknown): string {
  const apiError = error as InvestigationApiError;
  const status = Number(apiError.response?.status);
  const errorType = apiError.response?.data?.error?.type;

  if (status === 503 && errorType === 'statistics_unavailable') {
    return 'Payment-flow statistics are temporarily unavailable. Retry later.';
  }
  if (status === 400 && errorType === 'invalid_cursor') {
    return 'This page cursor is no longer valid. Return to the latest page and retry.';
  }

  return 'Unable to read this page. Retry, or return to the latest page if the cursor is no longer valid.';
}

function validUtcDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizeMode(params: URLSearchParams, query: string, direction: PaymentFlowDirection): InvestigationMode {
  if (targetType(query) === 'transaction') return 'advanced';
  if (params.get('mode') === 'advanced') return 'advanced';
  if (params.get('mode') === 'basic') return 'basic';
  if (direction !== 'both') return 'advanced';
  const advancedKeys: Array<keyof InvestigationFilters> = [
    'ledgerFrom', 'ledgerTo', 'dateFrom', 'dateTo', 'operationType', 'asset', 'minAssetAmount',
  ];
  if (advancedKeys.some((key) => Boolean(params.get(key))) || params.get('depth') === '2') return 'advanced';
  return 'basic';
}

function validate(query: string, filters: InvestigationFilters, mode: InvestigationMode): InvestigationErrors {
  const errors: InvestigationErrors = {};
  if (mode === 'basic' && targetType(query) !== 'address') {
    errors.query = 'Enter a valid Stellar G-address.';
    return errors;
  }
  if (!query || targetType(query) === 'invalid') {
    errors.query = 'Enter a valid Stellar G-address or transaction hash.';
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
  if (filters.depth !== '1' && filters.depth !== '2') {
    errors.depth = 'Use one or two hops.';
  } else if (filters.depth === '2') {
    if (targetType(query) !== 'address') {
      errors.depth = 'Two-hop tracing currently requires an account address.';
    } else if (!(filters.ledgerFrom && filters.ledgerTo) && !(filters.dateFrom && filters.dateTo)) {
      errors.depth = 'Two-hop tracing requires both ledger bounds or both UTC date bounds.';
    }
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
  const committedParams = new URLSearchParams(urlParams);
  const activeMode = normalizeMode(committedParams, activeQuery, activeDirection);
  const [mode, setMode] = useState<InvestigationMode>(activeMode);
  const [query, setQuery] = useState(activeQuery);
  const [direction, setDirection] = useState<PaymentFlowDirection>(activeDirection);
  const [filters, setFilters] = useState<InvestigationFilters>(emptyFilters());
  const [fieldErrors, setFieldErrors] = useState<InvestigationErrors>({});
  const [investigation, setInvestigation] = useState<PaymentFlowInvestigationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const request = useRef<AbortController | null>(null);

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
    const nextFilters = activeMode === 'basic'
      ? emptyFilters()
      : { ledgerFrom: committed.get('ledgerFrom') ?? '', ledgerTo: committed.get('ledgerTo') ?? '', dateFrom: committed.get('dateFrom') ?? '', dateTo: committed.get('dateTo') ?? '', operationType: committed.get('operationType') ?? '', depth: committed.get('depth') ?? '1', asset: committed.get('asset') ?? '', minAssetAmount: committed.get('minAssetAmount') ?? '' };
    const nextDirection = activeMode === 'basic' ? 'both' : activeDirection;
    setMode(activeMode);
    setQuery(activeQuery);
    setDirection(nextDirection);
    setFilters(nextFilters);
    setError(null);
    setFieldErrors({});
    setInvestigation(null);
    setIsLoading(false);
    if (!activeQuery) return () => controller.abort();

    const invalid = validate(activeQuery, nextFilters, activeMode);
    if (Object.keys(invalid).length) {
      setFieldErrors(invalid);
      return () => controller.abort();
    }
    setIsLoading(true);
    async function load() {
      try {
        const target = targetType(activeQuery);
        const data = await fetchPaymentFlowInvestigationData({
          network: selectedNetwork,
          address: target === 'address' ? activeQuery.toUpperCase() : undefined,
          txHash: target === 'transaction' ? activeQuery.toLowerCase() : undefined,
          direction: nextDirection, limit: 50,
          ledgerFrom: nextFilters.ledgerFrom || undefined, ledgerTo: nextFilters.ledgerTo || undefined,
          dateFrom: nextFilters.dateFrom || undefined, dateTo: nextFilters.dateTo || undefined,
          operationType: nextFilters.operationType || undefined, cursor: committed.get('cursor') || undefined,
          asset: nextFilters.asset || undefined,
          minAssetAmount: nextFilters.minAssetAmount || undefined,
          depth: Number(nextFilters.depth),
        }, { signal: controller.signal }) as PaymentFlowInvestigationResponse;
        if (!controller.signal.aborted) setInvestigation(data);
      } catch (requestError) {
        if (!controller.signal.aborted) setError(requestErrorMessage(requestError));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [activeQuery, activeDirection, activeMode, urlParams, revision, selectedNetwork]);

  function submitSearch() {
    if (isLoading) return;
    const normalized = query.trim();
    const submittedFilters = mode === 'basic' ? emptyFilters() : filters;
    const submittedDirection = mode === 'basic' ? 'both' : direction;
    const invalid = validate(normalized, submittedFilters, mode);
    setFieldErrors(invalid);
    const firstError = Object.keys(invalid)[0];
    if (firstError) {
      document.getElementById(`investigation-${firstError}`)?.focus();
      return;
    }
    const next = new URLSearchParams();
    next.set('mode', mode);
    next.set('direction', submittedDirection);
    for (const [key, value] of Object.entries(submittedFilters)) if (value.trim()) next.set(key, value.trim());
    const target = targetType(normalized);
    if (target === 'transaction') next.set('txHash', normalized.toLowerCase());
    const base = target === 'address' ? `/investigate/${normalized.toUpperCase()}` : '/investigate';
    const destination = `${base}?${next}`;
    if (destination === `${pathname}?${urlParams}`) setRevision((value) => value + 1);
    else router.push(destination, { scroll: false });
  }

  function changeMode(nextMode: InvestigationMode) {
    if (nextMode === mode) return;
    request.current?.abort();
    setMode(nextMode);
    setError(null);
    setFieldErrors({});

    const currentTarget = targetType(query.trim());
    if (nextMode === 'basic') {
      setDirection('both');
      setFilters(emptyFilters());
      if (currentTarget !== 'address') setQuery('');
    }

    const next = new URLSearchParams();
    next.set('mode', nextMode);
    next.set('direction', nextMode === 'basic' ? 'both' : direction);
    if (nextMode === 'advanced') {
      for (const [key, value] of Object.entries(filters)) if (value.trim()) next.set(key, value.trim());
    } else {
      next.set('depth', '1');
    }

    if (currentTarget === 'address') {
      router.push(`/investigate/${query.trim().toUpperCase()}?${next}`, { scroll: false });
      return;
    }
    if (nextMode === 'advanced' && currentTarget === 'transaction') {
      next.set('txHash', query.trim().toLowerCase());
    }
    router.push(`/investigate?${next}`, { scroll: false });
  }

  function clearSearch() {
    request.current?.abort();
    setQuery('');
    setDirection('both');
    setFilters(emptyFilters());
    setInvestigation(null);
    setIsLoading(false);
    setError(null);
    setFieldErrors({});
    const clearedParams = new URLSearchParams();
    clearedParams.set('mode', mode);
    if (pathname === '/investigate' && urlParams === clearedParams.toString()) {
      document.getElementById('investigation-query')?.focus();
      return;
    }
    try {
      window.sessionStorage.setItem(FOCUS_QUERY_AFTER_CLEAR_KEY, '1');
    } catch {
      // Navigation still clears the form when browser storage is unavailable.
    }
    router.push(`/investigate?${clearedParams}`, { scroll: false });
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
      ? `/investigate/${target.value}?mode=basic&direction=both&depth=1`
      : `/investigate?mode=advanced&direction=both&depth=1&txHash=${target.value}`;
    if (destination === `${pathname}?${urlParams}`) setRevision((value) => value + 1);
    else router.push(destination, { scroll: false });
  }

  const queueNetwork = investigation && isNetworkType(investigation.network) ? investigation.network : selectedNetwork;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-4 lg:p-4">
      <PaymentFlowInvestigationView
        mode={mode} query={query} direction={direction} filters={filters} fieldErrors={fieldErrors}
        targetType={targetType(query)}
        investigation={investigation} isLoading={isLoading} error={error}
        onModeChange={changeMode}
        onQueryChange={setQuery} onDirectionChange={setDirection} onFiltersChange={setFilters}
        onSubmit={submitSearch} onClear={clearSearch} onRetry={() => setRevision((value) => value + 1)}
        onPageChange={navigatePage} onExport={exportPage} isOlderPage={searchParams.has('cursor')}
      />
      <InvestigationCaseQueue network={queueNetwork} target={investigation?.query.address ?? investigation?.query.txHash ?? null} onOpen={openSavedTarget} />
    </div>
  );
}
