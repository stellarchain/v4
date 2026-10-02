'use client';

import { FormEvent, ReactNode, useRef, useState } from 'react';
import type { InvestigationFilters, InvestigationErrors, InvestigationMode } from '@/lib/shared/investigationTypes';
import {
  PaymentFlowDirection,
  PaymentFlowInvestigationResponse,
  PaymentFlowRiskSignal,
} from '@/lib/stellar';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import PaymentFlowEvidenceTable from '@/components/scam-flow/PaymentFlowEvidenceTable';
import PaymentFlowGroupsTable from '@/components/scam-flow/PaymentFlowGroupsTable';
import PaymentFlowAccountIdentity from '@/components/scam-flow/PaymentFlowAccountIdentity';
import PaymentFlowMap from '@/components/scam-flow/PaymentFlowMap';
import PaymentFlowTimeline from '@/components/scam-flow/PaymentFlowTimeline';
import { formatCompactAmount } from '@/lib/shared/formatCompactAmount';
import { formatExactAmount } from '@/lib/shared/formatExactAmount';
import InfoTooltip from '@/components/InfoTooltip';
import SegmentedControl from '@/components/ui/SegmentedControl';

interface PaymentFlowInvestigationViewProps {
  mode: InvestigationMode;
  query: string;
  targetType: 'address' | 'transaction' | 'invalid';
  direction: PaymentFlowDirection;
  investigation: PaymentFlowInvestigationResponse | null;
  isLoading: boolean;
  error: string | null;
  onQueryChange: (query: string) => void;
  onModeChange: (mode: InvestigationMode) => void;
  onDirectionChange: (direction: PaymentFlowDirection) => void;
  onSubmit: () => void;
  filters: InvestigationFilters;
  fieldErrors: InvestigationErrors;
  onFiltersChange: (filters: InvestigationFilters) => void;
  onClear: () => void;
  onRetry: () => void;
  onPageChange: (cursor: string | null) => void;
  onExport: (format: 'json' | 'csv' | 'html') => void;
  isOlderPage: boolean;
}

const DIRECTION_OPTIONS: Array<{ label: string; value: PaymentFlowDirection }> = [
  { label: 'Both', value: 'both' },
  { label: 'Incoming', value: 'incoming' },
  { label: 'Outgoing', value: 'outgoing' },
];

const MODE_OPTIONS: Array<{ label: string; value: InvestigationMode }> = [
  { label: 'Basic', value: 'basic' },
  { label: 'Advanced', value: 'advanced' },
];

function signalLabel(severity: PaymentFlowRiskSignal['severity']): string {
  return severity === 'info' ? 'Context' : 'Pattern';
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'No data';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown time' : date.toISOString().replace('T', ' ').replace('.000Z', ' UTC');
}

function shortenAccountAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

interface MetricSpec {
  label: string;
  basicLabel?: string;
  value: string;
  hint: string;
  tooltip: string;
  icon: ReactNode;
  accent?: 'success' | 'error';
  showInBasic?: boolean;
}

