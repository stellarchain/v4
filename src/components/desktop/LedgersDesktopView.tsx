'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Ledger, getBaseUrl, formatStroopsToXLM } from '@/lib/stellar';
import { useNetwork } from '@/contexts/NetworkContext';

interface LedgersDesktopViewProps {
  initialLedgers: Ledger[];
  limit?: number;
}

const PAGE_SIZE = 25;

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

// Pagination component
const PaginationControls = ({ currentPage, totalPages, onPageChange, loading, hasMore }: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading: boolean;
  hasMore: boolean;
}) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 px-5 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]/50">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || loading}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-muted)] hover:bg-sky-50 hover:border-sky-200 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-bold transition-all ${currentPage === pageNum
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-[var(--text-muted)] hover:bg-sky-50 hover:text-sky-700'
              }`}
          >
            {pageNum}
          </button>
        );
      })}

      {hasMore && totalPages > 5 && (
        <span className="text-[var(--text-muted)] text-xs px-1">...</span>
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={(currentPage >= totalPages && !hasMore) || loading}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-muted)] hover:bg-sky-50 hover:border-sky-200 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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

export default function LedgersDesktopView({
  initialLedgers,
  limit = 50
}: LedgersDesktopViewProps) {
  const { network } = useNetwork();

  // Initialize with server-provided data immediately (no loading state)
  const [ledgers, setLedgers] = useState<Ledger[]>(initialLedgers);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [oldestCursor, setOldestCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const seenIdsRef = useRef<Set<string>>(new Set(initialLedgers.map(l => l.id)));

  const fetchLedgers = useCallback(async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/ledgers?limit=15&order=desc`);
      const data = await res.json();
      const newLedgers: Ledger[] = data._embedded.records;

      // Filter to only new ledgers we haven't seen
      const unseenLedgers = newLedgers.filter(l => !seenIdsRef.current.has(l.id));

      if (unseenLedgers.length === 0) return;

      setLedgers(prevLedgers => {
        const existingMap = new Map(prevLedgers.map(l => [l.id, l]));

        unseenLedgers.forEach(l => {
          existingMap.set(l.id, l);
        });

        const merged = Array.from(existingMap.values())
          .sort((a, b) => b.sequence - a.sequence);

        seenIdsRef.current = new Set(merged.map(l => l.id));
        return merged;
      });
    } catch (error) {
      console.error('Failed to fetch ledgers:', error);
    }
  }, []);

  const fetchMoreIfNeeded = useCallback(async (targetPage: number) => {
    const neededItems = targetPage * PAGE_SIZE;
    if (neededItems <= ledgers.length || !hasMore || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      const sortedLedgers = [...ledgers].sort(
        (a, b) => a.sequence - b.sequence
      );
      const cursor = oldestCursor || sortedLedgers[0]?.paging_token;

      if (!cursor) {
        setIsLoadingMore(false);
        setHasMore(false);
        return;
      }

      const res = await fetch(
        `${getBaseUrl()}/ledgers?limit=${PAGE_SIZE}&order=desc&cursor=${cursor}`
      );
      const data = await res.json();
      const olderLedgers: Ledger[] = data._embedded.records;

      if (olderLedgers.length === 0) {
        setIsLoadingMore(false);
        setHasMore(false);
        return;
      }

      const oldestLedger = olderLedgers[olderLedgers.length - 1];
      setOldestCursor(oldestLedger.paging_token);
      setHasMore(olderLedgers.length >= PAGE_SIZE);

      // Filter out already seen ledgers
      const unseenLedgers = olderLedgers.filter(l => !seenIdsRef.current.has(l.id));

      setLedgers(prev => {
        const existingMap = new Map(prev.map(l => [l.id, l]));
        unseenLedgers.forEach(l => {
          if (!existingMap.has(l.id)) {
            existingMap.set(l.id, l);
          }
        });

        const merged = Array.from(existingMap.values())
          .sort((a, b) => b.sequence - a.sequence);

        seenIdsRef.current = new Set(merged.map(l => l.id));
        return merged;
      });
    } catch (error) {
      console.error('Failed to load more ledgers:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, ledgers, oldestCursor, hasMore]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
    fetchMoreIfNeeded(page);
  }, [fetchMoreIfNeeded]);

  useEffect(() => {
    // When network changes, reset to initial ledgers
    setLedgers(initialLedgers);
    seenIdsRef.current = new Set(initialLedgers.map(l => l.id));
  }, [network, initialLedgers]);

  useEffect(() => {
    // Start polling for new ledgers right away (data is already shown from server)
    const interval = setInterval(fetchLedgers, 6000);
    return () => clearInterval(interval);
  }, [fetchLedgers]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = ledgers.length;
    const totalTxs = ledgers.reduce((sum, l) => sum + l.successful_transaction_count + l.failed_transaction_count, 0);
    const totalOps = ledgers.reduce((sum, l) => sum + l.operation_count, 0);
    const successfulTxs = ledgers.reduce((sum, l) => sum + l.successful_transaction_count, 0);
    const failedTxs = ledgers.reduce((sum, l) => sum + l.failed_transaction_count, 0);

    // Calculate average close time from recent ledgers
    let avgCloseTime = 0;
    if (ledgers.length >= 2) {
      const times = ledgers.slice(0, 10).map(l => new Date(l.closed_at).getTime());
      const diffs: number[] = [];
      for (let i = 0; i < times.length - 1; i++) {
        diffs.push(Math.abs(times[i] - times[i + 1]) / 1000);
      }
      if (diffs.length > 0) {
        avgCloseTime = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      }
    }

    // Get latest ledger for total coins
    const latestLedger = ledgers[0];
    const totalCoins = latestLedger?.total_coins || '0';

    return { total, totalTxs, totalOps, successfulTxs, failedTxs, avgCloseTime, totalCoins };
  }, [ledgers]);

  // Calculate pagination
  const totalPages = Math.ceil(ledgers.length / PAGE_SIZE) + (hasMore ? 1 : 0);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleLedgers = ledgers.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
        {/* Header Card */}
        <div className="mb-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
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
                  <span className="bg-sky-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                    Live
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Real-time
                  </span>
                </div>
                <div className="text-xl font-bold text-[var(--text-primary)]">Ledgers</div>
                <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                  Browse all ledgers on the Stellar network
                </div>
              </div>
            </div>

            {/* Right: Quick Stats */}
            <div className="flex gap-3 flex-wrap">
              <div className="p-3 rounded-xl bg-[var(--bg-primary)]/70 border border-[var(--border-subtle)] min-w-[90px]">
                <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Loaded</div>
                <div className="text-lg font-bold text-[var(--text-primary)]">{stats.total}</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 min-w-[90px]">
                <div className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1">Transactions</div>
                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{stats.totalTxs.toLocaleString()}</div>
              </div>
              <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800/50 min-w-[90px]">
                <div className="text-[9px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-widest mb-1">Operations</div>
                <div className="text-lg font-bold text-sky-700 dark:text-sky-400">{stats.totalOps.toLocaleString()}</div>
              </div>
              <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800/50 min-w-[90px]">
                <div className="text-[9px] font-bold text-violet-700 dark:text-violet-400 uppercase tracking-widest mb-1">Avg Close</div>
                <div className="text-lg font-bold text-violet-700 dark:text-violet-400">{stats.avgCloseTime.toFixed(1)}s</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 min-w-[110px]">
                <div className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1">Total Coins</div>
                <div className="text-lg font-bold text-amber-700 dark:text-amber-400">{formatCompact(stats.totalCoins)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Ledgers Table */}
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
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
                {visibleLedgers.length > 0 ? (
                  visibleLedgers.map((ledger) => {
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
                    <td colSpan={7} className="text-center py-12 text-[var(--text-muted)] text-sm">
                      No ledgers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            loading={isLoadingMore}
            hasMore={hasMore}
          />
        </div>
      </div>
    </div>
  );
}
