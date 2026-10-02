'use client';

import { FormEvent, ReactNode, useRef, useState } from 'react';
import type { InvestigationFilters, InvestigationErrors } from '@/lib/shared/investigationTypes';
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

interface PaymentFlowInvestigationViewProps {
  query: string;
  direction: PaymentFlowDirection;
  investigation: PaymentFlowInvestigationResponse | null;
  isLoading: boolean;
  error: string | null;
  onQueryChange: (query: string) => void;
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

function signalLabel(severity: PaymentFlowRiskSignal['severity']): string {
  return severity === 'info' ? 'Context' : 'Pattern';
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'No data';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown time' : date.toISOString().replace('T', ' ').replace('.000Z', ' UTC');
}

function formatNumber(value: number | string): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);
  if (Math.abs(numericValue) >= 1_000_000_000) return `${(numericValue / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(numericValue) >= 1_000_000) return `${(numericValue / 1_000_000).toFixed(2)}M`;
  if (Math.abs(numericValue) >= 1_000) return `${(numericValue / 1_000).toFixed(1)}K`;
  return numericValue.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

interface MetricSpec {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  accent?: 'success' | 'error';
}

function metricSpecs(investigation: PaymentFlowInvestigationResponse): MetricSpec[] {
  const ico = (path: string) => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={path} />
    </svg>
  );
  return [
    {
      label: 'Events',
      value: investigation.summary.events.toLocaleString(),
      hint: 'returned rows',
      icon: ico('M13 10V3L4 14h7v7l9-11h-7z'),
    },
    {
      label: 'Transactions',
      value: investigation.summary.transactions.toLocaleString(),
      hint: 'unique hashes',
      icon: ico('M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4'),
    },
    {
      label: 'Counterparties',
      value: investigation.summary.uniqueCounterparties.toLocaleString(),
      hint: 'distinct addresses',
      icon: ico('M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z'),
    },
    {
      label: 'Assets',
      value: investigation.summary.uniqueAssets.toLocaleString(),
      hint: 'observed assets',
      icon: ico('M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'),
    },
    {
      label: 'XLM received',
      value: formatNumber(investigation.summary.nativeReceived),
      hint: 'native only',
      icon: ico('M19 14l-7 7m0 0l-7-7m7 7V3'),
      accent: 'success',
    },
    {
      label: 'XLM sent',
      value: formatNumber(investigation.summary.nativeSent),
      hint: 'native only',
      icon: ico('M5 10l7-7m0 0l7 7m-7-7v18'),
      accent: 'error',
    },
  ];
}

export default function PaymentFlowInvestigationView({
  query,
  direction,
  investigation,
  isLoading,
  error,
  onQueryChange,
  onDirectionChange,
  onSubmit,
  filters, fieldErrors, onFiltersChange, onClear, onRetry, onPageChange, onExport, isOlderPage,
}: PaymentFlowInvestigationViewProps) {
  const composing = useRef(false);
  const [flowView, setFlowView] = useState<'grouped' | 'events'>('grouped');
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (composing.current) return;
    onSubmit();
  };
  const canSubmit = query.trim() !== '' && !isLoading;

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
              <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">Flow account investigation</h1>
              <Badge variant="info">Payment flow</Badge>
            </div>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {investigation
                ? investigation.coverage.rowsReturned > 0
                  ? `Current page: ${formatDate(investigation.coverage.firstClosedAt)} – ${formatDate(investigation.coverage.lastClosedAt)}`
                  : 'No indexed payment-flow events match these filters.'
                : 'Page-scoped evidence from indexed Stellar payment-flow history.'}
            </p>
          </div>
        </div>
      </div>

      <Card className="p-4 shadow-sm">
        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label htmlFor="investigation-query" className="text-xs font-medium text-[var(--text-secondary)]">Account or transaction hash</label>
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
                placeholder="Paste a Stellar address (G...) or transaction hash"
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
                  Investigate
                </>
              )}
            </button>
            {query && <Button type="button" onClick={onClear} className="text-sm focus-visible:outline-2 focus-visible:outline-offset-2">Clear</Button>}
          </div>
          {fieldErrors.query && <p id="investigation-query-error" role="alert" className="text-xs text-[var(--error)]">{fieldErrors.query}</p>}

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

          <div className="grid gap-3 sm:grid-cols-3">
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
            {(['ledgerFrom', 'ledgerTo'] as const).map((key) => (
              <label key={key} htmlFor={`investigation-${key}`} className="space-y-1 text-xs text-[var(--text-secondary)]">
                <span>{key === 'ledgerFrom' ? 'From ledger (inclusive)' : 'To ledger (inclusive)'}</span>
                <input id={`investigation-${key}`} type="text" inputMode="numeric" value={filters[key]}
                  onChange={(event) => onFiltersChange({ ...filters, [key]: event.target.value })}
                  aria-invalid={Boolean(fieldErrors[key])} aria-describedby={fieldErrors[key] ? `investigation-${key}-error` : undefined}
                  className="block h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 font-mono focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)]" />
                {fieldErrors[key] && <span id={`investigation-${key}-error`} role="alert" className="block text-[var(--error)]">{fieldErrors[key]}</span>}
              </label>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(['dateFrom', 'dateTo'] as const).map((key) => (
              <label key={key} htmlFor={`investigation-${key}`} className="space-y-1 text-xs text-[var(--text-secondary)]">
                <span>{key === 'dateFrom' ? 'From date (UTC, inclusive)' : 'To date (UTC, inclusive)'}</span>
                <input id={`investigation-${key}`} type="text" inputMode="numeric" placeholder="YYYY-MM-DD" value={filters[key]}
                  onChange={(event) => onFiltersChange({ ...filters, [key]: event.target.value })}
                  aria-invalid={Boolean(fieldErrors[key])} aria-describedby={fieldErrors[key] ? `investigation-${key}-error` : 'investigation-date-help'}
                  className="block h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 font-mono focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)]" />
                {fieldErrors[key] && <span id={`investigation-${key}-error`} role="alert" className="block text-[var(--error)]">{fieldErrors[key]}</span>}
              </label>
            ))}
          </div>
          <p id="investigation-date-help" className="text-xs text-[var(--text-secondary)]">Dates use UTC ledger close time. Both selected days are included.</p>
          <label className="space-y-1 text-xs text-[var(--text-secondary)]" htmlFor="investigation-asset">
            <span>Asset (source or destination)</span>
            <input id="investigation-asset" type="text" value={filters.asset}
              onChange={(event) => onFiltersChange({ ...filters, asset: event.target.value })}
              placeholder="native:XLM or credit_alphanum4:USDC:G…"
              spellCheck={false} autoComplete="off"
              aria-invalid={Boolean(fieldErrors.asset)}
              aria-describedby={fieldErrors.asset ? 'investigation-asset-error' : 'investigation-asset-help'}
              className="block h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 font-mono text-xs focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)]" />
            {fieldErrors.asset
              ? <span id="investigation-asset-error" role="alert" className="block text-[var(--error)]">{fieldErrors.asset}</span>
              : <span id="investigation-asset-help" className="block text-[var(--text-secondary)]">Use the exact asset key shown in evidence. Stellar asset codes are case-sensitive.</span>}
          </label>
          <label className="space-y-1 text-xs text-[var(--text-secondary)]" htmlFor="investigation-minAssetAmount">
            <span>Minimum matching asset amount (hide dust)</span>
            <input id="investigation-minAssetAmount" type="text" inputMode="decimal" value={filters.minAssetAmount}
              onChange={(event) => onFiltersChange({ ...filters, minAssetAmount: event.target.value })}
              placeholder="0.0000001" autoComplete="off"
              aria-invalid={Boolean(fieldErrors.minAssetAmount)}
              aria-describedby={fieldErrors.minAssetAmount ? 'investigation-minAssetAmount-error' : 'investigation-minAssetAmount-help'}
              className="block h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 font-mono text-xs focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)]" />
            {fieldErrors.minAssetAmount
              ? <span id="investigation-minAssetAmount-error" role="alert" className="block text-[var(--error)]">{fieldErrors.minAssetAmount}</span>
              : <span id="investigation-minAssetAmount-help" className="block text-[var(--text-secondary)]">Requires the asset above. An event passes if its source or destination amount in that asset meets the minimum; unknown amounts are excluded.</span>}
          </label>
          <p className="text-xs text-[var(--text-secondary)]">Choose filters, then Investigate. Results, graph and exports describe one page, not the complete account history.</p>

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
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              title: 'Trace value movement',
              description: 'Follow incoming and outgoing payment events around an address or transaction.',
              path: 'M3 12h13m0 0l-4-4m4 4l-4 4M21 6v12',
            },
            {
              title: 'Preserve evidence',
              description: 'Surface tx hash, memo, ledger, timestamp, counterparty, and asset context in one view.',
              path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
            },
            {
              title: 'Signal, not verdict',
              description: 'Transparent heuristics and limitations — never labels an address as definitively safe or unsafe.',
              path: 'M12 9v3.75m0 3.75h.01M4.5 19.5h15L12 4.5l-7.5 15z',
            },
          ].map((item) => (
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
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div role="status" className="space-y-1 text-xs text-[var(--text-secondary)]">
                <p>{investigation.network} · {investigation.events.length} events on this page · newest first</p>
                <p>Latest observed indexed ledger: {investigation.coverage.latestObservedLedger?.toLocaleString() ?? 'Unavailable'} · {formatDate(investigation.coverage.latestObservedClosedAt)}</p>
                <p>{investigation.coverage.note ?? 'Successful classic payment-flow operations only. Full-history coverage is not verified.'}</p>
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {metricSpecs(investigation).map((metric) => {
              const accentColor =
                metric.accent === 'success'
                  ? 'var(--success)'
                  : metric.accent === 'error'
                    ? 'var(--error)'
                    : 'var(--text-tertiary)';
              return (
                <Card key={metric.label} className="p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">{metric.label}</div>
                    <span style={{ color: accentColor }}>{metric.icon}</span>
                  </div>
                  <div
                    className="text-lg font-semibold tabular-nums text-[var(--text-primary)]"
                    style={metric.accent ? { color: accentColor } : undefined}
                  >
                    {metric.value}
                  </div>
                  <div className="mt-0.5 text-[10px] text-[var(--text-muted)]">{metric.hint}</div>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <PaymentFlowMap investigation={investigation} />

            <Card className="shadow-sm">
              <div className="border-b border-[var(--border-default)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">Observed patterns</h2>
                    <p className="text-xs text-[var(--text-secondary)]">Based only on the returned page. These signals are not a fraud or safety verdict and may change with filters or pagination.</p>
                  </div>
                </div>
              </div>

              <div className="border-b border-[var(--border-default)] p-4">
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
              </div>

              <div className="space-y-2.5 p-4">
                {investigation.riskContext.signals.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--border-default)] p-3 text-xs text-[var(--text-muted)]">
                    No notable signals in this sample.
                  </div>
                ) : (
                  investigation.riskContext.signals.map((signal) => (
                    <div
                      key={`${signal.label}-${signal.description}`}
                      className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-3"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant="info">{signalLabel(signal.severity)}</Badge>
                        <h3 className="text-sm font-medium text-[var(--text-primary)]">{signal.label}</h3>
                      </div>
                      <p className="text-xs leading-relaxed text-[var(--text-muted)]">{signal.description}</p>
                    </div>
                  ))
                )}
              </div>

              {investigation.riskContext.guidance.length > 0 && (
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

              {investigation.riskContext.limitations.length > 0 && (
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

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Payment-flow evidence</h2>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Both views use the same returned page; switching views does not change filters or export scope.</p>
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
          <details className="text-sm text-[var(--text-secondary)]">
            <summary className="cursor-pointer py-3 focus-visible:outline-2">Event timeline for this page</summary>
            <PaymentFlowTimeline events={investigation.events} />
          </details>
        </>
      )}
    </div>
  );
}
