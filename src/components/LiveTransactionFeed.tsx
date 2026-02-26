'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import CompactTransactionRow from './CompactTransactionRow';
import {
  Transaction,
  getTransactionDisplayInfo,
  Operation,
  getTransactions,
  getPayments,
  getNetwork,
  normalizeTransactions,
  getTransactionOperations,
} from '@/lib/stellar';

interface LiveTransactionFeedProps {
  initialTransactions: Transaction[];
  limit?: number;
  filter?: 'all' | 'payments' | 'contracts';
}

// Get network-specific cache key
const getCacheKey = () => `stellarchain_live_txs_${getNetwork()}`;

// Load cached transactions from sessionStorage (network-specific)
const loadCachedTransactions = (): Transaction[] => {
  if (typeof window === 'undefined') return [];
  try {
    const cached = sessionStorage.getItem(getCacheKey());
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.timestamp && Date.now() - parsed.timestamp < 120000) {
        return parsed.transactions || [];
      }
    }
  } catch {
    // Ignore parse errors
  }
  return [];
};

// Save transactions to sessionStorage (network-specific)
const saveCachedTransactions = (transactions: Transaction[]) => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(getCacheKey(), JSON.stringify({
      transactions: transactions.slice(0, 50),
      timestamp: Date.now()
    }));
  } catch {
    // Ignore storage errors
  }
};

// Helper to convert an Operation to a Transaction with displayInfo
function operationToTransaction(op: Operation): Transaction {
  const opAny = op as any;
  return {
    id: op.id,
    paging_token: op.paging_token,
    successful: opAny.transaction_successful ?? true,
    hash: opAny.transaction_hash || op.id,
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
    displayInfo: getTransactionDisplayInfo([op]),
  };
}

// Helper to fetch operations for a transaction
async function fetchTransactionWithOps(tx: Transaction): Promise<Transaction> {
  try {
    const opsResponse = await getTransactionOperations(tx.hash, 20);
    const operations = opsResponse.records || [];
    return { ...tx, displayInfo: getTransactionDisplayInfo(operations) };
  } catch {
    return { ...tx, displayInfo: { type: 'other' as const } };
  }
}

