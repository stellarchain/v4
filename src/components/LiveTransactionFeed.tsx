'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import CompactTransactionRow from './CompactTransactionRow';
import { Transaction, getTransactionDisplayInfo, getTransactionOperations, TransactionDisplayInfo, Operation } from '@/lib/stellar';

interface LiveTransactionFeedProps {
  initialTransactions: Transaction[];
  limit?: number;
  filter?: 'all' | 'payments' | 'contracts';
}

// Session storage key for caching transactions
const CACHE_KEY = 'stellarchain_live_txs';

// Load cached transactions from sessionStorage
const loadCachedTransactions = (): Transaction[] => {
  if (typeof window === 'undefined') return [];
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Only use cache if it's less than 2 minutes old
      if (parsed.timestamp && Date.now() - parsed.timestamp < 120000) {
        return parsed.transactions || [];
      }
    }
  } catch {
    // Ignore parse errors
  }
  return [];
};

// Save transactions to sessionStorage
const saveCachedTransactions = (transactions: Transaction[]) => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      transactions: transactions.slice(0, 50),
      timestamp: Date.now()
    }));
  } catch {
    // Ignore storage errors
  }
};

export default function LiveTransactionFeed({ initialTransactions, limit = 10, filter = 'all' }: LiveTransactionFeedProps) {
  // Initialize with cached data, initial props, or empty array
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const cached = loadCachedTransactions();
    if (cached.length > 0) return cached;
    if (initialTransactions && initialTransactions.length > 0) return initialTransactions;
    return [];
  });
  const [isInitialLoading, setIsInitialLoading] = useState(() => {
    const cached = loadCachedTransactions();
    // Skip loading state if we have cached data
    return cached.length === 0 && (!initialTransactions || initialTransactions.length === 0);
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const previousIdsRef = useRef<Set<string>>(new Set());
  const displayInfoCache = useRef<Map<string, TransactionDisplayInfo>>(new Map());
  const isInitialLoadRef = useRef(true);

  // Convert payment operations to Transaction format with displayInfo (same as TransactionPageClient)
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

  // Helper to fetch details for transactions that don't have them yet
  const enrichTransactions = useCallback(async (txs: Transaction[]) => {
    const toFetch = txs.filter(t => !displayInfoCache.current.has(t.hash));
    const batch = toFetch.slice(0, 10);

    if (batch.length > 0) {
      await Promise.allSettled(batch.map(async (tx) => {
        try {
          const opsData = await getTransactionOperations(tx.hash, 10);
          if (opsData?._embedded?.records && opsData._embedded.records.length > 0) {
            const info = getTransactionDisplayInfo(opsData._embedded.records);
            displayInfoCache.current.set(tx.hash, info);
          }
        } catch (e) {
          console.error(`Failed to fetch ops for ${tx.hash}`, e);
        }
      }));
    }

    return txs.map(t => {
      if (displayInfoCache.current.has(t.hash)) {
        return { ...t, displayInfo: displayInfoCache.current.get(t.hash) };
      }
      return t;
    });
  }, []);

  // Fetch payments directly from /payments endpoint
  const fetchPayments = useCallback(async (isInitial = false) => {
    try {
      const res = await fetch(`https://horizon.stellar.org/payments?limit=${limit}&order=desc`);
      if (!res.ok) return;
      const data = await res.json();
      const paymentOps: Operation[] = data._embedded?.records || [];

      // Convert to transactions and filter to only show actual payments (not contract calls)
      const allTransactions = convertPaymentsToTransactions(paymentOps);
      const newPaymentTxs = allTransactions.filter(tx => tx.displayInfo?.type === 'payment');

      if (isInitial) {
        // Initial load - merge with any existing cached data
        setTransactions(prev => {
          const existingMap = new Map(prev.map(t => [t.hash, t]));
          newPaymentTxs.forEach(tx => existingMap.set(tx.hash, tx));
          const merged = Array.from(existingMap.values())
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 50);
          previousIdsRef.current = new Set(merged.map(t => t.id));
          saveCachedTransactions(merged);
          return merged;
        });
        isInitialLoadRef.current = false;
        setIsInitialLoading(false);
        return;
      }

      setTransactions(prevTransactions => {
        // Merge new transactions with existing ones, keeping history
        const existingMap = new Map(prevTransactions.map(t => [t.hash, t]));

        // Add new transactions (they take priority if same hash exists)
        newPaymentTxs.forEach(tx => {
          existingMap.set(tx.hash, tx);
        });

        // Convert back to array, sort by created_at (newest first), and cap at 50
        const merged = Array.from(existingMap.values())
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 50);

        // Find truly new transactions for animation
        const addedIds = newPaymentTxs
          .filter(t => !previousIdsRef.current.has(t.id))
          .map(t => t.id);

        if (addedIds.length > 0) {
          setTimeout(() => {
            addedIds.forEach((id, index) => {
              const el = rowRefs.current.get(id);
              if (el) {
                gsap.fromTo(el,
                  { opacity: 0, y: -4 },
                  { opacity: 1, y: 0, duration: 0.25, delay: index * 0.03, ease: 'power2.out' }
                );
              }
            });
          }, 10);
        }

        // Update seen IDs and cache
        previousIdsRef.current = new Set(merged.map(t => t.id));
        saveCachedTransactions(merged);
        return merged;
      });
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      if (isInitial) {
        setIsInitialLoading(false);
      }
    }
  }, [limit, convertPaymentsToTransactions]);

  // Fetch all transactions
  const fetchAllTransactions = useCallback(async (isInitial = false) => {
    try {
      const res = await fetch(`https://horizon.stellar.org/transactions?limit=${limit}&order=desc`);
      const data = await res.json();
      const rawTransactions: Transaction[] = data._embedded.records;
      const newTransactions = await enrichTransactions(rawTransactions);

      if (isInitial) {
        // Initial load - merge with any existing cached data
        setTransactions(prev => {
          const existingMap = new Map(prev.map(t => [t.hash, t]));
          newTransactions.forEach(tx => existingMap.set(tx.hash, tx));
          const merged = Array.from(existingMap.values())
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 50);
          previousIdsRef.current = new Set(merged.map(t => t.id));
          saveCachedTransactions(merged);
          return merged;
        });
        isInitialLoadRef.current = false;
        setIsInitialLoading(false);
        return;
      }

      setTransactions(prevTransactions => {
        // Merge new transactions with existing ones, keeping history
        const existingMap = new Map(prevTransactions.map(t => [t.hash, t]));

        newTransactions.forEach(tx => {
          existingMap.set(tx.hash, tx);
        });

        // Convert back to array, sort by created_at (newest first), and cap at 50
        const merged = Array.from(existingMap.values())
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 50);

        // Find truly new transactions for animation
        const addedIds = newTransactions
          .filter(t => !previousIdsRef.current.has(t.id))
          .map(t => t.id);

        if (addedIds.length > 0) {
          setTimeout(() => {
            addedIds.forEach((id, index) => {
              const el = rowRefs.current.get(id);
              if (el) {
                gsap.fromTo(el,
                  { opacity: 0, y: -4 },
                  { opacity: 1, y: 0, duration: 0.25, delay: index * 0.03, ease: 'power2.out' }
                );
              }
            });
          }, 10);
        }

        // Update seen IDs and cache
        previousIdsRef.current = new Set(merged.map(t => t.id));
        saveCachedTransactions(merged);
        return merged;
      });
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      if (isInitial) {
        setIsInitialLoading(false);
      }
    }
  }, [limit, enrichTransactions]);

  // Initial load on mount
  useEffect(() => {
    if (filter === 'payments') {
      fetchPayments(true);
    } else {
      fetchAllTransactions(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Live updates interval (only after initial load)
  useEffect(() => {
    if (isInitialLoading) return;
    const fetchFn = filter === 'payments' ? () => fetchPayments(false) : () => fetchAllTransactions(false);
    const interval = setInterval(fetchFn, 8000);
    return () => clearInterval(interval);
  }, [filter, fetchPayments, fetchAllTransactions, isInitialLoading]);

  const setRowRef = useCallback((id: string) => (el: HTMLAnchorElement | null) => {
    if (el) {
      rowRefs.current.set(id, el);
    } else {
      rowRefs.current.delete(id);
    }
  }, []);

  // For 'contracts' filter, we still need to filter after enrichment
  const filteredTransactions = filter === 'contracts'
    ? transactions.filter(tx => tx.displayInfo?.type === 'contract')
    : transactions;

  // Skeleton row component
  const SkeletonRow = () => (
    <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)]">
      <div className="flex items-center justify-between px-3 py-3">
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
  );

  return (
    <div ref={containerRef} className="w-full space-y-2">
      {isInitialLoading ? (
        // Skeleton loader
        Array.from({ length: limit }).map((_, i) => (
          <SkeletonRow key={i} />
        ))
      ) : filteredTransactions.length > 0 ? (
        filteredTransactions.map((tx) => (
          <CompactTransactionRow
            key={tx.id}
            ref={setRowRef(tx.id)}
            transaction={tx}
          />
        ))
      ) : (
        <div className="py-8 text-center text-[var(--text-muted)] text-sm">
          No transactions found
        </div>
      )}
    </div>
  );
}

