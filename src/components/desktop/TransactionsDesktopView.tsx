'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Transaction, getTransactionDisplayInfo, Operation, getBaseUrl, shortenAddress, getTransactionOperations } from '@/lib/stellar';
import { useNetwork } from '@/contexts/NetworkContext';

type FilterType = 'all' | 'transfers' | 'contracts';

interface TransactionsDesktopViewProps {
  initialTransactions: Transaction[];
  initialPaymentTransactions?: Transaction[];
  limit?: number;
}

const PAGE_SIZE = 25;

// Helper to fetch operations for a transaction
async function fetchTransactionWithOps(tx: Transaction): Promise<Transaction> {
  try {
    const opsResponse = await getTransactionOperations(tx.hash, 20);
    const operations = opsResponse._embedded.records;
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

const formatTokenAmount = (value?: string, digits = 7) => {
  if (!value) return '0';
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: digits });
};

const formatCompact = (numStr: string | undefined): string => {
  if (!numStr) return '0';
  const num = parseFloat(numStr);
  if (isNaN(num)) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
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
    <div className="flex items-center justify-center gap-1.5 px-5 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50">
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
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-bold transition-all ${
              currentPage === pageNum
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:bg-sky-50 hover:text-sky-600'
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

export default function TransactionsDesktopView({
  initialTransactions,
  initialPaymentTransactions = [],
  limit = 25
}: TransactionsDesktopViewProps) {
  const mergedInitial = mergeTransactions(initialTransactions, initialPaymentTransactions);
  const { network } = useNetwork();

  // Initialize with server-provided data immediately (no loading state)
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    // Mark initial transactions with basic display info
    return mergedInitial.map(tx => ({
      ...tx,
      displayInfo: tx.displayInfo || { type: 'other' as const },
    }));
  });
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isEnrichingData, setIsEnrichingData] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [oldestCursor, setOldestCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const seenIdsRef = useRef<Set<string>>(new Set(mergedInitial.map(t => t.hash)));
  const animatedIdsRef = useRef<Set<string>>(new Set(mergedInitial.map(t => t.hash)));


  const fetchTransactions = useCallback(async () => {
    try {
      const txRes = await fetch(`${getBaseUrl()}/transactions?limit=15&order=desc`);
      const txData = await txRes.json();
      const newTransactions: Transaction[] = txData._embedded.records;

      // Filter to only new transactions we haven't seen
      const unseenTxs = newTransactions.filter(tx => !seenIdsRef.current.has(tx.hash));

      if (unseenTxs.length === 0) return;

      // Fetch operations for new transactions
      const txsWithOps = await Promise.all(unseenTxs.map(fetchTransactionWithOps));

      setTransactions(prevTransactions => {
        const existingMap = new Map(prevTransactions.map(t => [t.hash, t]));

        txsWithOps.forEach(tx => {
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
    }
  }, []);

  const fetchMoreIfNeeded = useCallback(async (targetPage: number) => {
    const neededItems = targetPage * PAGE_SIZE;
    if (neededItems <= transactions.length || !hasMore || isLoadingMore) return;

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

      // Filter out already seen transactions
      const unseenTxs = olderTransactions.filter(tx => !seenIdsRef.current.has(tx.hash));

      // Fetch operations for new transactions in batches
      const txsWithOps: Transaction[] = [];
      const batchSize = 10;
      for (let i = 0; i < unseenTxs.length; i += batchSize) {
        const batch = unseenTxs.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(fetchTransactionWithOps));
        txsWithOps.push(...batchResults);
      }

      setTransactions(prev => {
        const existingMap = new Map(prev.map(t => [t.hash, t]));
        txsWithOps.forEach(tx => {
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

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  useEffect(() => {
    // Enrich the initial transactions with operation details in the background
    // This doesn't block the UI - data shows immediately from server
    const enrichTransactions = async () => {
      setIsEnrichingData(true);
      try {
        // Fetch operations for each transaction to get better display info
        const batchSize = 10;
        const enrichedTxs: Transaction[] = [...transactions];

        for (let i = 0; i < transactions.length; i += batchSize) {
          const batch = transactions.slice(i, i + batchSize);
          const batchResults = await Promise.all(batch.map(fetchTransactionWithOps));

          // Update the enriched array
          batchResults.forEach((enrichedTx, idx) => {
            enrichedTxs[i + idx] = enrichedTx;
          });

          // Update state progressively so UI shows enriched data as it loads
          setTransactions([...enrichedTxs]);
        }
      } catch (error) {
        console.error('Failed to enrich transactions:', error);
      } finally {
        setIsEnrichingData(false);
      }
    };

    if (transactions.length > 0) {
      enrichTransactions();
    }
  }, [network]); // Only run on network change, not on transactions change

  useEffect(() => {
    // Start polling for new transactions right away (data is already shown from server)
    const interval = setInterval(fetchTransactions, 2000);
    return () => clearInterval(interval);
  }, [fetchTransactions]);

  // Filter transactions based on selected filter
  const filteredTransactions = transactions.filter(tx => {
    const type = tx.displayInfo?.type;
    if (filter === 'all') return true;
    if (filter === 'transfers') return type === 'payment';
    if (filter === 'contracts') return type === 'contract';
    return true;
  });

  // Calculate stats
  const stats = useMemo(() => {
    const total = transactions.length;
    const payments = transactions.filter(tx => tx.displayInfo?.type === 'payment').length;
    const contracts = transactions.filter(tx => tx.displayInfo?.type === 'contract').length;
    const successful = transactions.filter(tx => tx.successful).length;
    const failed = total - successful;
    return { total, payments, contracts, successful, failed };
  }, [transactions]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE) + (hasMore ? 1 : 0);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleTransactions = filteredTransactions.slice(startIndex, startIndex + PAGE_SIZE);

  // Get transaction type info
  const getTypeInfo = (tx: Transaction) => {
    const info = tx.displayInfo;
    const type = info?.type || 'other';

    if (type === 'payment') {
      return {
        label: 'Payment',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        iconBg: 'bg-emerald-100',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      };
    }

    if (type === 'contract') {
      return {
        label: 'Contract',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        iconBg: 'bg-amber-100',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        )
      };
    }

    if (info?.isSwap) {
      return {
        label: 'Swap',
        color: 'text-violet-600',
        bgColor: 'bg-violet-50',
        iconBg: 'bg-violet-100',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        )
      };
    }

    if (type === 'manage_offer') {
      return {
        label: 'Offer',
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        iconBg: 'bg-indigo-100',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        )
      };
    }

    if (type === 'multi_send' || type === 'bulk_send') {
      return {
        label: 'Multi Send',
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-50',
        iconBg: 'bg-cyan-100',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        )
      };
    }

    return {
      label: 'Transaction',
      color: 'text-[var(--text-secondary)]',
      bgColor: 'bg-[var(--bg-primary)]',
      iconBg: 'bg-[var(--bg-tertiary)]',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    };
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[1600px] p-6 lg:p-8">
        {/* Header Card */}
        <div className="mb-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            {/* Left: Title & Meta */}
            <div className="flex items-start gap-4 min-w-0">
              <Link
                href="/"
                className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 transition hover:bg-sky-100"
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
                <div className="text-xl font-bold text-[var(--text-primary)]">Transactions</div>
                <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                  Live stream of all transactions on the Stellar network
                </div>
              </div>
            </div>

            {/* Right: Quick Stats */}
            <div className="flex gap-3">
              <div className="p-3 rounded-xl bg-[var(--bg-primary)]/70 border border-[var(--border-subtle)] min-w-[90px]">
                <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Total</div>
                <div className="text-lg font-bold text-[var(--text-primary)]">{stats.total}</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 min-w-[90px]">
                <div className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest mb-1">Payments</div>
                <div className="text-lg font-bold text-emerald-600">{stats.payments}</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100 min-w-[90px]">
                <div className="text-[9px] font-bold text-amber-600/60 uppercase tracking-widest mb-1">Contracts</div>
                <div className="text-lg font-bold text-amber-600">{stats.contracts}</div>
              </div>
              <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100 min-w-[90px]">
                <div className="text-[9px] font-bold text-sky-600/60 uppercase tracking-widest mb-1">Success</div>
                <div className="text-lg font-bold text-sky-600">
                  {stats.total > 0 ? ((stats.successful / stats.total) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-4 px-1 border-b border-[var(--border-default)] pb-2 mb-5">
          {[
            { id: 'all', label: 'All Activity', count: stats.total },
            { id: 'transfers', label: 'Payments', count: stats.payments },
            { id: 'contracts', label: 'Smart Contracts', count: stats.contracts },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as FilterType)}
              className={`text-[10px] font-bold uppercase tracking-widest pb-2 -mb-[9px] transition-all ${
                filter === tab.id
                  ? 'text-sky-600 border-b-2 border-sky-600'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {tab.label}
              <span className={filter === tab.id ? 'text-sky-500 ml-1' : 'text-[var(--text-muted)] ml-1'}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Transactions Table */}
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50">
                  <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">Txn Hash</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">Method</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">Ledger</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">Age</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">From</th>
                  <th className="py-3 px-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-center whitespace-nowrap w-8"></th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">To / Interacted With</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right whitespace-nowrap">Amount</th>
                  <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right whitespace-nowrap">Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bg-primary)]">
                {visibleTransactions.length > 0 ? (
                  visibleTransactions.map((tx) => {
                    const info = tx.displayInfo;
                    const typeInfo = getTypeInfo(tx);

                    // Adjust colors if failed
                    const colorClass = !tx.successful ? 'text-rose-600' : typeInfo.color;
                    const bgClass = !tx.successful ? 'bg-rose-50 border-rose-200' : `${typeInfo.bgColor} border-transparent`;

                    // Format fee (convert from stroops)
                    const feeXLM = tx.fee_charged ? (parseInt(tx.fee_charged) / 10000000).toFixed(7) : '0';

                    // Get the interacted with / details
                    const getInteractedWith = () => {
                      if (info?.type === 'contract' && info.functionName) {
                        return { text: `${info.functionName}()`, color: 'text-amber-600', isAddress: false };
                      }
                      if (info?.type === 'multi_send' || info?.type === 'bulk_send') {
                        return { text: `${info.elementCount} recipients`, color: 'text-cyan-600', isAddress: false };
                      }
                      if (info?.isSwap && info.sourceAsset && info.asset) {
                        return { text: `${info.sourceAsset} → ${info.asset}`, color: 'text-violet-600', isAddress: false };
                      }
                      if (info?.type === 'manage_offer' && info.offerDetails) {
                        return { text: `${info.offerDetails.sellingAsset} → ${info.offerDetails.buyingAsset}`, color: 'text-indigo-600', isAddress: false };
                      }
                      if (info?.type === 'payment' && info.to) {
                        return { text: info.to, color: 'text-[var(--text-secondary)]', isAddress: true };
                      }
                      return null;
                    };

                    const interacted = getInteractedWith();

                    return (
                      <tr
                        key={tx.hash}
                        className="hover:bg-sky-50/30 transition-colors group cursor-pointer"
                        onClick={() => window.location.href = `/transaction/${tx.hash}`}
                      >
                        {/* Txn Hash */}
                        <td className="py-2.5 px-4">
                          <Link
                            href={`/transaction/${tx.hash}`}
                            className="font-mono text-[12px] text-sky-600 hover:text-sky-700 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {shortenAddress(tx.hash, 6)}
                          </Link>
                        </td>

                        {/* Method - now shows transaction TYPE */}
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium ${bgClass} ${colorClass}`}>
                            {typeInfo.label}
                          </span>
                          {!tx.successful && (
                            <span className="ml-1 text-[9px] text-rose-500">✕</span>
                          )}
                        </td>

                        {/* Ledger */}
                        <td className="py-2.5 px-3">
                          <Link
                            href={`/ledger/${tx.ledger}`}
                            className="font-mono text-[12px] text-sky-600 hover:text-sky-700 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {tx.ledger.toLocaleString()}
                          </Link>
                        </td>

                        {/* Age */}
                        <td className="py-2.5 px-3 text-[12px] text-[var(--text-tertiary)] whitespace-nowrap">
                          {timeAgo(tx.created_at)}
                        </td>

                        {/* From */}
                        <td className="py-2.5 px-3">
                          <Link
                            href={`/account/${tx.source_account}`}
                            className="font-mono text-[12px] text-[var(--text-secondary)] hover:text-sky-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {shortenAddress(tx.source_account, 5)}
                          </Link>
                        </td>

                        {/* Arrow */}
                        <td className="py-2.5 px-1 text-center">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 text-emerald-500">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </span>
                        </td>

                        {/* To / Interacted With - now shows DETAILS */}
                        <td className="py-2.5 px-3">
                          {interacted ? (
                            interacted.isAddress ? (
                              <Link
                                href={`/account/${interacted.text}`}
                                className="font-mono text-[12px] text-[var(--text-secondary)] hover:text-sky-600 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {shortenAddress(interacted.text, 5)}
                              </Link>
                            ) : (
                              <span className={`text-[12px] font-medium ${interacted.color}`}>
                                {interacted.text}
                              </span>
                            )
                          ) : (
                            <span className="text-[12px] text-[var(--text-muted)]">—</span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-2.5 px-3 text-right">
                          {info?.amount && info.amount !== '0' ? (
                            <div>
                              <span className="text-[12px] font-medium text-[var(--text-primary)]">
                                {formatCompact(info.amount)}
                              </span>
                              <span className="text-[11px] text-[var(--text-muted)] ml-1">
                                {info.asset || 'XLM'}
                              </span>
                            </div>
                          ) : info?.type === 'manage_offer' && info.offerDetails ? (
                            <div>
                              <span className="text-[12px] font-medium text-[var(--text-primary)]">
                                {formatCompact(info.offerDetails.amount)}
                              </span>
                              <span className="text-[11px] text-[var(--text-muted)] ml-1">
                                {info.offerDetails.sellingAsset}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[12px] text-[var(--text-muted)]">—</span>
                          )}
                        </td>

                        {/* Fee */}
                        <td className="py-2.5 px-4 text-right">
                          <span className="text-[11px] text-[var(--text-tertiary)] font-mono">
                            {feeXLM}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-[var(--text-muted)] text-sm">
                      No transactions found matching your filter.
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