function metricSpecs(investigation: PaymentFlowInvestigationResponse): MetricSpec[] {
  const ico = (path: string) => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={path} />
    </svg>
  );
  const exactReceived = formatExactAmount(investigation.summary.nativeReceived);
  const exactSent = formatExactAmount(investigation.summary.nativeSent);
  const common: MetricSpec[] = [
    {
      label: 'Events',
      value: investigation.summary.events.toLocaleString(),
      hint: 'returned rows',
      tooltip: 'Indexed payment-flow operations returned in this result page.',
      icon: ico('M13 10V3L4 14h7v7l9-11h-7z'),
    },
    {
      label: 'Transactions',
      value: investigation.summary.transactions.toLocaleString(),
      hint: 'unique hashes',
      tooltip: 'Distinct transaction hashes represented by the events on this page.',
      icon: ico('M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4'),
    },
    {
      label: 'Counterparties',
      basicLabel: 'Connected accounts',
      value: investigation.summary.uniqueCounterparties.toLocaleString(),
      hint: 'distinct addresses',
      tooltip: 'Distinct addresses that sent to or received from this account in the displayed activity.',
      icon: ico('M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z'),
      showInBasic: true,
    },
    {
      label: 'Assets',
      basicLabel: 'Assets used',
      value: investigation.summary.uniqueAssets.toLocaleString(),
      hint: 'observed assets',
      tooltip: 'Distinct Stellar assets found in the displayed activity.',
      icon: ico('M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'),
      showInBasic: true,
    },
  ];
  return [
    ...common,
    {
      label: 'XLM received',
      value: formatCompactAmount(investigation.summary.nativeReceived),
      hint: 'native only',
      tooltip: `Native XLM received in the displayed activity. Exact amount: ${exactReceived} XLM.`,
      icon: ico('M19 14l-7 7m0 0l-7-7m7 7V3'),
      accent: 'success',
      showInBasic: true,
    },
    {
      label: 'XLM sent',
      value: formatCompactAmount(investigation.summary.nativeSent),
      hint: 'native only',
      tooltip: `Native XLM sent in the displayed activity. Exact amount: ${exactSent} XLM.`,
      icon: ico('M5 10l7-7m0 0l7 7m-7-7v18'),
      accent: 'error',
      showInBasic: true,
    },
  ];
}

