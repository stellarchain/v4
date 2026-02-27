'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Horizon } from '@stellar/stellar-sdk';
import { shortenAddress, getOperationTransactionHash } from '@/lib/stellar';
import { createHorizonServer } from '@/services/horizon';
import { txRoute, addressRoute } from '@/lib/shared/routes';
import { useNetwork } from '@/contexts/NetworkContext';
type Effect = Horizon.ServerApi.EffectRecord;

const PAGE_SIZE = 25;

// ─── Helpers ────────────────────────────────────────────────

function getOperationIdFromEffect(effect: Effect): string | null {
  const id = effect.id || effect.paging_token;
  if (!id) return null;
  return String(id).split('-')[0] || null;
}

function getEffectTypeLabel(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getTypeStyle(type: string): { label: string; color: string; bgColor: string } {
  if (type.includes('credited')) {
    return { label: 'Credit', color: 'text-emerald-700 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800/50' };
  }
  if (type.includes('debited')) {
    return { label: 'Debit', color: 'text-rose-700 dark:text-rose-400', bgColor: 'bg-rose-50 dark:bg-rose-900/40 border-rose-200 dark:border-rose-800/50' };
  }
  if (type.includes('trade')) {
    return { label: 'Trade', color: 'text-violet-700 dark:text-violet-400', bgColor: 'bg-violet-50 dark:bg-violet-900/40 border-violet-200 dark:border-violet-800/50' };
  }
  if (type.includes('trustline_created') || type.includes('trustline_authorized')) {
    return { label: 'Trust', color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800/50' };
  }
  if (type.includes('trustline_removed') || type.includes('trustline_deauthorized')) {
    return { label: 'Untrust', color: 'text-orange-700 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-900/40 border-orange-200 dark:border-orange-800/50' };
  }
  if (type.includes('trustline')) {
    return { label: 'Trust', color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800/50' };
  }
  if (type.includes('account_created')) {
    return { label: 'Created', color: 'text-sky-700 dark:text-sky-400', bgColor: 'bg-sky-50 dark:bg-sky-900/40 border-sky-200 dark:border-sky-800/50' };
  }
  if (type.includes('account_removed')) {
    return { label: 'Removed', color: 'text-rose-700 dark:text-rose-400', bgColor: 'bg-rose-50 dark:bg-rose-900/40 border-rose-200 dark:border-rose-800/50' };
  }
  if (type.includes('signer')) {
    return { label: 'Signer', color: 'text-indigo-700 dark:text-indigo-400', bgColor: 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800/50' };
  }
  if (type.includes('data')) {
    return { label: 'Data', color: 'text-cyan-700 dark:text-cyan-400', bgColor: 'bg-cyan-50 dark:bg-cyan-900/40 border-cyan-200 dark:border-cyan-800/50' };
  }
  return { label: 'Effect', color: 'text-[var(--text-secondary)]', bgColor: 'bg-[var(--bg-primary)] border-transparent' };
}

const formatCompact = (numStr: string | undefined): string => {
  if (!numStr) return '0';
  const num = parseFloat(numStr);
  if (isNaN(num)) return '0';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
  return num.toLocaleString(undefined, { maximumFractionDigits: 7 });
};

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

function getEffectAmount(effect: Effect): { amount: string; asset: string } | null {
  const e = effect as unknown as Record<string, unknown>;
  if (e.amount) {
    const asset = (e.asset_code as string) || (e.asset_type === 'native' ? 'XLM' : '');
    return { amount: String(e.amount), asset };
  }
  if (e.starting_balance) {
    return { amount: String(e.starting_balance), asset: 'XLM' };
  }
  return null;
}

function getEffectDetail(effect: Effect): string | null {
  const e = effect as unknown as Record<string, unknown>;
  if (e.bought_amount && e.sold_amount) {
    const soldAsset = (e.sold_asset_code as string) || 'XLM';
    const boughtAsset = (e.bought_asset_code as string) || 'XLM';
    return `${soldAsset} → ${boughtAsset}`;
  }
  if (e.asset_code && !e.amount) {
    return String(e.asset_code);
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

export default function EffectsPage() {
  const { network } = useNetwork();
  const [effects, setEffects] = useState<Effect[]>([]);
  const [txHashes, setTxHashes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const resolvedOpsRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);

  // Resolve tx hashes — fetch all unique operation IDs in parallel, then map to effects
  const resolveHashes = useCallback(async (records: Effect[]) => {
    // Build map: opId -> effectIds[]
    const opToEffects = new Map<string, string[]>();
    for (const effect of records) {
      const opId = getOperationIdFromEffect(effect);
      if (opId && !resolvedOpsRef.current.has(opId)) {
        const list = opToEffects.get(opId) || [];
        list.push(effect.id);
        opToEffects.set(opId, list);
      }
    }
    if (opToEffects.size === 0) return;

    // Mark all as resolved to avoid duplicate work
    for (const opId of opToEffects.keys()) {
      resolvedOpsRef.current.add(opId);
    }

    // Fetch all unique operation IDs in parallel
    const results = await Promise.allSettled(
      Array.from(opToEffects.keys()).map(async (opId) => {
        const hash = await getOperationTransactionHash(opId);
        return { opId, hash };
      })
    );

    if (!mountedRef.current) return;

    const newHashes: Record<string, string> = {};
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.hash) {
        const effectIds = opToEffects.get(result.value.opId);
        if (effectIds) {
          for (const eid of effectIds) {
            newHashes[eid] = result.value.hash;
          }
        }
      }
    }

    if (Object.keys(newHashes).length > 0) {
      setTxHashes(prev => ({ ...prev, ...newHashes }));
    }
  }, []);

  // Fetch effects (used for both initial load and refresh)
  const fetchEffects = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const server = createHorizonServer();
      const response = await server.effects().order('desc').limit(50).call();
      const records = response.records as Effect[];
      if (!mountedRef.current) return;

      setEffects(records);
      if (isRefresh) {
        // On refresh, clear old hashes and re-resolve for visible page
        resolvedOpsRef.current = new Set();
        setTxHashes({});
      }
      resolveHashes(records.slice(0, PAGE_SIZE));
    } catch (err) {
      console.error('Failed to fetch effects:', err);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [resolveHashes]);

  // Initial load on mount / network change
  useEffect(() => {
    mountedRef.current = true;
    resolvedOpsRef.current = new Set();
    setEffects([]);
    setTxHashes({});
    setCurrentPage(1);
    fetchEffects(false);

    return () => {
      mountedRef.current = false;
    };
  }, [network, fetchEffects]);

  // ─── Pagination ──────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(effects.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleEffects = effects.slice(startIndex, startIndex + PAGE_SIZE);

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
            <div className="text-base md:text-xl font-bold text-[var(--text-primary)]">Effects</div>
            <div className="hidden md:block mt-1 text-xs text-[var(--text-tertiary)]">
              Latest effects on the Stellar network
            </div>
          </div>
          {/* Refresh button inline on mobile */}
          <div className="flex items-center gap-2 md:hidden">
            <span className="text-[10px] font-bold text-[var(--text-muted)]">{effects.length}</span>
            <button
              onClick={() => fetchEffects(true)}
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
              {effects.length}
            </span>
          </div>
          <button
            onClick={() => fetchEffects(true)}
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
          ) : visibleEffects.length > 0 ? (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] divide-y divide-[var(--border-subtle)]">
              {visibleEffects.map((effect) => {
                const typeStyle = getTypeStyle(effect.type);
                const amountInfo = getEffectAmount(effect);
                const txHash = txHashes[effect.id];

                return (
                  <div
                    key={effect.id}
                    className="px-3 py-2 active:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                    onClick={() => { if (txHash) window.location.href = txRoute(txHash); }}
                  >
                    {/* Single row: Badge + Type + Amount + Time + Chevron */}
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[8px] font-bold shrink-0 ${typeStyle.bgColor} ${typeStyle.color}`}>
                        {typeStyle.label}
                      </span>
                      <span className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                        {getEffectTypeLabel(effect.type)}
                      </span>
                      <span className="flex-1" />
                      {amountInfo && (
                        <span className="text-[11px] font-medium text-[var(--text-primary)] shrink-0">
                          {formatCompact(amountInfo.amount)} <span className="text-[var(--text-muted)] text-[10px]">{amountInfo.asset}</span>
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0">{timeAgo(effect.created_at)}</span>
                      {txHash ? (
                        <svg className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      ) : (
                        <div className="w-3 h-3 border-2 border-[var(--text-muted)]/30 border-t-[var(--text-muted)] rounded-full animate-spin shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--text-muted)] text-sm">No effects found.</div>
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
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">Account</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right whitespace-nowrap">Amount</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">Details</th>
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
                      <td className="py-2.5 px-3"><div className="h-4 w-14 bg-[var(--bg-tertiary)] rounded animate-pulse" /></td>
                      <td className="py-2.5 px-3"><div className="h-4 w-12 bg-[var(--bg-tertiary)] rounded animate-pulse" /></td>
                      <td className="py-2.5 px-4"><div className="h-4 w-6 bg-[var(--bg-tertiary)] rounded animate-pulse mx-auto" /></td>
                    </tr>
                  ))
                ) : visibleEffects.length > 0 ? (
                  visibleEffects.map((effect) => {
                    const typeStyle = getTypeStyle(effect.type);
                    const amountInfo = getEffectAmount(effect);
                    const detail = getEffectDetail(effect);
                    const txHash = txHashes[effect.id];

                    return (
                      <tr
                        key={effect.id}
                        className="hover:bg-sky-50/30 dark:hover:bg-sky-900/10 transition-colors group cursor-pointer"
                        onClick={() => {
                          if (txHash) window.location.href = txRoute(txHash);
                        }}
                      >
                        <td className="py-2.5 px-4">
                          <span className="text-[12px] font-medium text-[var(--text-primary)]">
                            {getEffectTypeLabel(effect.type)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium ${typeStyle.bgColor} ${typeStyle.color}`}>
                            {typeStyle.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <Link
                            href={addressRoute(effect.account)}
                            className="font-mono text-[12px] text-sky-600 hover:text-sky-700 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {shortenAddress(effect.account)}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {amountInfo ? (
                            <div>
                              <span className="text-[12px] font-medium text-[var(--text-primary)]">
                                {formatCompact(amountInfo.amount)}
                              </span>
                              <span className="text-[11px] text-[var(--text-muted)] ml-1">
                                {amountInfo.asset}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[12px] text-[var(--text-muted)]">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {detail ? (
                            <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                              {detail}
                            </span>
                          ) : (
                            <span className="text-[12px] text-[var(--text-muted)]">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[12px] text-[var(--text-tertiary)] whitespace-nowrap">
                          {timeAgo(effect.created_at)}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {txHash ? (
                            <Link
                              href={txRoute(txHash)}
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                              title={`View transaction ${txHash.slice(0, 8)}...`}
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                            </Link>
                          ) : (
                            <div className="w-4 h-4 border-2 border-[var(--text-muted)]/30 border-t-[var(--text-muted)] rounded-full animate-spin mx-auto" />
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-[var(--text-muted)] text-sm">
                      No effects found.
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
