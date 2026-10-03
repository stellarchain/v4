'use client';

import type { ReactNode } from 'react';
import InfoTooltip from '@/components/InfoTooltip';
import { formatCompactAmount } from '@/lib/shared/formatCompactAmount';
import {
  formatExactDecimal,
  getSacDifferencePresentation,
  rawIntegerToDecimal,
} from '@/lib/shared/sacBalanceComparison';

export interface SacMarketReconciliationData {
  assetKey: string;
  indexedBalanceRaw: string | null;
  assetMarketSupplyRaw: string | null;
  differenceRaw: string | null;
  lastMarketUpdate?: string;
  status: 'matched' | 'differs' | 'not_enough_indexed_data' | 'market_unavailable';
}

interface SacBalanceComparisonProps {
  reconciliation: SacMarketReconciliationData;
  decimals: number;
  lastUpdatedLabel: string;
  symbol?: string;
}

interface MetricTileProps {
  label: string;
  value: string;
  tooltip: ReactNode;
  emphasis?: boolean;
}

function getStatusPresentation(status: SacMarketReconciliationData['status']) {
  switch (status) {
    case 'matched':
      return {
        label: 'Observed values match',
        className: 'border-[var(--success)]/20 bg-[var(--success-muted)] text-[var(--success)]',
      };
    case 'differs':
      return {
        label: 'Different observed scopes',
        className: 'border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
      };
    case 'not_enough_indexed_data':
      return {
        label: 'Partial indexed coverage',
        className: 'border-[var(--info)]/20 bg-[var(--info-muted)] text-[var(--info)]',
      };
    default:
      return {
        label: 'Market data unavailable',
        className: 'border-[var(--warning)]/20 bg-[var(--warning-muted)] text-[var(--warning)]',
      };
  }
}

function formatMetricValue(raw: string | null, decimals: number, symbol: string) {
  const exact = rawIntegerToDecimal(raw, decimals);
  if (exact === null) return { display: 'Unavailable', exact: null };

  return {
    display: `${formatCompactAmount(exact)} ${symbol}`,
    exact,
  };
}

function ExactValue({ label, exact, symbol }: { label: string; exact: string | null; symbol: string }) {
  if (exact === null) {
    return <span className="mt-2 block text-[var(--text-tertiary)]">Exact value unavailable.</span>;
  }

  return (
    <span className="mt-2 block">
      <span className="block font-semibold">{label}</span>
      <span className="mt-0.5 block break-all font-mono tabular-nums">
        {formatExactDecimal(exact)} {symbol}
      </span>
    </span>
  );
}

function MetricTile({ label, value, tooltip, emphasis = false }: MetricTileProps) {
  return (
    <div className={`min-w-0 rounded-xl border p-3 ${emphasis
      ? 'border-[var(--info)]/15 bg-[var(--info-muted)]/35'
      : 'border-[var(--border-subtle)] bg-[var(--bg-primary)]'}`}
    >
      <div className="flex items-center gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          {label}
        </span>
        <InfoTooltip
          ariaLabel={`About ${label.toLowerCase()}`}
          content={tooltip}
          align="start"
          direction="bottom"
          className="-my-2"
        />
      </div>
      <div className="mt-1 break-words font-mono text-base font-semibold tabular-nums text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}

export default function SacBalanceComparison({
  reconciliation,
  decimals,
  lastUpdatedLabel,
  symbol,
}: SacBalanceComparisonProps) {
  const assetSymbol = symbol?.trim() || reconciliation.assetKey.split('-')[0] || 'units';
  const indexed = formatMetricValue(reconciliation.indexedBalanceRaw, decimals, assetSymbol);
  const market = formatMetricValue(reconciliation.assetMarketSupplyRaw, decimals, assetSymbol);
  const difference = getSacDifferencePresentation(reconciliation.differenceRaw, decimals);
  const status = getStatusPresentation(reconciliation.status);
  const differenceExact = difference.exact === null
    ? 'Exact difference unavailable.'
    : `Exact indexed minus Horizon result: ${formatExactDecimal(difference.exact)} ${assetSymbol}.`;
  const differenceExplanation = difference.relation === 'below'
    ? 'The comparison is indexed holder total minus Horizon supply. “Below” means the indexed total is smaller. The sources cover different data and may update at different times, so this is not a negative balance or a safety verdict.'
    : difference.relation === 'above'
      ? 'The comparison is indexed holder total minus Horizon supply. “Above” means the indexed total is larger. The sources cover different data and may update at different times, so this is not a safety verdict.'
      : difference.relation === 'equal'
        ? 'The two observed values matched at their recorded update times.'
        : 'The gap cannot be calculated until both source values are available.';

  return (
    <section
      aria-label="SAC balance comparison"
      className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm"
    >
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--info-muted)] text-[var(--primary-blue)]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M7 7h10M7 12h4m2 5h4m0-5h.01M7 17h.01M4 3h16v18H4V3z" />
            </svg>
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-0.5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">SAC balance comparison</h3>
              <InfoTooltip
                ariaLabel="About SAC balance comparison"
                content="Compares the SAC holder balances currently indexed by StellarChain with the classic asset supply reported by Horizon. These sources measure different scopes."
                direction="bottom"
                align="start"
                className="-my-2"
              />
            </div>
            <div className="mt-0.5 truncate font-mono text-[11px] text-[var(--text-tertiary)]">
              {reconciliation.assetKey}
            </div>
          </div>
        </div>
        <span className={`w-fit shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${status.className}`}>
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
        <MetricTile
          label="Indexed holder total"
          value={indexed.display}
          tooltip={(
            <span>
              Sum of SAC holder balances currently indexed by StellarChain. This may cover only part of the holder set.
              <ExactValue label="Exact indexed total" exact={indexed.exact} symbol={assetSymbol} />
            </span>
          )}
        />
        <MetricTile
          label="Horizon asset supply"
          value={market.display}
          tooltip={(
            <span>
              Total classic asset supply reported by Horizon. It may have a different scope and update time.
              <ExactValue label="Exact Horizon supply" exact={market.exact} symbol={assetSymbol} />
            </span>
          )}
        />
        <MetricTile
          label="Observed gap"
          value={difference.display}
          emphasis
          tooltip={(
            <span>
              {differenceExplanation}
              <span className="mt-2 block font-mono tabular-nums">{differenceExact}</span>
            </span>
          )}
        />
        <div className="min-w-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Horizon updated
          </div>
          <div className="mt-1 text-base font-semibold text-[var(--text-primary)]">{lastUpdatedLabel}</div>
        </div>
      </div>

    </section>
  );
}
