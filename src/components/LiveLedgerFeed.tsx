'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import CompactLedgerRow from './CompactLedgerRow';
import { Ledger, getBaseUrl } from '@/lib/stellar';

interface LiveLedgerFeedProps {
  initialLedgers: Ledger[];
  limit?: number;
}

export default function LiveLedgerFeed({ initialLedgers, limit = 10 }: LiveLedgerFeedProps) {
  const [ledgers, setLedgers] = useState<Ledger[]>(initialLedgers);
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const previousIdsRef = useRef<Set<string>>(new Set(initialLedgers.map(l => l.id)));

  const fetchLedgers = useCallback(async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/ledgers?limit=${limit}&order=desc`);
      const data = await res.json();
      const newLedgers: Ledger[] = data._embedded.records;

      setLedgers(prevLedgers => {
        const newIds = new Set(newLedgers.map(l => l.id));
        const addedIds = newLedgers.filter(l => !previousIdsRef.current.has(l.id)).map(l => l.id);

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

              // Very subtle highlight
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

        previousIdsRef.current = newIds;
        return newLedgers;
      });
    } catch (error) {
      console.error('Failed to fetch ledgers:', error);
    }
  }, [limit]);

  useEffect(() => {
    const interval = setInterval(fetchLedgers, 10000); // 10s interval to safely stay under rate limits
    return () => clearInterval(interval);
  }, [fetchLedgers]);

  const setRowRef = useCallback((id: string) => (el: HTMLAnchorElement | null) => {
    if (el) {
      rowRefs.current.set(id, el);
    } else {
      rowRefs.current.delete(id);
    }
  }, []);

  return (
    <div ref={containerRef} className="space-y-3">
      {ledgers.map((ledger) => (
        <CompactLedgerRow
          key={ledger.id}
          ref={setRowRef(ledger.id)}
          ledger={ledger}
        />
      ))}
    </div>
  );
}
