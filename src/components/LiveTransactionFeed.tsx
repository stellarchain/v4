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

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch(`https://horizon.stellar.org/transactions?limit=${limit}&order=desc`);
      const data = await res.json();
      const newTransactions: Transaction[] = data._embedded.records;

      setTransactions(prevTransactions => {
        const newIds = new Set(newTransactions.map(t => t.id));
        const addedIds = newTransactions.filter(t => !previousIdsRef.current.has(t.id)).map(t => t.id);

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
            }
          });
        }, 10);

        previousIdsRef.current = newIds;
        return newTransactions;
      });
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  }, [limit]);

  useEffect(() => {
    const interval = setInterval(fetchTransactions, 8000); // Increased to 8 seconds to reduce API load significantly
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
