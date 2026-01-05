'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import CompactLedgerRow from './CompactLedgerRow';
import { Ledger } from '@/lib/stellar';

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
      const res = await fetch(`https://horizon.stellar.org/ledgers?limit=${limit}&order=desc`);
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
                  y: -8,
                  scale: 0.98,
                  filter: 'blur(4px)'
                },
                {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  filter: 'blur(0px)',
                  duration: 0.4,
                  delay: index * 0.05,
                  ease: 'power3.out'
                }
              );

              // Subtle glow effect
              gsap.fromTo(el,
                { boxShadow: '0 0 20px rgba(191, 245, 73, 0.3)' },
                {
                  boxShadow: '0 0 0px rgba(191, 245, 73, 0)',
                  duration: 1,
                  delay: index * 0.05 + 0.2,
                  ease: 'power2.out'
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
    const interval = setInterval(fetchLedgers, 1000);
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
    <div ref={containerRef} className="space-y-1.5">
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
