'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Transaction,
  getTransactionDisplayInfo,
  Operation,
  normalizeTransactions,
  getTransactionOperations,
  getTransactions,
  getPayments,
} from '@/lib/stellar';
import { useNetwork } from '@/contexts/NetworkContext';
import GliderTabs from '@/components/ui/GliderTabs';

type FilterType = 'all' | 'transfers' | 'contracts';

interface TransactionPageClientProps {
  limit?: number;
}

const PAGE_SIZE = 25;

function TimeAgoLabel({ dateStr }: { dateStr: string }) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const seconds = Math.floor((nowMs - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return <>{seconds}s ago</>;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return <>{minutes}m ago</>;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return <>{hours}h ago</>;
  const days = Math.floor(hours / 24);
  return <>{days}d ago</>;
}

// Helper to fetch operations for a transaction (same as TransactionsDesktopView)
async function fetchTransactionWithOps(tx: Transaction): Promise<Transaction> {
  try {
    const opsResponse = await getTransactionOperations(tx.hash, 20);
    const operations = opsResponse.records || [];
    return {
      ...tx,
      displayInfo: getTransactionDisplayInfo(operations),
    };
  } catch {
    return {
      ...tx,
      displayInfo: { type: 'other' as const },
    };
  }
}

// Merge and dedupe transactions by hash, keeping newest first
function mergeTransactions(txs1: Transaction[], txs2: Transaction[]): Transaction[] {
  const txMap = new Map<string, Transaction>();
  [...txs1, ...txs2].forEach(tx => {
    const existing = txMap.get(tx.hash);
    if (!existing || (tx.displayInfo && !existing.displayInfo)) {
      txMap.set(tx.hash, tx);
    }
  });
  return Array.from(txMap.values())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export default function TransactionPageClient({
  limit = 25
}: TransactionPageClientProps) {
  const { network } = useNetwork();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isEnrichingData, setIsEnrichingData] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [oldestCursor, setOldestCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const enrichedIdsRef = useRef<Set<string>>(new Set());
  const latestCursorRef = useRef<string | null>(null);
  const isPollingRef = useRef(false);

  // Mobile infinite scroll state
  const [mobileLoadedCount, setMobileLoadedCount] = useState(PAGE_SIZE);
  const isLoadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const loadMoreRef = useRef<() => void>(() => {});
  const sentinelVisibleRef = useRef(false);
  const pollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutoLoadAtRef = useRef(0);

  // Poll for new transactions (same logic as TransactionsDesktopView)
  const fetchTransactions = useCallback(async () => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;

    try {
      // Simpler, desktop-like reliability: always poll latest page and merge unseen hashes.
      const txData = await getTransactions(30, 'desc');
      const newTransactions: Transaction[] = normalizeTransactions(txData.records || []);

      const unseenTxs = newTransactions.filter(tx => !seenIdsRef.current.has(tx.hash));
      const txsWithBasicInfo = unseenTxs.map(tx => ({
        ...tx,
        displayInfo: tx.displayInfo || { type: 'other' as const },
      }));

      // Payments tab needs immediate payment-typed items; otherwise new txs stay "other"
      // until later enrichment and won't appear in the payments filter.
      let paymentPollTxs: Transaction[] = [];
      if (filter === 'transfers') {
        const paymentsData = await getPayments(20, 'desc').catch(() => null);
        const paymentOps: Operation[] = paymentsData?.records || [];
        const paymentTxMap = new Map<string, Transaction>();

        for (const op of paymentOps) {
          const opAny = op as any;
          if (paymentTxMap.has(opAny.transaction_hash)) continue;
          if (seenIdsRef.current.has(opAny.transaction_hash)) continue;

          const displayInfo = getTransactionDisplayInfo([op]);
          if (displayInfo.type !== 'payment') continue;

          paymentTxMap.set(opAny.transaction_hash, {
            id: op.id,
            paging_token: op.paging_token,
            successful: opAny.transaction_successful,
            hash: opAny.transaction_hash,
            ledger: 0,
            ledger_attr: 0,
            created_at: op.created_at,
            source_account: op.source_account,
            source_account_sequence: '',
            fee_account: op.source_account,
            fee_charged: '0',
            max_fee: '0',
            operation_count: 1,
            envelope_xdr: '',
            result_xdr: '',
            result_meta_xdr: '',
            fee_meta_xdr: '',
            memo_type: 'none',
            signatures: [],
            displayInfo,
          } as Transaction);
        }

        paymentPollTxs = Array.from(paymentTxMap.values());
      }

      if (txsWithBasicInfo.length === 0 && paymentPollTxs.length === 0) return;

      setTransactions(prevTransactions => {
        const existingMap = new Map(prevTransactions.map(t => [t.hash, t]));

        [...txsWithBasicInfo, ...paymentPollTxs].forEach(tx => {
          const existing = existingMap.get(tx.hash);
          if (!existing || (tx.displayInfo && tx.displayInfo.type !== 'other' && existing.displayInfo?.type === 'other')) {
            existingMap.set(tx.hash, tx);
          }
        });

        const merged = Array.from(existingMap.values())
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        seenIdsRef.current = new Set(merged.map(t => t.hash));
        return merged;
      });
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      isPollingRef.current = false;
    }
  }, [filter]);

  // Load more (older) transactions for infinite scroll
  const loadMoreForMobile = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    // Check if we can show more from already fetched data
    const currentFilteredCount = transactions.filter(tx => {
      const type = tx.displayInfo?.type;
      if (filter === 'all') return true;
      if (filter === 'transfers') return type === 'payment';
      if (filter === 'contracts') return type === 'contract';
      return true;
    }).length;

    const nextCount = mobileLoadedCount + PAGE_SIZE;
    if (nextCount <= currentFilteredCount) {
      setMobileLoadedCount(nextCount);
      return;
    }

    setIsLoadingMore(true);

    try {
      const sortedTxs = [...transactions].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const cursor = oldestCursor || sortedTxs[0]?.paging_token;

      if (!cursor) {
        setIsLoadingMore(false);
        setHasMore(false);
        return;
      }

      // Same pagination/enrichment strategy as desktop for all filters.
      const data = await getTransactions(PAGE_SIZE, 'desc', cursor);
      const olderTransactions: Transaction[] = normalizeTransactions(data.records || []);

      if (olderTransactions.length === 0) {
        setIsLoadingMore(false);
        setHasMore(false);
        return;
      }

      const oldestTx = olderTransactions[olderTransactions.length - 1];
      setOldestCursor(oldestTx.paging_token);
      setHasMore(olderTransactions.length >= PAGE_SIZE);

      const unseenTxs = olderTransactions.filter(tx => !seenIdsRef.current.has(tx.hash));

      // Enrich in batches of 5 (same as desktop fetchMoreIfNeeded)
      const txsWithOps: Transaction[] = [];
      const batchSize = 5;
      for (let i = 0; i < unseenTxs.length; i += batchSize) {
        const batch = unseenTxs.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(fetchTransactionWithOps));
        txsWithOps.push(...batchResults);
      }

      // Mark all as enriched so lazy enrichment doesn't re-process them
      txsWithOps.forEach(tx => enrichedIdsRef.current.add(tx.hash));

      setTransactions(prev => {
        const existingMap = new Map(prev.map(t => [t.hash, t]));
        txsWithOps.forEach(tx => {
          if (!existingMap.has(tx.hash)) existingMap.set(tx.hash, tx);
        });
        const merged = Array.from(existingMap.values())
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        seenIdsRef.current = new Set(merged.map(t => t.hash));
        return merged;
      });

      setMobileLoadedCount(prev => prev + PAGE_SIZE);
    } catch (error) {
      console.error('Failed to load more transactions:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, mobileLoadedCount, transactions, oldestCursor, filter]);

  // Keep refs in sync for stable IntersectionObserver
  loadMoreRef.current = loadMoreForMobile;
  isLoadingMoreRef.current = isLoadingMore;
  hasMoreRef.current = hasMore;

  // Reset when filter changes
  useEffect(() => {
    setMobileLoadedCount(PAGE_SIZE);
  }, [filter]);

  // Stable IntersectionObserver (no deps on isLoadingMore/hasMore)
  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        sentinelVisibleRef.current = entry.isIntersecting;
        const now = Date.now();
        const canAutoLoad = now - lastAutoLoadAtRef.current > 100000;
        if (entry.isIntersecting && !isLoadingMoreRef.current && hasMoreRef.current && canAutoLoad) {
          lastAutoLoadAtRef.current = now;
          // Keep infinite-scroll mostly manual on mobile to avoid request flooding.
        }
      },
      { root: null, rootMargin: '100px', threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, []);

  // Initial data fetch (same as TransactionsDesktopView)
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsInitialLoading(true);
      setIsEnrichingData(true);
      try {
        const [txData, paymentsData] = await Promise.all([
          getTransactions(limit, 'desc'),
          getPayments(30, 'desc').catch(() => null),
        ]);
        const rawTransactions: Transaction[] = normalizeTransactions(txData.records || []);

        let paymentOps: Operation[] = [];
        if (paymentsData) {
          try { paymentOps = paymentsData.records || []; } catch { /* ignore */ }
        }

        // Convert payment ops to transactions with displayInfo
        const paymentTxMap = new Map<string, Transaction>();
        for (const op of paymentOps) {
          const opAny = op as any;
          if (paymentTxMap.has(opAny.transaction_hash)) continue;
          const displayInfo = getTransactionDisplayInfo([op]);
          paymentTxMap.set(opAny.transaction_hash, {
            id: op.id,
            paging_token: op.paging_token,
            successful: opAny.transaction_successful,
            hash: opAny.transaction_hash,
            ledger: 0,
            ledger_attr: 0,
            created_at: op.created_at,
            source_account: op.source_account,
            source_account_sequence: '',
            fee_account: op.source_account,
            fee_charged: '0',
            max_fee: '0',
            operation_count: 1,
            envelope_xdr: '',
            result_xdr: '',
            result_meta_xdr: '',
            fee_meta_xdr: '',
            memo_type: 'none',
            signatures: [],
            displayInfo,
          } as Transaction);
        }

        const allTxs = mergeTransactions(
          rawTransactions.map(tx => ({ ...tx, displayInfo: tx.displayInfo || { type: 'other' as const } })),
          Array.from(paymentTxMap.values())
        );

        if (rawTransactions.length > 0) {
          latestCursorRef.current = rawTransactions[0]?.paging_token || null;
          setOldestCursor(rawTransactions[rawTransactions.length - 1]?.paging_token || null);
        } else {
          latestCursorRef.current = null;
          setOldestCursor(null);
        }

        setTransactions(allTxs);
        seenIdsRef.current = new Set(allTxs.map(t => t.hash));
      } catch (error) {
        console.error('Failed to fetch initial transactions:', error);
      } finally {
        setIsInitialLoading(false);
        setIsEnrichingData(false);
      }
    };

    fetchInitialData();
  }, [network, limit]);

  // Visibility tracking for pausing polling
  useEffect(() => {
    const onVisibilityChange = () => setIsPageVisible(!document.hidden);
    onVisibilityChange();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  // Polling (3s, pause when hidden or enriching, avoid overlapping requests)
  useEffect(() => {
    if (isEnrichingData || !isPageVisible) {
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
      return;
    }

    let active = true;
    const tick = async () => {
      if (!active) return;
      await fetchTransactions();
      if (!active) return;
      pollingTimerRef.current = setTimeout(tick, 5000);
    };

    pollingTimerRef.current = setTimeout(tick, 5000);

    return () => {
      active = false;
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [fetchTransactions, isEnrichingData, isPageVisible]);

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    const type = tx.displayInfo?.type;
    if (filter === 'all') return true;
    if (filter === 'transfers') return type === 'payment';
    if (filter === 'contracts') return type === 'contract';
    return true;
  });

  // Mobile infinite scroll visible slice
  const mobileVisibleTransactions = filteredTransactions.slice(0, mobileLoadedCount);
  const mobileHasMore = hasMore || mobileLoadedCount < filteredTransactions.length;

  // Enrichment: process only visible 'other' transactions to reduce request volume.
  // Uses a ref to prevent concurrent runs. Processes in batches of 3 with 1s delay between.
  const isEnrichingRef = useRef(false);
  const enrichTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Skip if already running
    if (isEnrichingRef.current) return;

    const candidates = mobileVisibleTransactions.filter(tx =>
      (!tx.displayInfo || tx.displayInfo.type === 'other') &&
      !enrichedIdsRef.current.has(tx.hash)
    );

    if (candidates.length === 0) return;

    isEnrichingRef.current = true;
    let mounted = true;

    const runEnrichment = async () => {
      const BATCH_SIZE = 3;
      const allCandidates = [...candidates];

      for (let i = 0; i < allCandidates.length; i += BATCH_SIZE) {
        if (!mounted) break;

        const batch = allCandidates.slice(i, i + BATCH_SIZE);
        batch.forEach(tx => enrichedIdsRef.current.add(tx.hash));

        const batchResults = await Promise.all(batch.map(fetchTransactionWithOps));
        if (!mounted) break;

        setTransactions(prev => prev.map(t => {
          const enriched = batchResults.find(r => r.hash === t.hash);
          return enriched ? enriched : t;
        }));

        // Wait 1s between batches to let the frontend breathe
        if (i + BATCH_SIZE < allCandidates.length) {
          await new Promise(resolve => {
            enrichTimerRef.current = setTimeout(resolve, 1000);
          });
        }
      }

      isEnrichingRef.current = false;
    };

    runEnrichment();

    return () => {
      mounted = false;
      isEnrichingRef.current = false;
      if (enrichTimerRef.current) clearTimeout(enrichTimerRef.current);
    };
  }, [mobileVisibleTransactions]);

  const formatCompact = (numStr: string | undefined): string => {
    if (!numStr) return '0';
    const num = parseFloat(numStr);
    if (isNaN(num)) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-20 pt-1">
      <div className="max-w-[1400px] mx-auto px-3">
        <div className="flex flex-col bg-[var(--bg-primary)] overflow-hidden">
          {/* Mobile Glider Tabs */}
          <div className="mb-2">
            <GliderTabs
              tabs={[
                { id: 'all', label: 'All Activity' },
                { id: 'transfers', label: 'Payments' },
                { id: 'contracts', label: 'Contracts' },
              ]}
              activeId={filter}
              onChange={(id) => setFilter(id as FilterType)}
            />
          </div>

          {/* Mobile Card List with infinite scroll */}
          <div className="flex-1 overflow-auto">
            {isInitialLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-3 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
                        <div className="flex flex-col gap-1.5">
                          <div className="h-4 w-20 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                          <div className="h-3 w-28 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                        </div>
                      </div>
                      <div className="h-4 w-16 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : mobileVisibleTransactions.length > 0 ? (
              <div className="space-y-2">
                {mobileVisibleTransactions.map((tx) => {
                  const info = tx.displayInfo;
                  const functionName = info?.functionName || 'Contract Call';

                  return (
                    <a
                      key={tx.hash}
                      href={`/transaction/${tx.hash}`}
                      className="block bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] active:bg-[var(--bg-tertiary)] transition-colors"
                    >
                      <div className="px-3 py-3 flex items-center justify-between">
                        {/* Left Side: Icon & Title/Meta */}
                        <div className="flex items-start space-x-3">
                          <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${tx.successful
                            ? 'bg-[var(--success)]/10 text-[var(--success)]'
                            : 'bg-[var(--error)]/10 text-[var(--error)]'
                            }`}>
                            {tx.successful ? (
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </div>

                          <div className="flex flex-col">
                            <span className="text-sm font-bold leading-tight capitalize text-[var(--primary-blue)]">
                              {info?.type === 'contract'
                                ? (functionName)
                                : info?.type === 'payment'
                                  ? 'Payment'
                                  : 'Transaction'}
                            </span>
                            <span className="text-xs text-[var(--text-muted)] font-medium font-mono mt-0.5 flex items-center">
                              {tx.hash.substring(0, 4)}...{tx.hash.substring(tx.hash.length - 4)}
                              <span className="mx-1 text-[var(--text-muted)]">•</span>
                              <TimeAgoLabel dateStr={tx.created_at} />
                            </span>
                          </div>
                        </div>

                        {/* Right Side: Amount or Label */}
                        <div className="text-right">
                          {(info?.type === 'payment' && info.amount) || (info?.type === 'contract' && info.effectAmount) ? (
                            <span className={`text-xs font-bold ${info?.effectType === 'received' || info?.type === 'payment'
                              ? 'text-[var(--success)]'
                              : 'text-[var(--text-primary)]'
                              }`}>
                              {info?.effectType === 'received' || info?.type === 'payment' ? '+' : ''}
                              {formatCompact(info?.amount || info?.effectAmount)} {info?.asset || info?.effectAsset}
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold tracking-wider uppercase text-[var(--primary-blue)]">
                              {info?.type === 'contract' ? (functionName) : 'Details'}
                            </span>
                          )}
                        </div>
                      </div>
                    </a>
                  );
                })}

                {/* Sentinel for IntersectionObserver */}
                <div ref={sentinelRef} className="h-1" />

                {/* Loading Spinner */}
                {isLoadingMore && (
                  <div className="flex justify-center py-4">
                    <svg className="w-6 h-6 animate-spin text-[var(--text-primary)]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                )}

                {/* Load More Button (fallback) */}
                {!isLoadingMore && mobileHasMore && (
                  <div className="py-4">
                    <button
                      onClick={loadMoreForMobile}
                      className="w-full py-3 rounded-xl bg-[var(--bg-secondary)] shadow-sm border border-[var(--border-subtle)] text-sm font-semibold transition-colors hover:bg-[var(--bg-tertiary)] active:bg-[var(--bg-hover)] text-[var(--text-primary)]"
                    >
                      Load More
                    </button>
                  </div>
                )}

                {/* No More Items */}
                {!isLoadingMore && !mobileHasMore && mobileVisibleTransactions.length > 0 && (
                  <div className="py-4 text-center text-[var(--text-muted)] text-sm">
                    No more transactions
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-4 text-center text-[var(--text-muted)] italic text-sm">
                No transactions found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