export default function LiveTransactionFeed({ initialTransactions, limit = 10, filter = 'all' }: LiveTransactionFeedProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const cached = loadCachedTransactions();
    if (cached.length > 0) return cached;
    if (initialTransactions && initialTransactions.length > 0) return initialTransactions;
    return [];
  });
  const [isInitialLoading, setIsInitialLoading] = useState(() => {
    const cached = loadCachedTransactions();
    return cached.length === 0 && (!initialTransactions || initialTransactions.length === 0);
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const previousIdsRef = useRef<Set<string>>(new Set());
  const enrichedIdsRef = useRef<Set<string>>(new Set());
  // Merge helper: merge new transactions, animate new ones, save to cache
  const mergeAndAnimate = useCallback((newTxs: Transaction[], isInitial: boolean) => {
    setTransactions(prev => {
      const existingMap = new Map(prev.map(t => [t.hash, t]));

      newTxs.forEach(tx => {
        const existing = existingMap.get(tx.hash);
        // Prefer transactions with meaningful displayInfo
        if (!existing || (tx.displayInfo && tx.displayInfo.type !== 'other' && (!existing.displayInfo || existing.displayInfo.type === 'other'))) {
          existingMap.set(tx.hash, tx);
        }
      });

      const merged = Array.from(existingMap.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 50);

      // Animate new items (not on initial load)
      if (!isInitial) {
        const addedIds = newTxs
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
      }

      previousIdsRef.current = new Set(merged.map(t => t.id));
      saveCachedTransactions(merged);
      return merged;
    });
  }, []);

  useEffect(() => {
    if (initialTransactions.length === 0) return;
    if (transactions.length > 0) return;

    mergeAndAnimate(initialTransactions, true);
    if (isInitialLoading) {
      setIsInitialLoading(false);
    }
  }, [initialTransactions, transactions.length, mergeAndAnimate, isInitialLoading]);

  // Fetch payments from /payments endpoint (same as desktop for Payments tab)
  const fetchPayments = useCallback(async (isInitial: boolean) => {
    try {
      const data = await getPayments(limit, 'desc');
      const paymentOps: Operation[] = data.records || [];

      // Convert operations to transactions with displayInfo (already typed correctly)
      const txMap = new Map<string, Transaction>();
      for (const op of paymentOps) {
        const opAny = op as any;
        if (txMap.has(opAny.transaction_hash)) continue;
        const tx = operationToTransaction(op);
        if (tx.displayInfo?.type === 'payment') {
          txMap.set(tx.hash, tx);
        }
      }
      const newPaymentTxs = Array.from(txMap.values());

      mergeAndAnimate(newPaymentTxs, isInitial);
      if (isInitial) setIsInitialLoading(false);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      if (isInitial) setIsInitialLoading(false);
    }
  }, [limit, mergeAndAnimate]);

  // Fetch all transactions with enrichment (same approach as desktop TransactionsDesktopView)
  const fetchAllTransactions = useCallback(async (isInitial: boolean) => {
    try {
      // Fetch both transactions and payments in parallel (same as desktop)
      const [txData, paymentsData] = await Promise.all([
        getTransactions(limit, 'desc'),
        getPayments(Math.min(limit, 20), 'desc').catch(() => null),
      ]);

      const rawTransactions: Transaction[] = normalizeTransactions(txData.records || []);

      // Convert payment ops to transactions with displayInfo (immediate type info)
      const paymentTxs: Transaction[] = [];
      if (paymentsData?.records) {
        const seenHashes = new Set<string>();
        for (const op of paymentsData.records as Operation[]) {
          const opAny = op as any;
          if (seenHashes.has(opAny.transaction_hash)) continue;
          seenHashes.add(opAny.transaction_hash);
          paymentTxs.push(operationToTransaction(op));
        }
      }

      // Merge: raw transactions start as 'other', payment txs already have correct type
      const txMap = new Map<string, Transaction>();
      rawTransactions.forEach(tx => {
        txMap.set(tx.hash, { ...tx, displayInfo: tx.displayInfo || { type: 'other' as const } });
      });
      // Payment transactions overwrite with correct displayInfo
      paymentTxs.forEach(tx => {
        txMap.set(tx.hash, tx);
      });

      const allTxs = Array.from(txMap.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      mergeAndAnimate(allTxs, isInitial);
      if (isInitial) setIsInitialLoading(false);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      if (isInitial) setIsInitialLoading(false);
    }
  }, [limit, mergeAndAnimate]);

  // Initial load and polling
  useEffect(() => {
    const fetchFn = filter === 'payments' ? fetchPayments : fetchAllTransactions;
    fetchFn(true);

    const interval = setInterval(() => fetchFn(false), 5000);
    return () => clearInterval(interval);
  }, [filter, fetchPayments, fetchAllTransactions]);

  // Enrichment: single controlled loop, prevents concurrent runs.
  // Processes batches of 3 with 1s delay between to avoid flooding the API.
  const isEnrichingRef = useRef(false);
  const enrichTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isEnrichingRef.current) return;

    const candidates = transactions.filter(tx =>
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

        setTransactions(prev => {
          const updated = prev.map(t => {
            const enriched = batchResults.find(r => r.hash === t.hash);
            return enriched ? enriched : t;
          });
          saveCachedTransactions(updated);
          return updated;
        });

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
  }, [transactions]);

  const setRowRef = useCallback((id: string) => (el: HTMLAnchorElement | null) => {
    if (el) {
      rowRefs.current.set(id, el);
    } else {
      rowRefs.current.delete(id);
    }
  }, []);

  // Filter for display
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
        <div className="py-4 text-center text-[var(--text-muted)] text-sm">
          No transactions found
        </div>
      )}
    </div>
  );
}
