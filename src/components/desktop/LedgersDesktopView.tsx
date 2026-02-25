'use client';

import Link from 'next/link';
import { Ledger, formatStroopsToXLM } from '@/lib/stellar';

interface LedgersDesktopViewProps {
  ledgers: Ledger[];
  loading: boolean;
  currentPage: number;
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
  order: 'asc' | 'desc';
  onOrderChange: (order: 'asc' | 'desc') => void;
}

const timeAgo = (dateStr: string) => {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const formatCompact = (numStr: string | undefined): string => {
  if (!numStr) return '0';
  const num = parseFloat(numStr);
  if (isNaN(num)) return '0';
  if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

export default function LedgersDesktopView({
  ledgers,
  loading,
  currentPage,
  hasNextPage,
  onPageChange,
  order,
  onOrderChange,
}: LedgersDesktopViewProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[1400px] p-4 lg:p-4">
        {/* Header Card */}
        <div className="mb-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {/* Left: Title & Meta */}
            <div className="flex items-start gap-4 min-w-0">
              <Link
                href="/"
                className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400 transition hover:bg-sky-100 dark:hover:bg-sky-900/60"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Network</span>
                </div>
                <div className="text-xl font-bold text-[var(--text-primary)]">Ledgers</div>
                <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                  Browse all ledgers on the Stellar network
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOrderChange('desc')}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                  order === 'desc'
                    ? 'bg-sky-50 border-sky-200 text-sky-700'
                    : 'bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                Newest first
              </button>
              <button
                type="button"
                onClick={() => onOrderChange('asc')}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                  order === 'asc'
                    ? 'bg-sky-50 border-sky-200 text-sky-700'
                    : 'bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                Oldest first
              </button>
            </div>
          </div>
        </div>

        {/* Ledgers Table */}
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full sc-table">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/50">
                  <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">Ledger</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">Age</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">Transactions</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">Operations</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right whitespace-nowrap">Base Fee</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right whitespace-nowrap">Total Coins</th>
                  <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-center whitespace-nowrap">Protocol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bg-primary)]">
                {loading ? (
                  // Skeleton rows
                  Array.from({ length: 15 }).map((_, i) => (
                    <tr key={i}>
                      <td className="py-2.5 px-4"><div className="h-4 w-24 bg-[var(--bg-tertiary)] rounded animate-pulse" /></td>
                      <td className="py-2.5 px-3"><div className="h-4 w-16 bg-[var(--bg-tertiary)] rounded animate-pulse" /></td>
                      <td className="py-2.5 px-3"><div className="h-4 w-20 bg-[var(--bg-tertiary)] rounded animate-pulse" /></td>
                      <td className="py-2.5 px-3"><div className="h-4 w-14 bg-[var(--bg-tertiary)] rounded animate-pulse" /></td>
                      <td className="py-2.5 px-3"><div className="h-4 w-16 bg-[var(--bg-tertiary)] rounded animate-pulse ml-auto" /></td>
                      <td className="py-2.5 px-3"><div className="h-4 w-20 bg-[var(--bg-tertiary)] rounded animate-pulse ml-auto" /></td>
                      <td className="py-2.5 px-4"><div className="h-4 w-10 bg-[var(--bg-tertiary)] rounded animate-pulse mx-auto" /></td>
                    </tr>
                  ))
                ) : ledgers.length > 0 ? (
                  ledgers.map((ledger) => {
                    const totalTx = ledger.successful_transaction_count + ledger.failed_transaction_count;
                    const hasFailedTx = ledger.failed_transaction_count > 0;

                    return (
                      <tr
                        key={ledger.id}
                        className="hover:bg-sky-50/30 transition-colors group cursor-pointer"
                        onClick={() => window.location.href = `/ledger/${ledger.sequence}`}
                      >
                        {/* Ledger # */}
                        <td className="py-2.5 px-4">
                          <Link
                            href={`/ledger/${ledger.sequence}`}
                            className="font-mono text-[12px] font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            #{ledger.sequence.toLocaleString()}
                          </Link>
                        </td>

                        {/* Age */}
                        <td className="py-2.5 px-3 text-[12px] text-[var(--text-tertiary)] whitespace-nowrap">
                          {timeAgo(ledger.closed_at)}
                        </td>

                        {/* Transactions */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              {ledger.successful_transaction_count}
                            </span>
                            {hasFailedTx && (
                              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-rose-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                {ledger.failed_transaction_count}
                              </span>
                            )}
                            {totalTx === 0 && (
                              <span className="text-[12px] text-[var(--text-muted)]">0</span>
                            )}
                          </div>
                        </td>

                        {/* Operations */}
                        <td className="py-2.5 px-3">
                          <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                            {ledger.operation_count.toLocaleString()}
                          </span>
                        </td>

                        {/* Base Fee */}
                        <td className="py-2.5 px-3 text-right">
                          <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                            {formatStroopsToXLM(ledger.base_fee_in_stroops)}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)] ml-1">XLM</span>
                        </td>

                        {/* Total Coins */}
                        <td className="py-2.5 px-3 text-right">
                          <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                            {formatCompact(ledger.total_coins)}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)] ml-1">XLM</span>
                        </td>

                        {/* Protocol Version */}
                        <td className="py-2.5 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-900/40 border border-sky-200 dark:border-sky-800/50 text-[10px] font-bold text-sky-700 dark:text-sky-400">
                            v{ledger.protocol_version}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-[var(--text-muted)] text-sm">
                      No ledgers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-center gap-1.5 px-4 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]/50">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-muted)] hover:bg-sky-50 hover:border-sky-200 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <span className="mx-2 text-[10px] font-medium text-[var(--text-muted)]">
              Page {currentPage}
            </span>

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!hasNextPage || loading}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-muted)] hover:bg-sky-50 hover:border-sky-200 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