export default function PaymentFlowInvestigationView({
  mode,
  query,
  targetType,
  direction,
  investigation,
  isLoading,
  error,
  onQueryChange,
  onModeChange,
  onDirectionChange,
  onSubmit,
  filters, fieldErrors, onFiltersChange, onClear, onRetry, onPageChange, onExport, isOlderPage,
}: PaymentFlowInvestigationViewProps) {
  const composing = useRef(false);
  const [flowView, setFlowView] = useState<'grouped' | 'events'>('grouped');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (composing.current) return;
    onSubmit();
  };
  const canSubmit = query.trim() !== '' && !isLoading;
  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      window.setTimeout(() => setCopiedAddress(null), 1800);
    } catch {
      setCopiedAddress(null);
    }
  };
  const focusAccount = investigation?.accountContext.focusAccount ?? null;
  const directorySignal = investigation?.accountContext.metadataUnavailable
    ? 'Directory unavailable'
    : focusAccount?.verified
      ? 'Verified directory identity'
      : focusAccount?.label
        ? 'Known directory label'
        : 'Unlisted account';
  const directoryStatusLabel = investigation?.accountContext.metadataUnavailable
    ? 'Directory unavailable'
    : focusAccount?.verified
      ? 'Identity verified'
      : focusAccount?.label
        ? 'Public label found'
        : 'Unverified';
  const directoryBadgeVariant = focusAccount?.verified
    ? 'success'
    : focusAccount?.label
      ? 'info'
      : investigation?.accountContext.metadataUnavailable
        ? 'warning'
        : 'neutral';

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--primary-blue)]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75l2.25 2.25L15 10.5m-3-7.5l7.5 3v5.25c0 4.7-3.2 8.9-7.5 10.05C7.7 20.15 4.5 15.95 4.5 11.25V6L12 3z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">Account Trust Checker</h1>
              <Badge variant="info">Evidence-based</Badge>
            </div>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {investigation
                ? investigation.coverage.rowsReturned > 0
                  ? mode === 'basic'
                    ? 'Account review ready'
                    : `Current page: ${formatDate(investigation.coverage.firstClosedAt)} – ${formatDate(investigation.coverage.lastClosedAt)}`
                  : 'No indexed payment-flow events match these filters.'
                : 'Review public identity context and indexed Stellar payment signals before you interact with an account.'}
            </p>
          </div>
        </div>
      </div>

      <Card className="p-4 shadow-sm">
        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 border-b border-[var(--border-default)] pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  {mode === 'basic' ? 'Check an account' : 'Advanced investigation'}
                </h2>
                <InfoTooltip
                  ariaLabel="About investigation modes"
                  content="Basic checks one account with safe defaults. Advanced adds transaction search, direction, bounded paths, dates, ledgers and asset filters."
                  align="start"
                />
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {mode === 'basic'
                  ? 'Review public directory context and indexed payment patterns before you interact with an account.'
                  : 'Build a precise, page-scoped query over the indexed payment-flow dataset.'}
              </p>
            </div>
            <SegmentedControl
              ariaLabel="Investigation mode"
              value={mode}
              options={MODE_OPTIONS}
              onChange={onModeChange}
            />
          </div>

          <label htmlFor="investigation-query" className="text-xs font-medium text-[var(--text-secondary)]">
            {mode === 'basic' ? 'Stellar account' : 'Account or transaction'}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--text-muted)]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
              </div>
              <input
                id="investigation-query"
                type="text"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={mode === 'basic' ? 'G-address' : 'G-address or transaction hash'}
                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)] py-3 pl-10 pr-4 font-mono text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--primary-blue)]"
                spellCheck={false}
                autoComplete="off"
                aria-invalid={Boolean(fieldErrors.query)}
                aria-describedby={fieldErrors.query ? 'investigation-query-error' : undefined}
                onCompositionStart={() => { composing.current = true; }}
                onCompositionEnd={() => { composing.current = false; }}
                onKeyDown={(event) => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); }}
              />
            </div>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-11 min-w-40 items-center justify-center gap-2 rounded-xl bg-[var(--primary-blue)] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-blue)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Investigating
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 12h15" />
                  </svg>
                  {mode === 'basic' ? 'Check account' : 'Investigate'}
                </>
              )}
            </button>
            {query && <Button type="button" onClick={onClear} className="text-sm focus-visible:outline-2 focus-visible:outline-offset-2">Clear</Button>}
          </div>
          {fieldErrors.query && <p id="investigation-query-error" role="alert" className="text-xs text-[var(--error)]">{fieldErrors.query}</p>}

          {mode === 'advanced' && <>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Direction</span>
            <div className="inline-flex rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-0.5">
              {DIRECTION_OPTIONS.map((option) => {
                const active = direction === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onDirectionChange(option.value)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-[var(--primary-blue)] text-white'
                        : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                    }`}
                    aria-pressed={active}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1 text-xs text-[var(--text-secondary)]" htmlFor="investigation-operationType">
              <span>Operation</span>
              <select id="investigation-operationType" value={filters.operationType}
                onChange={(event) => onFiltersChange({ ...filters, operationType: event.target.value })}
                className="block h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)]">
                <option value="">All payment-flow operations</option>
                <option value="payment">Payment</option>
                <option value="create_account">Create account</option>
                <option value="account_merge">Account merge</option>
                <option value="path_payment_strict_send">Path payment — strict send</option>
                <option value="path_payment_strict_receive">Path payment — strict receive</option>
              </select>
            </label>
            <div className="space-y-1 text-xs text-[var(--text-secondary)]">
              <div className="flex min-h-7 items-center gap-1">
                <label htmlFor="investigation-depth">Hop depth</label>
                <InfoTooltip
                  ariaLabel="About hop depth"
                  content="Two hops is available for account searches and requires both ledger bounds or both UTC date bounds."
                  align="start"
                />
              </div>
              <select id="investigation-depth" value={filters.depth}
                onChange={(event) => onFiltersChange({ ...filters, depth: event.target.value })}
                aria-invalid={Boolean(fieldErrors.depth)}
                aria-describedby={fieldErrors.depth ? 'investigation-depth-error' : undefined}
                className="block h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)]">
                <option value="1">1 hop</option>
                <option value="2" disabled={targetType !== 'address'}>2 hops · bounded</option>
              </select>
              {fieldErrors.depth && <span id="investigation-depth-error" role="alert" className="block text-[var(--error)]">{fieldErrors.depth}</span>}
            </div>
            {(['ledgerFrom', 'ledgerTo'] as const).map((key) => (
              <div key={key} className="space-y-1 text-xs text-[var(--text-secondary)]">
                <div className="flex min-h-7 items-center gap-1">
                  <label htmlFor={`investigation-${key}`}>{key === 'ledgerFrom' ? 'From ledger' : 'To ledger'}</label>
                  {key === 'ledgerFrom' && (
                    <InfoTooltip ariaLabel="About ledger range" content="Ledger bounds are inclusive." align="start" />
                  )}
                </div>
                <input id={`investigation-${key}`} type="text" inputMode="numeric" value={filters[key]}
                  onChange={(event) => onFiltersChange({ ...filters, [key]: event.target.value })}
                  aria-invalid={Boolean(fieldErrors[key])} aria-describedby={fieldErrors[key] ? `investigation-${key}-error` : undefined}
                  className="block h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 font-mono focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)]" />
                {fieldErrors[key] && <span id={`investigation-${key}-error`} role="alert" className="block text-[var(--error)]">{fieldErrors[key]}</span>}
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(['dateFrom', 'dateTo'] as const).map((key) => (
              <div key={key} className="space-y-1 text-xs text-[var(--text-secondary)]">
                <div className="flex min-h-7 items-center gap-1">
                  <label htmlFor={`investigation-${key}`}>{key === 'dateFrom' ? 'From date (UTC)' : 'To date (UTC)'}</label>
                  {key === 'dateFrom' && (
                    <InfoTooltip
                      ariaLabel="About UTC date range"
                      content="Dates use UTC ledger close time. Both selected days are included."
                      align="start"
                    />
                  )}
                </div>
                <input id={`investigation-${key}`} type="text" inputMode="numeric" placeholder="YYYY-MM-DD" value={filters[key]}
                  onChange={(event) => onFiltersChange({ ...filters, [key]: event.target.value })}
                  aria-invalid={Boolean(fieldErrors[key])} aria-describedby={fieldErrors[key] ? `investigation-${key}-error` : undefined}
                  className="block h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 font-mono focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)]" />
                {fieldErrors[key] && <span id={`investigation-${key}-error`} role="alert" className="block text-[var(--error)]">{fieldErrors[key]}</span>}
              </div>
            ))}
          </div>
          <div className="space-y-1 text-xs text-[var(--text-secondary)]">
            <div className="flex min-h-7 items-center gap-1">
              <label htmlFor="investigation-asset">Asset filter</label>
              <InfoTooltip
                ariaLabel="About asset filtering"
                content="Use the exact asset key shown in evidence. Matching checks source and destination assets. Asset codes are case-sensitive."
                align="start"
              />
            </div>
            <input id="investigation-asset" type="text" value={filters.asset}
              onChange={(event) => onFiltersChange({ ...filters, asset: event.target.value })}
              placeholder="native:XLM or credit_alphanum4:USDC:G…"
              spellCheck={false} autoComplete="off"
              aria-invalid={Boolean(fieldErrors.asset)}
              aria-describedby={fieldErrors.asset ? 'investigation-asset-error' : undefined}
              className="block h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 font-mono text-xs focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)]" />
            {fieldErrors.asset && <span id="investigation-asset-error" role="alert" className="block text-[var(--error)]">{fieldErrors.asset}</span>}
          </div>
          <div className="space-y-1 text-xs text-[var(--text-secondary)]">
            <div className="flex min-h-7 items-center gap-1">
              <label htmlFor="investigation-minAssetAmount">Minimum asset amount</label>
              <InfoTooltip
                ariaLabel="About minimum asset amount"
                content="Requires an asset filter. Unknown amounts are excluded; an event matches when either side meets the minimum."
                align="start"
              />
            </div>
            <input id="investigation-minAssetAmount" type="text" inputMode="decimal" value={filters.minAssetAmount}
              onChange={(event) => onFiltersChange({ ...filters, minAssetAmount: event.target.value })}
              placeholder="0.0000001" autoComplete="off"
              aria-invalid={Boolean(fieldErrors.minAssetAmount)}
              aria-describedby={fieldErrors.minAssetAmount ? 'investigation-minAssetAmount-error' : undefined}
              className="block h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 font-mono text-xs focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)]" />
            {fieldErrors.minAssetAmount && <span id="investigation-minAssetAmount-error" role="alert" className="block text-[var(--error)]">{fieldErrors.minAssetAmount}</span>}
          </div>
          </>}

          {error && (
            <div role="alert" className="flex flex-wrap items-start gap-2 rounded-xl border border-[var(--error)]/20 bg-[var(--error-muted)] px-3 py-2 text-xs text-[var(--error)]">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v3.75m0 3.75h.01M4.5 19.5h15L12 4.5l-7.5 15z" />
              </svg>
              <span>{error}</span>
              <Button type="button" onClick={onRetry} disabled={isLoading}>Retry</Button>
              {isOlderPage && <Button type="button" onClick={() => onPageChange(null)} disabled={isLoading}>Latest page</Button>}
            </div>
          )}
        </form>
      </Card>

      {!investigation && !isLoading && (
        <div className={`grid gap-4 sm:grid-cols-2 ${mode === 'basic' ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
          {(mode === 'basic' ? [
            {
              title: 'Directory context',
              description: 'Check whether the account has a known or verified public identity label.',
              path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
            },
            {
              title: 'Payment patterns',
              description: 'Review the indexed counterparties, assets and activity visible on this page.',
              path: 'M3 12h13m0 0l-4-4m4 4l-4 4M21 6v12',
            },
            {
              title: 'Verify independently',
              description: 'Compare the address with an official website, invoice or trusted contact before sending funds.',
              path: 'M12 3l8 4v5c0 4.5-3.1 8.5-8 9.8C7.1 20.5 4 16.5 4 12V7l8-4z',
            },
          ] : [
            {
              title: 'Account flows',
              description: 'Inspect indexed incoming and outgoing classic payment-flow operations for an account.',
              path: 'M3 12h13m0 0l-4-4m4 4l-4 4M21 6v12',
            },
            {
              title: 'Transaction evidence',
              description: 'Review the transaction hash, operation, memo, ledger, timestamp, addresses, and assets.',
              path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
            },
            {
              title: 'Asset filtering',
              description: 'Narrow account or transaction evidence by an exact source or destination asset.',
              path: 'M12 3l8 4-8 4-8-4 8-4zm8 8l-8 4-8-4m16 4l-8 4-8-4',
            },
            {
              title: 'Bounded two-hop paths',
              description: 'Explore time-ordered, asset-continuous candidate paths for an account within explicit bounds.',
              path: 'M5 6h4m6 0h4M9 6l3 6m3-6l-3 6m-7 6h4m6 0h4m-10 0l3-6m3 6l-3-6',
            },
          ]).map((item) => (
            <Card key={item.title} className="p-5 shadow-sm">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--info-muted)] text-[var(--info)]">
                <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.path} />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-muted)]">{item.description}</p>
            </Card>
          ))}
        </div>
      )}

      {isLoading && (
        <Card className="min-h-64 p-8 shadow-sm">
          <div role="status" className="flex flex-col items-center justify-center gap-3 text-sm text-[var(--text-secondary)]">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--primary-blue)] border-t-transparent motion-reduce:animate-none" />
            <span>Reading payment-flow statistics…</span>
          </div>
        </Card>
      )}

      {investigation && !isLoading && (
        <>
          {mode === 'basic' && investigation.query.address && (
            <Card className="overflow-hidden shadow-sm">
              <div className="grid border-b border-[var(--border-default)] lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.42fr)]">
                <div className="flex gap-4 p-5 sm:p-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--info)]/15 bg-[var(--info-muted)] text-[var(--primary-blue)] shadow-sm">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 3l7 3v5c0 4.4-2.9 8.4-7 9.7C7.9 19.4 5 15.4 5 11V6l7-3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9.5 12l1.6 1.6 3.6-4" />
                    </svg>
                  </div>
                  <div className="min-w-0 max-w-3xl">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Evidence snapshot</span>
                      <Badge variant={directoryBadgeVariant}>{directoryStatusLabel}</Badge>
                    </div>
                    <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">Account overview</h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                      Identity and payment activity found for this address.
                    </p>
                  </div>
                </div>
                <div className="border-t border-[var(--border-default)] bg-[var(--info-muted)]/35 p-5 lg:border-l lg:border-t-0 sm:p-6">
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[var(--primary-blue)] shadow-sm ring-1 ring-[var(--info)]/15">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7.5A2.5 2.5 0 0110.5 5h6A2.5 2.5 0 0119 7.5v9a2.5 2.5 0 01-2.5 2.5h-6A2.5 2.5 0 018 16.5v-9zM5 15H4.5A2.5 2.5 0 012 12.5v-6A2.5 2.5 0 014.5 4H11" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Quick check</div>
                      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">Confirm the recipient</p>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                        Compare the full Stellar address with the one received directly from the person or service. An unlisted account is not automatically unsafe.
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <code className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)]">
                          {shortenAccountAddress(investigation.query.address)}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopyAddress(investigation.query.address!)}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--primary-blue)] transition-colors hover:bg-[var(--bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-blue)]/40"
                          aria-label="Copy full Stellar address"
                        >
                          {copiedAddress === investigation.query.address ? 'Copied' : 'Copy address'}
                        </button>
                        <span className="sr-only" aria-live="polite">
                          {copiedAddress === investigation.query.address ? 'Full Stellar address copied.' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid gap-px bg-[var(--border-default)] sm:grid-cols-3">
                <div className="flex items-center gap-3 bg-[var(--bg-tertiary)] px-5 py-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] shadow-sm ring-1 ring-[var(--border-default)]">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v11a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 17.5v-11zM8 9h8m-8 3h5m-5 3h6" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-0.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Directory</div>
                      <InfoTooltip
                        ariaLabel="About directory status"
                        content="Public identity labels are directory context only. They do not certify ownership or safety."
                        direction="bottom"
                        align="start"
                        className="-my-1"
                      />
                    </div>
                    <div className="mt-0.5 truncate text-sm font-semibold text-[var(--text-primary)]">{directorySignal}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-[var(--bg-tertiary)] px-5 py-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-secondary)] text-[var(--primary-blue)] shadow-sm ring-1 ring-[var(--border-default)]">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M5 7h14M5 12h14M5 17h8" />
                      <circle cx="17" cy="17" r="3" strokeWidth={1.7} />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-0.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Activity found</div>
                      <InfoTooltip
                        ariaLabel="About indexed activity"
                        content="Successful indexed payment-flow operations in this result page. This is not a complete account total."
                        direction="bottom"
                        align="start"
                        className="-my-1"
                      />
                    </div>
                    <div className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--text-primary)]">{investigation.summary.events.toLocaleString()} events</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-[var(--bg-tertiary)] px-5 py-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-secondary)] text-[var(--warning)] shadow-sm ring-1 ring-[var(--border-default)]">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M4 16l4-4 3 3 6-7 3 3" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M4 20h16" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-0.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Signals found</div>
                      <InfoTooltip
                        ariaLabel="About account signals"
                        content="Patterns detected in the displayed activity. They are context, not a fraud or safety verdict."
                        direction="bottom"
                        align="start"
                        className="-my-1"
                      />
                    </div>
                    <div className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--text-primary)]">{investigation.riskContext.signals.length.toLocaleString()} found</div>
                  </div>
                </div>
              </div>
            </Card>
          )}
          {mode === 'advanced' ? (
            <Card className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div role="status" className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                  <span>{investigation.events.length.toLocaleString()} events · latest ledger {investigation.coverage.latestObservedLedger?.toLocaleString() ?? 'unavailable'}</span>
                  <InfoTooltip
                    ariaLabel="About result coverage"
                    align="start"
                    content={(
                      <span className="space-y-1">
                        <span className="block font-semibold">Current result page</span>
                        <span className="block">Network: {investigation.network}</span>
                        <span className="block">Latest observed: {formatDate(investigation.coverage.latestObservedClosedAt)}</span>
                        <span className="block">{investigation.coverage.note ?? 'Successful classic payment-flow operations only. Full-history coverage is not verified.'}</span>
                      </span>
                    )}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => onExport('json')} className="text-xs">Export page JSON</Button>
                  <Button type="button" onClick={() => onExport('csv')} disabled={!investigation.events.length} className="text-xs">Export page CSV</Button>
                  <Button type="button" onClick={() => onExport('html')} className="text-xs">Export report HTML</Button>
                  <Button type="button" onClick={() => onPageChange(null)} disabled={!isOlderPage} className="text-xs">Latest page</Button>
                  <Button type="button" onClick={() => onPageChange(investigation.coverage.nextCursor ?? null)} disabled={!investigation.coverage.nextCursor} className="text-xs">Older events</Button>
                </div>
              </div>
            </Card>
          ) : (isOlderPage || investigation.coverage.nextCursor) ? (
            <div className="flex justify-end gap-2">
              {isOlderPage && (
                <Button type="button" onClick={() => onPageChange(null)} className="text-xs">Back to latest</Button>
              )}
              {investigation.coverage.nextCursor && (
                <Button type="button" onClick={() => onPageChange(investigation.coverage.nextCursor ?? null)} className="text-xs">View older activity</Button>
              )}
            </div>
          ) : null}
          <div className={`grid grid-cols-2 gap-3 ${mode === 'basic' ? 'lg:grid-cols-4' : 'sm:grid-cols-3 lg:grid-cols-6'}`}>
            {metricSpecs(investigation).filter((metric) => mode === 'advanced' || metric.showInBasic).map((metric) => {
              const accentColor =
                metric.accent === 'success'
                  ? 'var(--success)'
                  : metric.accent === 'error'
                    ? 'var(--error)'
                    : 'var(--text-tertiary)';
              const metricLabel = mode === 'basic' ? metric.basicLabel ?? metric.label : metric.label;
              return (
                <Card key={metric.label} className="p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex min-w-0 items-center gap-0.5">
                      <div className="truncate text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">{metricLabel}</div>
                      <InfoTooltip
                        ariaLabel={`About ${metricLabel}`}
                        content={metric.tooltip}
                        direction="bottom"
                        align="start"
                        className="-my-1"
                      />
                    </div>
                    <span style={{ color: accentColor }}>{metric.icon}</span>
                  </div>
                  <div
                    className="whitespace-nowrap text-lg font-semibold tabular-nums text-[var(--text-primary)]"
                    style={metric.accent ? { color: accentColor } : undefined}
                  >
                    {metric.value}
                  </div>
                  {mode === 'advanced' && <div className="mt-0.5 text-[10px] text-[var(--text-muted)]">{metric.hint}</div>}
                </Card>
              );
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <PaymentFlowMap investigation={investigation} />

            <Card className="self-start shadow-sm">
              <div className="border-b border-[var(--border-default)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <h2 className="text-base font-semibold text-[var(--text-primary)]">Activity highlights</h2>
                      <InfoTooltip
                        ariaLabel="About activity highlights"
                        content="Patterns detected only in the displayed activity. They may change with filters or pagination and are not a fraud or safety verdict."
                        align="start"
                      />
                    </div>
                    {mode === 'advanced' && (
                      <p className="text-xs text-[var(--text-secondary)]">Based only on the returned page. These signals are not a fraud or safety verdict and may change with filters or pagination.</p>
                    )}
                  </div>
                </div>
              </div>

              {mode === 'advanced' && <div className="border-b border-[var(--border-default)] p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Account context</h3>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{investigation.accountContext.note}</p>
                  </div>
                  {investigation.accountContext.metadataUnavailable && (
                    <Badge variant="warning">Metadata unavailable</Badge>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-[var(--bg-tertiary)] px-2 py-2">
                    <div className="font-mono text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                      {investigation.accountContext.knownAccounts.toLocaleString()}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Known</div>
                  </div>
                  <div className="rounded-xl bg-[var(--bg-tertiary)] px-2 py-2">
                    <div className="font-mono text-sm font-semibold tabular-nums text-[var(--info)]">
                      {investigation.accountContext.labeledAccounts.toLocaleString()}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Labeled</div>
                  </div>
                  <div className="rounded-xl bg-[var(--bg-tertiary)] px-2 py-2">
                    <div className="font-mono text-sm font-semibold tabular-nums text-[var(--success)]">
                      {investigation.accountContext.verifiedAccounts.toLocaleString()}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Verified</div>
                  </div>
                </div>

                {investigation.accountContext.focusAccount && (
                  <div className="mt-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-3">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                      Focus account
                    </div>
                    <PaymentFlowAccountIdentity
                      address={investigation.accountContext.focusAccount.address}
                      account={investigation.accountContext.focusAccount}
                    />
                  </div>
                )}
              </div>}

              <div className="space-y-2.5 p-4">
                {investigation.riskContext.signals.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--border-default)] p-3 text-xs text-[var(--text-muted)]">
                    No notable signals in this sample.
                  </div>
                ) : (
                  investigation.riskContext.signals.map((signal) => {
                    const basicLabel = signal.label === 'Incoming collection pattern'
                      ? 'Mostly incoming activity'
                      : signal.label === 'Account merge observed'
                        ? 'Account merge found'
                        : signal.label;
                    const basicDescription = signal.label === 'Incoming collection pattern'
                      ? 'Most activity shown here is incoming.'
                      : signal.label === 'Account merge observed'
                        ? 'One merge into another Stellar account appears here.'
                        : signal.description;

                    return (
                    <div
                      key={`${signal.label}-${signal.description}`}
                      className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-3"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant="info">{signalLabel(signal.severity)}</Badge>
                        <h3 className="text-sm font-medium text-[var(--text-primary)]">{mode === 'basic' ? basicLabel : signal.label}</h3>
                      </div>
                      <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{mode === 'basic' ? basicDescription : signal.description}</p>
                    </div>
                    );
                  })
                )}
              </div>

              {mode === 'advanced' && investigation.riskContext.guidance.length > 0 && (
                <div className="border-t border-[var(--border-default)] p-4">
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Evidence checklist</h3>
                  <ul className="mt-2 space-y-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                    {investigation.riskContext.guidance.map((item) => (
                      <li key={item} className="flex gap-2">
                        <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--primary-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {mode === 'advanced' && investigation.riskContext.limitations.length > 0 && (
                <div className="border-t border-[var(--border-default)] p-4">
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Limits</h3>
                  <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[var(--text-muted)]">
                    {investigation.riskContext.limitations.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--text-muted)]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </div>

          <section className="space-y-4" aria-labelledby="payment-details-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1">
                  <h2 id="payment-details-title" className="text-sm font-semibold text-[var(--text-primary)]">Payment details</h2>
                  <InfoTooltip
                    ariaLabel="About payment details"
                    content="Grouped flows and individual events use the same displayed activity. Switching views does not change filters."
                    align="start"
                  />
                </div>
                {mode === 'advanced' && (
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">Both views use the same returned page; switching views does not change filters or export scope.</p>
                )}
              </div>
              <div className="inline-flex rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-0.5" role="group" aria-label="Evidence view">
                <button type="button" aria-pressed={flowView === 'grouped'} onClick={() => setFlowView('grouped')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-blue)] ${flowView === 'grouped' ? 'bg-[var(--primary-blue)] text-white' : 'text-[var(--text-secondary)]'}`}>Grouped flows</button>
                <button type="button" aria-pressed={flowView === 'events'} onClick={() => setFlowView('events')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-blue)] ${flowView === 'events' ? 'bg-[var(--primary-blue)] text-white' : 'text-[var(--text-secondary)]'}`}>Individual events</button>
              </div>
            </div>
            {flowView === 'grouped'
              ? <PaymentFlowGroupsTable groups={investigation.flowGroups} />
              : <PaymentFlowEvidenceTable events={investigation.events} />}
          </section>

          <PaymentFlowTimeline events={investigation.events} />
        </>
      )}
    </div>
  );
}
