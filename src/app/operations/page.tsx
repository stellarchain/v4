'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import type { Operation } from '@/lib/stellar';
import { shortenAddress, getOperationTypeLabel, formatXLM } from '@/lib/stellar';
import { createHorizonServer } from '@/services/horizon';
import { txRoute, addressRoute } from '@/lib/shared/routes';
import { useNetwork } from '@/contexts/NetworkContext';

const PAGE_SIZE = 25;

// ─── Helpers ────────────────────────────────────────────────

function getTypeStyle(type: string): { label: string; color: string; bgColor: string } {
  if (type === 'payment' || type === 'path_payment_strict_receive' || type === 'path_payment_strict_send') {
    return { label: 'Payment', color: 'text-emerald-700 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800/50' };
  }
  if (type === 'create_account') {
    return { label: 'Account', color: 'text-sky-700 dark:text-sky-400', bgColor: 'bg-sky-50 dark:bg-sky-900/40 border-sky-200 dark:border-sky-800/50' };
  }
  if (type === 'manage_buy_offer' || type === 'manage_sell_offer' || type === 'create_passive_sell_offer') {
    return { label: 'Offer', color: 'text-violet-700 dark:text-violet-400', bgColor: 'bg-violet-50 dark:bg-violet-900/40 border-violet-200 dark:border-violet-800/50' };
  }
  if (type === 'change_trust') {
    return { label: 'Trust', color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800/50' };
  }
  if (type === 'set_options') {
    return { label: 'Options', color: 'text-indigo-700 dark:text-indigo-400', bgColor: 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800/50' };
  }
  if (type === 'invoke_host_function') {
    return { label: 'Contract', color: 'text-cyan-700 dark:text-cyan-400', bgColor: 'bg-cyan-50 dark:bg-cyan-900/40 border-cyan-200 dark:border-cyan-800/50' };
  }
  if (type === 'account_merge') {
    return { label: 'Merge', color: 'text-rose-700 dark:text-rose-400', bgColor: 'bg-rose-50 dark:bg-rose-900/40 border-rose-200 dark:border-rose-800/50' };
  }
  if (type === 'manage_data') {
    return { label: 'Data', color: 'text-teal-700 dark:text-teal-400', bgColor: 'bg-teal-50 dark:bg-teal-900/40 border-teal-200 dark:border-teal-800/50' };
  }
  if (type === 'bump_sequence') {
    return { label: 'Bump', color: 'text-orange-700 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-900/40 border-orange-200 dark:border-orange-800/50' };
  }
  if (type === 'allow_trust' || type === 'set_trust_line_flags') {
    return { label: 'Trust', color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800/50' };
  }
  return { label: 'Op', color: 'text-[var(--text-secondary)]', bgColor: 'bg-[var(--bg-primary)] border-transparent' };
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

function getOperationAmount(op: Operation): { amount: string; asset: string } | null {
  if (op.amount) {
    const asset = op.asset_code || (op.asset_type === 'native' ? 'XLM' : '');
    return { amount: op.amount, asset };
  }
  if (op.starting_balance) {
    return { amount: op.starting_balance, asset: 'XLM' };
  }
  return null;
}

// ─── Pagination ─────────────────────────────────────────────

const PaginationControls = ({ currentPage, totalPages, onPageChange, loading }: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading: boolean;
}) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 px-4 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || loading}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-muted)] hover:bg-sky-50 dark:hover:bg-sky-900/40 hover:border-sky-200 dark:hover:border-sky-800 hover:text-sky-700 dark:hover:text-sky-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
        let pageNum: number;
        if (totalPages <= 5) {
          pageNum = i + 1;
        } else if (currentPage <= 3) {
          pageNum = i + 1;
        } else if (currentPage >= totalPages - 2) {
          pageNum = totalPages - 4 + i;
        } else {
          pageNum = currentPage - 2 + i;
        }
        return (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            disabled={loading}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-bold transition-colors ${
              currentPage === pageNum
                ? 'bg-sky-600 text-white'
                : 'text-[var(--text-muted)] hover:bg-sky-50 dark:hover:bg-sky-900/40 hover:text-sky-700 dark:hover:text-sky-400'
            }`}
          >
            {pageNum}
          </button>
        );
      })}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages || loading}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-muted)] hover:bg-sky-50 dark:hover:bg-sky-900/40 hover:border-sky-200 dark:hover:border-sky-800 hover:text-sky-700 dark:hover:text-sky-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {loading && (
        <svg className="w-4 h-4 animate-spin ml-2 text-sky-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────

export default function OperationsPage() {
  const { network } = useNetwork();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const mountedRef = useRef(true);

  const fetchOperations = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const server = createHorizonServer();
      const response = await server.operations().order('desc').limit(50).call();
      const records = (response.records || []) as unknown as Operation[];
      if (!mountedRef.current) return;

      setOperations(records);
    } catch (err) {
      console.error('Failed to fetch operations:', err);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    setOperations([]);
    setCurrentPage(1);
    fetchOperations(false);

    return () => {
      mountedRef.current = false;
    };
  }, [network, fetchOperations]);

  // ─── Pagination ──────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(operations.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleOperations = operations.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[1400px] px-3 py-2 md:p-4">

        {/* Header: inline on mobile, card on desktop */}
        <div className="mb-2 md:mb-4 flex items-center gap-2 md:rounded-2xl md:border md:border-[var(--border-default)] md:bg-[var(--bg-secondary)] md:p-4">
          <Link
            href="/"
            className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg md:rounded-xl bg-sky-50 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400 transition hover:bg-sky-100 dark:hover:bg-sky-900/60 shrink-0"
          >
            <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="text-base md:text-xl font-bold text-[var(--text-primary)]">Operations</div>
            <div className="hidden md:block mt-1 text-xs text-[var(--text-tertiary)]">
              Latest operations on the Stellar network
            </div>
          </div>
          {/* Refresh button inline on mobile */}
          <div className="flex items-center gap-2 md:hidden">
            <span className="text-[10px] font-bold text-[var(--text-muted)]">{operations.length}</span>
            <button
              onClick={() => fetchOperations(true)}
              disabled={refreshing}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-900/40 border border-sky-200 dark:border-sky-800/50 text-sky-700 dark:text-sky-400 disabled:opacity-50 transition-colors"
            >
              <svg className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* All label + Refresh button — desktop only */}
        <div className="mb-4 hidden md:flex items-center gap-3">
          <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[var(--primary-blue)]/10 text-[var(--primary-blue)] text-[11px] font-bold">
            All
            <span className="ml-1.5 bg-[var(--primary-blue)]/20 text-[var(--primary-blue)] text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center">
              {operations.length}
            </span>
          </div>
          <button
            onClick={() => fetchOperations(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/40 border border-sky-200 dark:border-sky-800/50 text-sky-700 dark:text-sky-400 text-[11px] font-bold hover:bg-sky-100 dark:hover:bg-sky-900/60 disabled:opacity-50 transition-colors"
          >
            <svg className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Mobile: Compact list */}
        <div className="md:hidden">
          {loading ? (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] divide-y divide-[var(--border-subtle)]">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="px-3 py-2 flex items-center justify-between">
                  <div className="h-3.5 w-28 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                  <div className="h-3 w-16 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : visibleOperations.length > 0 ? (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] divide-y divide-[var(--border-subtle)]">
              {visibleOperations.map((op) => {
                const typeStyle = getTypeStyle(op.type);
                const amountInfo = getOperationAmount(op);

                return (
                  <Link
                    key={op.id}
                    href={txRoute(op.transaction_hash)}
                    className="px-3 py-2 active:bg-[var(--bg-tertiary)] transition-colors cursor-pointer block"
                  >
                    {/* Single row: Badge + Type + Amount + Time + Chevron */}
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[8px] font-bold shrink-0 ${typeStyle.bgColor} ${typeStyle.color}`}>
                        {typeStyle.label}
                      </span>
                      <span className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                        {getOperationTypeLabel(op)}
                      </span>
                      <span className="flex-1" />
                      {amountInfo && (
                        <span className="text-[11px] font-medium text-[var(--text-primary)] shrink-0">
                          {formatXLM(amountInfo.amount)} <span className="text-[var(--text-muted)] text-[10px]">{amountInfo.asset}</span>
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0">{timeAgo(op.created_at)}</span>
                      <svg className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--text-muted)] text-sm">No operations found.</div>
          )}

          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            loading={loading}
          />
        </div>

        {/* Desktop: Table layout */}
        <div className="hidden md:block rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full sc-table">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50">
                  <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">Type</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">Category</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">Source</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right whitespace-nowrap">Amount</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-center whitespace-nowrap">Status</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">Age</th>
                  <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-center whitespace-nowrap w-8">Tx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bg-primary)]">
                {loading ? (
                  Array.from({ length: 12 }).map((_, i) => (
                    <tr key={i} className="h-[44px]">
                      <td className="py-2.5 px-4"><div className="h-4 w-32 bg-[var(--bg-tertiary)] rounded animate-pulse" /></td>
                      <td className="py-2.5 px-3"><div className="h-5 w-16 bg-[var(--bg-tertiary)] rounded animate-pulse" /></td>
                      <td className="py-2.5 px-3"><div className="h-4 w-20 bg-[var(--bg-tertiary)] rounded animate-pulse" /></td>
                      <td className="py-2.5 px-3"><div className="h-4 w-16 bg-[var(--bg-tertiary)] rounded animate-pulse ml-auto" /></td>
                      <td className="py-2.5 px-3"><div className="h-4 w-14 bg-[var(--bg-tertiary)] rounded animate-pulse mx-auto" /></td>
                      <td className="py-2.5 px-3"><div className="h-4 w-12 bg-[var(--bg-tertiary)] rounded animate-pulse" /></td>
                      <td className="py-2.5 px-4"><div className="h-4 w-6 bg-[var(--bg-tertiary)] rounded animate-pulse mx-auto" /></td>
                    </tr>
                  ))
                ) : visibleOperations.length > 0 ? (
                  visibleOperations.map((op) => {
                    const typeStyle = getTypeStyle(op.type);
                    const amountInfo = getOperationAmount(op);

                    return (
                      <tr
                        key={op.id}
                        className="hover:bg-sky-50/30 dark:hover:bg-sky-900/10 transition-colors group cursor-pointer"
                        onClick={() => {
                          window.location.href = txRoute(op.transaction_hash);
                        }}
                      >
                        <td className="py-2.5 px-4">
                          <span className="text-[12px] font-medium text-[var(--text-primary)]">
                            {getOperationTypeLabel(op)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium ${typeStyle.bgColor} ${typeStyle.color}`}>
                            {typeStyle.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <Link
                            href={addressRoute(op.source_account)}
                            className="font-mono text-[12px] text-sky-600 hover:text-sky-700 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {shortenAddress(op.source_account)}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {amountInfo ? (
                            <div>
                              <span className="text-[12px] font-medium text-[var(--text-primary)]">
                                {formatXLM(amountInfo.amount)}
                              </span>
                              <span className="text-[11px] text-[var(--text-muted)] ml-1">
                                {amountInfo.asset}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[12px] text-[var(--text-muted)]">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {op.transaction_successful ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400">
                              Success
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium bg-rose-50 dark:bg-rose-900/40 border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-400">
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[12px] text-[var(--text-tertiary)] whitespace-nowrap">
                          {timeAgo(op.created_at)}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <Link
                            href={txRoute(op.transaction_hash)}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                            title={`View transaction ${op.transaction_hash.slice(0, 8)}...`}
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-[var(--text-muted)] text-sm">
                      No operations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
