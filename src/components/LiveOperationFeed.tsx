'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import CompactOperationRow from './CompactOperationRow';
import { Operation } from '@/lib/stellar';

interface LiveOperationFeedProps {
  initialOperations: Operation[];
  limit?: number;
}

export default function LiveOperationFeed({ initialOperations, limit = 10 }: LiveOperationFeedProps) {
  const [operations, setOperations] = useState<Operation[]>(initialOperations);
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const previousIdsRef = useRef<Set<string>>(new Set(initialOperations.map(o => o.id)));

  const fetchOperations = useCallback(async () => {
    try {
      const res = await fetch(`https://horizon.stellar.org/operations?limit=${limit}&order=desc`);
      const data = await res.json();
      const newOperations: Operation[] = data._embedded.records;

      setOperations(prevOperations => {
        const newIds = new Set(newOperations.map(o => o.id));
        const addedIds = newOperations.filter(o => !previousIdsRef.current.has(o.id)).map(o => o.id);

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
        return newOperations;
      });
    } catch (error) {
      console.error('Failed to fetch operations:', error);
    }
  }, [limit]);

  useEffect(() => {
    const interval = setInterval(fetchOperations, 1000);
    return () => clearInterval(interval);
  }, [fetchOperations]);

  const setRowRef = useCallback((id: string) => (el: HTMLAnchorElement | null) => {
    if (el) {
      rowRefs.current.set(id, el);
    } else {
      rowRefs.current.delete(id);
    }
  }, []);

  return (
    <div ref={containerRef} className="space-y-1.5">
      {operations.map((op) => (
        <CompactOperationRow
          key={op.id}
          ref={setRowRef(op.id)}
          operation={op}
        />
      ))}
    </div>
  );
}
