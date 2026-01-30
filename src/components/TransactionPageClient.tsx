'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import CompactTransactionRow from './CompactTransactionRow';
import { Transaction, getTransactionDisplayInfo, Operation, getTransactionOperations, getBaseUrl, getNetwork } from '@/lib/stellar';
import { containers, interactive, spacing } from '@/lib/design-system';
import { useNetwork } from '@/contexts/NetworkContext';

type FilterType = 'all' | 'transfers' | 'contracts';

// Custom hook to detect mobile viewport
function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check initial value
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint);
    checkMobile();

    // Listen for resize events
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}

interface TransactionPageClientProps {
  initialTransactions: Transaction[];
  initialPaymentTransactions?: Transaction[];
  limit?: number;
}

// How many to show per page
const PAGE_SIZE = 25;

// Merge and dedupe transactions by hash, keeping newest first
function mergeTransactions(txs1: Transaction[], txs2: Transaction[]): Transaction[] {
  const txMap = new Map<string, Transaction>();

  // Add all transactions, later ones overwrite earlier (both have displayInfo)
  [...txs1, ...txs2].forEach(tx => {
    // Use hash as the unique key to properly dedupe
    const existing = txMap.get(tx.hash);
    // Prefer transaction with displayInfo, or the newer one
    if (!existing || (tx.displayInfo && !existing.displayInfo)) {
      txMap.set(tx.hash, tx);
    }
  });

  // Sort by created_at (newest first)
  return Array.from(txMap.values())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export default function TransactionPageClient({
  initialTransactions,
  initialPaymentTransactions = [],
  limit = 25
}: TransactionPageClientProps) {
  // Merge initial transactions with payment transactions
  const mergedInitial = mergeTransactions(initialTransactions, initialPaymentTransactions);
  const { network } = useNetwork();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [oldestCursor, setOldestCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const seenIdsRef = useRef<Set<string>>(new Set());
  const animatedIdsRef = useRef<Set<string>>(new Set());
  const processedIdsRef = useRef<Set<string>>(new Set());

  // Mobile infinite scroll state
  const [mobileLoadedCount, setMobileLoadedCount] = useState(PAGE_SIZE);
  const isMobile = useIsMobile();

  // Note: We no longer fetch operations for each transaction to prevent API rate limiting
  // The transaction list view uses minimal data from the transaction itself
  // Full operation details are only fetched on the individual transaction detail page

  // Convert payment operations to Transaction format with displayInfo
  const convertPaymentsToTransactions = useCallback((operations: Operation[]): Transaction[] => {
    const txMap = new Map<string, Transaction>();

    for (const op of operations) {
      if (txMap.has(op.transaction_hash)) continue;

      const displayInfo = getTransactionDisplayInfo([op]);

      txMap.set(op.transaction_hash, {
        id: op.id,
        paging_token: op.paging_token,
        successful: op.transaction_successful,
        hash: op.transaction_hash,
        ledger: 0,
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
      });
    }

    return Array.from(txMap.values());
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      // Fetch regular transactions (required)
      const txRes = await fetch(`${getBaseUrl()}/transactions?limit=${limit}&order=desc`);
      const txData = await txRes.json();
      const newTransactions: Transaction[] = txData._embedded.records;

      // Fetch payments separately (optional - don't fail if this errors)
      let paymentOps: Operation[] = [];
      try {
        const paymentsRes = await fetch(`${getBaseUrl()}/payments?limit=30&order=desc`);
        if (paymentsRes.ok) {
          const paymentsData = await paymentsRes.json();
          paymentOps = paymentsData._embedded?.records || [];
        }
      } catch {
        // Silently ignore payment fetch errors
      }

      // Convert payment operations to transactions
      const paymentTransactions = convertPaymentsToTransactions(paymentOps);

      // Combine all new transactions
      const allNewTransactions = [...newTransactions, ...paymentTransactions];
      const newHashes = allNewTransactions.filter(t => !seenIdsRef.current.has(t.hash)).map(t => t.hash);

      // Process transactions - use payment displayInfo or generate minimal displayInfo
      const transactionsWithOps = allNewTransactions.map((tx) => {
        // Payment transactions already have displayInfo
        if (tx.displayInfo) {
          return tx;
        }
        // For other transactions, generate minimal displayInfo without fetching operations
        return {
          ...tx,
          displayInfo: getTransactionDisplayInfo([]),
        };
      });

      setTransactions(prevTransactions => {
        // Merge new transactions with existing ones, keeping unique by hash
        const existingMap = new Map(prevTransactions.map(t => [t.hash, t]));

        // Add/update with new transactions (prefer ones with displayInfo)
        transactionsWithOps.forEach(tx => {
          const existing = existingMap.get(tx.hash);
          if (!existing || (tx.displayInfo && !existing.displayInfo)) {
            existingMap.set(tx.hash, tx);
          }
        });

        // Convert back to array and sort by created_at (newest first)
        const merged = Array.from(existingMap.values())
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Track which are truly new (never animated before)
        const newHashes = transactionsWithOps
          .filter(t => !animatedIdsRef.current.has(t.hash))
          .map(t => t.hash);

        // Update seen hashes
        seenIdsRef.current = new Set(merged.map(t => t.hash));

        // Animate only brand new transactions after render
        if (newHashes.length > 0) {
          requestAnimationFrame(() => {
            let delay = 0;
            newHashes.forEach((hash) => {
              const el = rowRefs.current.get(hash);
              if (el && !animatedIdsRef.current.has(hash)) {
                animatedIdsRef.current.add(hash);
                gsap.fromTo(el,
                  { opacity: 0, x: -20 },
                  { opacity: 1, x: 0, duration: 0.3, delay, ease: 'power2.out' }
                );
                delay += 0.05;
              }
            });
          });
        }

        return merged;
      });
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  }, [limit, convertPaymentsToTransactions]);

  // Fetch more transactions when navigating to pages that need it
  const fetchMoreIfNeeded = useCallback(async (targetPage: number) => {
    const neededItems = targetPage * PAGE_SIZE;
    if (neededItems <= transactions.length || !hasMore || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      // Get the oldest transaction we have for cursor
      const sortedTxs = [...transactions].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const cursor = oldestCursor || sortedTxs[0]?.paging_token;

      if (!cursor) {
        setIsLoadingMore(false);
        setHasMore(false);
        return;
      }

      // Fetch older transactions
      const res = await fetch(
        `${getBaseUrl()}/transactions?limit=${PAGE_SIZE}&order=desc&cursor=${cursor}`
      );
      const data = await res.json();
      const olderTransactions: Transaction[] = data._embedded.records;

      if (olderTransactions.length === 0) {
        setIsLoadingMore(false);
        setHasMore(false);
        return;
      }

      // Update oldest cursor for next load
      const oldestTx = olderTransactions[olderTransactions.length - 1];
      setOldestCursor(oldestTx.paging_token);
      setHasMore(olderTransactions.length >= PAGE_SIZE);

      // Process older transactions with minimal displayInfo (no operation fetching)
      const txsWithOps = olderTransactions.map((tx) => {
        if (seenIdsRef.current.has(tx.hash)) {
          return null; // Skip if we already have this
        }
        return {
          ...tx,
          displayInfo: getTransactionDisplayInfo([]),
        };
      });

      const validTxs = txsWithOps.filter(tx => tx !== null) as Transaction[];

      setTransactions(prev => {
        const existingMap = new Map(prev.map(t => [t.hash, t]));
        validTxs.forEach(tx => {
          if (!existingMap.has(tx.hash)) {
            existingMap.set(tx.hash, tx);
          }
        });

        const merged = Array.from(existingMap.values())
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        seenIdsRef.current = new Set(merged.map(t => t.hash));
        return merged;
      });
    } catch (error) {
      console.error('Failed to load more transactions:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, transactions, oldestCursor, hasMore]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
    fetchMoreIfNeeded(page);
  }, [fetchMoreIfNeeded]);

  // Mobile infinite scroll: load more transactions
  const loadMoreForMobile = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    // Compute filtered count inline to avoid dependency on filteredTransactions
    const currentFilteredCount = transactions.filter(tx => {
      const type = tx.displayInfo?.type;
      if (filter === 'all') return true;
      if (filter === 'transfers') return type === 'payment';
      if (filter === 'contracts') return type === 'contract';
      return true;
    }).length;

    // Check if we need to fetch more from server
    const nextCount = mobileLoadedCount + PAGE_SIZE;

    // First, try to show more from already fetched transactions
    if (nextCount <= currentFilteredCount) {
      setMobileLoadedCount(nextCount);
      return;
    }

    // Need to fetch more from server
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

      const res = await fetch(
        `${getBaseUrl()}/transactions?limit=${PAGE_SIZE}&order=desc&cursor=${cursor}`
      );
      const data = await res.json();
      const olderTransactions: Transaction[] = data._embedded.records;

      if (olderTransactions.length === 0) {
        setIsLoadingMore(false);
        setHasMore(false);
        return;
      }

      const oldestTx = olderTransactions[olderTransactions.length - 1];
      setOldestCursor(oldestTx.paging_token);
      setHasMore(olderTransactions.length >= PAGE_SIZE);

      const txsWithOps = olderTransactions.map((tx) => {
        if (seenIdsRef.current.has(tx.hash)) {
          return null;
        }
        return {
          ...tx,
          displayInfo: getTransactionDisplayInfo([]),
        };
      });

      const validTxs = txsWithOps.filter(tx => tx !== null) as Transaction[];

      setTransactions(prev => {
        const existingMap = new Map(prev.map(t => [t.hash, t]));
        validTxs.forEach(tx => {
          if (!existingMap.has(tx.hash)) {
            existingMap.set(tx.hash, tx);
          }
        });

        const merged = Array.from(existingMap.values())
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        seenIdsRef.current = new Set(merged.map(t => t.hash));
        return merged;
      });

      // Increase the loaded count after fetching
      setMobileLoadedCount(prev => prev + PAGE_SIZE);
    } catch (error) {
      console.error('Failed to load more transactions:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, mobileLoadedCount, transactions, oldestCursor, filter]);

  // Reset page and mobile loaded count when filter changes
  useEffect(() => {
    setCurrentPage(1);
    setMobileLoadedCount(PAGE_SIZE);
  }, [filter]);

  // Mobile infinite scroll: IntersectionObserver
  useEffect(() => {
    if (!isMobile || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !isLoadingMore && hasMore) {
          loadMoreForMobile();
        }
      },
      {
        root: null, // viewport
        rootMargin: '100px', // trigger 100px before reaching the bottom
        threshold: 0.1,
      }
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [isMobile, isLoadingMore, hasMore, loadMoreForMobile]);

  // Fetch fresh data on mount to ensure we have correct network data
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsInitialLoading(true);
      try {
        // Fetch fresh transactions from current network
        const txRes = await fetch(`${getBaseUrl()}/transactions?limit=${limit}&order=desc`);
        const txData = await txRes.json();
        const newTransactions: Transaction[] = txData._embedded.records;

        // Process with minimal displayInfo
        const txsWithOps = newTransactions.map((tx) => ({
          ...tx,
          displayInfo: getTransactionDisplayInfo([]),
        }));

        setTransactions(txsWithOps);
        seenIdsRef.current = new Set(txsWithOps.map(t => t.hash));
        animatedIdsRef.current = new Set(txsWithOps.map(t => t.hash));
      } catch (error) {
        console.error('Failed to fetch initial transactions:', error);
        // Fallback to server data if fetch fails
        const txsWithOps = mergedInitial.map((tx) => ({
          ...tx,
          displayInfo: tx.displayInfo || getTransactionDisplayInfo([]),
        }));
        setTransactions(txsWithOps);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchInitialData();
  }, [network]); // Re-fetch when network changes

  useEffect(() => {
    if (isInitialLoading) return; // Don't start polling until initial load is done
    const interval = setInterval(fetchTransactions, 2000);
    return () => clearInterval(interval);
  }, [fetchTransactions, isInitialLoading]);

  const setRowRef = useCallback((hash: string) => (el: HTMLAnchorElement | null) => {
    if (el) {
      rowRefs.current.set(hash, el);
    } else {
      rowRefs.current.delete(hash);
    }
  }, []);

  // Filter transactions based on selected filter
  const filteredTransactions = transactions.filter(tx => {
    const type = tx.displayInfo?.type;
    if (filter === 'all') return true;
    // Payments = only actual payment/transfer transactions
    if (filter === 'transfers') return type === 'payment';
    // Contracts = only smart contract invocations
    if (filter === 'contracts') return type === 'contract';
    return true;
  });

  // Calculate pagination for desktop
  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE) + (hasMore ? 1 : 0);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleTransactions = filteredTransactions.slice(startIndex, startIndex + PAGE_SIZE);

  // Calculate visible transactions for mobile (infinite scroll)
  const mobileVisibleTransactions = filteredTransactions.slice(0, mobileLoadedCount);
  const mobileHasMore = hasMore || mobileLoadedCount < filteredTransactions.length;

  // Effect to progressively fetch details for visible transactions labeled as 'other' / 'unknown'
  // This ensures we can properly identify Smart Contracts functions
  useEffect(() => {
    let mounted = true;

    // Check if we need to enrich any visible transactions
    const candidates = visibleTransactions.filter(tx =>
      (tx.displayInfo?.type === 'other' || !tx.displayInfo) &&
      !processedIdsRef.current.has(tx.hash)
    );

    if (candidates.length === 0) return;

    const enrichTransactions = async () => {
      // Process sequentially to be gentle on rate limits
      for (const tx of candidates) {
        if (!mounted) break;
        processedIdsRef.current.add(tx.hash);

        try {
          // Fetches operations to determine if it's a contract call and what function
          const opRes = await getTransactionOperations(tx.hash, 5);
          const ops = opRes._embedded.records;

          if (ops && ops.length > 0) {
            const info = getTransactionDisplayInfo(ops);

            // If we found a contract transaction, also fetch effects to get the received/sent amount
            if (info.type === 'contract') {
              try {
                const effectsRes = await fetch(`${getBaseUrl()}/transactions/${tx.hash}/effects?limit=10`);
                const effectsData = await effectsRes.json();
                const effects = effectsData._embedded?.records || [];

                // Look for credit/debit effects
                const credit = effects.find((e: { type: string; amount?: string }) => e.type === 'account_credited' && e.amount);
                const debit = effects.find((e: { type: string; amount?: string }) => e.type === 'account_debited' && e.amount);

                if (credit) {
                  info.effectType = 'received';
                  info.effectAmount = credit.amount;
                  info.effectAsset = credit.asset_code || (credit.asset_type === 'native' ? 'XLM' : 'Unknown');
                } else if (debit) {
                  info.effectType = 'sent';
                  info.effectAmount = debit.amount;
                  info.effectAsset = debit.asset_code || (debit.asset_type === 'native' ? 'XLM' : 'Unknown');
                }
              } catch {
                // Ignore effects fetch errors
              }
            }

            // If we found something interesting (not 'other'), update the state
            if (info.type !== 'other') {
              setTransactions(prev => prev.map(t =>
                t.hash === tx.hash ? { ...t, displayInfo: info } : t
              ));
            }
          }

          // Small delay between requests to avoid hitting rate limits too hard but fast enough for UI
          await new Promise(r => setTimeout(r, 50));
        } catch (e) {
          // Ignore errors, we just keep default display
        }
      }
    };

    enrichTransactions();

    return () => { mounted = false; };
  }, [visibleTransactions]);

  // Helper for type styling
  const getTypeStyle = (info: any) => {
    const type = info?.type || 'other';
    if (type === 'payment') return { color: 'text-[var(--accent-orange)]', bg: 'bg-[var(--accent-orange)]', label: 'PAYMENT' };
    if (type === 'contract') return { color: 'text-[var(--accent-purple)]', bg: 'bg-[var(--accent-purple)]', label: 'CONTRACT CALL' };
    if (type === 'swap') return { color: 'text-[var(--accent-blue)]', bg: 'bg-[var(--accent-blue)]', label: 'SWAP' };
    return { color: 'text-[var(--text-primary)]', bg: 'bg-[var(--text-muted)]', label: 'TRANSACTION' };
  };

  const formatCompact = (numStr: string | undefined): string => {
    if (!numStr) return '0';
    const num = parseFloat(numStr);
    if (isNaN(num)) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const primaryColor = 'var(--text-primary)';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-20 pt-1 md:pt-6">
      <div className="max-w-[1600px] mx-auto px-3 md:px-6">
        <div className="flex flex-col bg-[var(--bg-primary)] md:bg-[var(--bg-secondary)] md:rounded-xl md:shadow-[var(--shadow-md)] overflow-hidden">
          {/* Header & Tabs */}
          <div className="flex flex-col flex-shrink-0">
            {/* Header - Hidden on mobile */}
            <div className="hidden md:flex p-3 md:p-4 border-b border-[var(--border-subtle)] items-center justify-between bg-[var(--bg-primary)] md:bg-[var(--bg-tertiary)]">
              <h3 className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Transactions
              </h3>
            </div>
            {/* Mobile Glider Tabs */}
            <div className="md:hidden mb-2">
              {(() => {
                const filterTabs = [
                  { id: 'all', label: 'All Activity' },
                  { id: 'transfers', label: 'Payments' },
                  { id: 'contracts', label: 'Contracts' },
                ];
                const activeTabIndex = filterTabs.findIndex(tab => tab.id === filter);
                const tabCount = filterTabs.length;

                return (
                  <div className="relative flex items-center bg-[var(--bg-secondary)] p-1 rounded-xl shadow-sm border border-[var(--border-subtle)]">
                    {/* Glider Background */}
                    <div
                      className="absolute top-1 bottom-1 bg-[var(--primary-blue)]/10 rounded-lg transition-all duration-300 ease-out z-0"
                      style={{
                        left: '4px',
                        width: `calc((100% - 8px) / ${tabCount})`,
                        transform: `translateX(${activeTabIndex >= 0 ? activeTabIndex * 100 : 0}%)`,
                        opacity: activeTabIndex >= 0 ? 1 : 0
                      }}
                    />

                    {filterTabs.map((tab) => {
                      const isActive = filter === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setFilter(tab.id as FilterType)}
                          className={`relative z-10 flex-1 py-1.5 text-[11px] rounded-lg transition-colors duration-200 text-center ${
                            isActive
                              ? 'text-[var(--primary-blue)] font-bold'
                              : 'text-[var(--text-secondary)] font-semibold hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Desktop Tabs */}
            <div className="hidden md:flex px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] items-center gap-2 overflow-x-auto scrollbar-hide">
              {['all', 'transfers', 'contracts'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab as FilterType)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-tighter whitespace-nowrap transition-colors ${filter === tab
                    ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] shadow-sm border border-[var(--border-subtle)]'
                    }`}
                >
                  {tab === 'all' ? 'All Activity' : tab === 'transfers' ? 'Payments' : 'Smart Contracts'}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Table - Hidden on mobile */}
          <div className="hidden md:block flex-1 overflow-auto" ref={containerRef}>
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[var(--bg-secondary)] text-[11px] text-[var(--text-muted)] uppercase font-bold tracking-wider z-20 shadow-sm">
                <tr>
                  <th className="px-4 py-3 border-b border-[var(--border-subtle)]">Time</th>
                  <th className="px-4 py-3 border-b border-[var(--border-subtle)]">Type</th>
                  <th className="px-4 py-3 border-b border-[var(--border-subtle)]">Detail / Amount</th>
                  <th className="px-4 py-3 border-b border-[var(--border-subtle)]">Hash</th>
                </tr>
              </thead>
              <tbody className="text-[12px] font-mono divide-y divide-[var(--border-subtle)]">
                {isInitialLoading ? (
                  // Desktop skeleton
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="h-[52px]">
                      <td className="px-4 py-3"><div className="h-4 w-16 bg-[var(--bg-tertiary)] rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-24 bg-[var(--bg-tertiary)] rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-32 bg-[var(--bg-tertiary)] rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-28 bg-[var(--bg-tertiary)] rounded animate-pulse" /></td>
                    </tr>
                  ))
                ) : visibleTransactions.length > 0 ? (
                  visibleTransactions.map((tx) => {
                    const info = tx.displayInfo;
                    const style = getTypeStyle(info);
                    const functionName = info?.functionName || 'Contract Call';

                    return (
                      <tr key={tx.hash} className="hover:bg-[var(--bg-hover)] transition-colors group h-[52px]">
                        <td className="px-4 py-3 text-[var(--text-muted)] whitespace-nowrap align-middle">
                          {new Date(tx.created_at).toLocaleTimeString([], { hour12: false })}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${style.bg}`}></span>
                            <span className="font-bold text-[var(--text-primary)]">
                              {style.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="h-6 flex items-center">
                            {info?.type === 'payment' ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[var(--accent-orange)] font-bold">
                                  {formatCompact(info.amount)}
                                </span>
                                <span className="text-[var(--text-tertiary)]">{info.asset || 'XLM'}</span>
                              </div>
                            ) : info?.type === 'contract' ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[var(--accent-purple)] font-bold">{functionName}</span>
                                {info.effectAmount && (
                                  <span className={`text-[11px] px-1.5 py-0.5 rounded ${info.effectType === 'received' ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                                    }`}>
                                    {info.effectType === 'received' ? '+' : '-'}{formatCompact(info.effectAmount)} {info.effectAsset}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[var(--text-muted)] italic">View details</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-tertiary)] align-middle">
                          <a href={`/transaction/${tx.hash}`} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline truncate block w-32">
                            {tx.hash.substring(0, 8)}...{tx.hash.substring(tx.hash.length - 8)}
                          </a>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-[var(--text-muted)] italic">
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List - Visible only on mobile with infinite scroll */}
          <div className="md:hidden flex-1 overflow-auto" ref={mobileContainerRef}>
            {isInitialLoading ? (
              // Mobile skeleton
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

                  // Helper for time ago
                  const getTimeAgo = (dateStr: string) => {
                    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
                    if (seconds < 60) return `${seconds}s ago`;
                    const minutes = Math.floor(seconds / 60);
                    if (minutes < 60) return `${minutes}m ago`;
                    const hours = Math.floor(minutes / 60);
                    if (hours < 24) return `${hours}h ago`;
                    const days = Math.floor(hours / 24);
                    return `${days}d ago`;
                  };

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
                              {getTimeAgo(tx.created_at)}
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

                {/* Mobile Infinite Scroll: Sentinel element for IntersectionObserver */}
                <div ref={sentinelRef} className="h-1" />

                {/* Mobile Loading Spinner */}
                {isLoadingMore && (
                  <div className="flex justify-center py-4">
                    <svg className="w-6 h-6 animate-spin text-[var(--text-primary)]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                )}

                {/* Mobile Load More Button (fallback) */}
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

                {/* Mobile No More Items Message */}
                {!isLoadingMore && !mobileHasMore && mobileVisibleTransactions.length > 0 && (
                  <div className="py-4 text-center text-[var(--text-muted)] text-sm">
                    No more transactions
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-12 text-center text-[var(--text-muted)] italic text-sm">
                No transactions found
              </div>
            )}
          </div>

          {/* Footer / Pagination - Desktop only */}
          {totalPages > 1 && (
            <div className="hidden md:block py-4 px-3 bg-[var(--bg-primary)] md:bg-[var(--bg-tertiary)] md:p-3 md:border-t md:border-[var(--border-subtle)]">
              <div className="flex items-center justify-center gap-1">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1 || isLoadingMore}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] shadow-sm text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                      onClick={() => goToPage(pageNum)}
                      disabled={isLoadingMore}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                        currentPage === pageNum
                          ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-sm'
                          : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]'
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
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={(currentPage >= totalPages && !hasMore) || isLoadingMore}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] shadow-sm text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {isLoadingMore && (
                  <svg className="w-4 h-4 animate-spin ml-2 text-[var(--text-primary)]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
