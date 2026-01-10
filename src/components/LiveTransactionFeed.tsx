'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import CompactTransactionRow from './CompactTransactionRow';
import { Transaction, getTransactionDisplayInfo, Operation } from '@/lib/stellar';

interface LiveTransactionFeedProps {
  initialTransactions: Transaction[];
  limit?: number;
}

export default function LiveTransactionFeed({ initialTransactions, limit = 10 }: LiveTransactionFeedProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const previousIdsRef = useRef<Set<string>>(new Set(initialTransactions.map(t => t.id)));

  // Fetch operations for a single transaction
  const fetchOperationsForTransaction = useCallback(async (txHash: string): Promise<Operation[]> => {
    try {
      const res = await fetch(`https://horizon.stellar.org/transactions/${txHash}/operations?limit=1`);
      const data = await res.json();
      return data._embedded?.records || [];
    } catch {
      return [];
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch(`https://horizon.stellar.org/transactions?limit=${limit}&order=desc`);
      const data = await res.json();
      const newTransactions: Transaction[] = data._embedded.records;

      // Find new transaction IDs
      const newIds = newTransactions.filter(t => !previousIdsRef.current.has(t.id)).map(t => t.id);

      // Fetch operations for new transactions only
      const transactionsWithOps = await Promise.all(
        newTransactions.map(async (tx) => {
          // Only fetch ops for new transactions, reuse cached displayInfo for existing ones
          if (newIds.includes(tx.id) || !tx.displayInfo) {
            const operations = await fetchOperationsForTransaction(tx.hash);
            return {
              ...tx,
              displayInfo: getTransactionDisplayInfo(operations),
            };
          }
          // Find existing transaction with displayInfo
          const existing = transactions.find(t => t.id === tx.id);
          return {
            ...tx,
            displayInfo: existing?.displayInfo || getTransactionDisplayInfo([]),
          };
        })
      );

      setTransactions(prevTransactions => {
        const addedIds = transactionsWithOps.filter(t => !previousIdsRef.current.has(t.id)).map(t => t.id);

        setTimeout(() => {
          addedIds.forEach((id, index) => {
            const el = rowRefs.current.get(id);
            if (el) {
              gsap.fromTo(el,
                {
                  opacity: 0,
                  y: -4,
                },
                {
                  opacity: 1,
                  y: 0,
                  duration: 0.25,
                  delay: index * 0.03,
                  ease: 'power2.out'
                }
              );

              gsap.fromTo(el,
                { backgroundColor: 'rgba(191, 245, 73, 0.05)' },
                {
                  backgroundColor: 'rgba(0, 0, 0, 0)',
                  duration: 0.6,
                  delay: index * 0.03 + 0.1,
                  ease: 'power1.out'
                }
              );
            }
          });
        }, 10);

        previousIdsRef.current = new Set(transactionsWithOps.map(t => t.id));
        return transactionsWithOps;
      });
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  }, [limit, fetchOperationsForTransaction, transactions]);

  useEffect(() => {
    // Initial fetch with operations
    const initFetch = async () => {
      const txsWithOps = await Promise.all(
        initialTransactions.map(async (tx) => {
          if (!tx.displayInfo) {
            const operations = await fetchOperationsForTransaction(tx.hash);
            return {
              ...tx,
              displayInfo: getTransactionDisplayInfo(operations),
            };
          }
          return tx;
        })
      );
      setTransactions(txsWithOps);
    };
    initFetch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const interval = setInterval(fetchTransactions, 2000); // Increased to 2 seconds to reduce API load
    return () => clearInterval(interval);
  }, [fetchTransactions]);

  const setRowRef = useCallback((id: string) => (el: HTMLAnchorElement | null) => {
    if (el) {
      rowRefs.current.set(id, el);
    } else {
      rowRefs.current.delete(id);
    }
  }, []);

  return (
    <div ref={containerRef} className="space-y-3">
      {transactions.map((tx) => (
        <CompactTransactionRow
          key={tx.id}
          ref={setRowRef(tx.id)}
          transaction={tx}
        />
      ))}
    </div>
  );
}
