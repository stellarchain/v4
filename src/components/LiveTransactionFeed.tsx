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

export default function LiveTransactionFeed({ initialTransactions, limit = 10, filter = 'all' }: LiveTransactionFeedProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const previousIdsRef = useRef<Set<string>>(new Set(initialTransactions.map(t => t.id)));
  const displayInfoCache = useRef<Map<string, TransactionDisplayInfo>>(new Map());

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
  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch(`https://horizon.stellar.org/payments?limit=${limit}&order=desc`);
      if (!res.ok) return;
      const data = await res.json();
      const paymentOps: Operation[] = data._embedded?.records || [];

      // Convert to transactions and filter to only show actual payments (not contract calls)
      const allTransactions = convertPaymentsToTransactions(paymentOps);
      const newPaymentTxs = allTransactions.filter(tx => tx.displayInfo?.type === 'payment');

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

        // Update seen IDs
        previousIdsRef.current = new Set(merged.map(t => t.id));
        return merged;
      });
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    }
  }, [limit, convertPaymentsToTransactions]);

  // Fetch all transactions
  const fetchAllTransactions = useCallback(async () => {
    try {
      const res = await fetch(`https://horizon.stellar.org/transactions?limit=${limit}&order=desc`);
      const data = await res.json();
      const rawTransactions: Transaction[] = data._embedded.records;
      const newTransactions = await enrichTransactions(rawTransactions);

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

        previousIdsRef.current = new Set(merged.map(t => t.id));
        return merged;
      });
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  }, [limit, enrichTransactions]);

  // Initial load and polling based on filter
  useEffect(() => {
    if (filter === 'payments') {
      fetchPayments(); // Fetch immediately on mount
    } else {
      enrichTransactions(initialTransactions).then(enriched => {
        setTransactions(enriched);
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fetchFn = filter === 'payments' ? fetchPayments : fetchAllTransactions;
    const interval = setInterval(fetchFn, 8000);
    return () => clearInterval(interval);
  }, [filter, fetchPayments, fetchAllTransactions]);

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

  return (
    <div ref={containerRef} className="w-full">
      {filteredTransactions.length > 0 ? (
        filteredTransactions.map((tx) => (
          <CompactTransactionRow
            key={tx.id}
            ref={setRowRef(tx.id)}
            transaction={tx}
          />
        ))
      ) : (
        <div className="py-8 text-center text-gray-400 text-sm">
          Loading transactions...
        </div>
      )}
    </div>
  );
}

