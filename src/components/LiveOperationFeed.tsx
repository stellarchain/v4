'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import CompactOperationRow from './CompactOperationRow';
import { Operation, getBaseUrl } from '@/lib/stellar';

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
      const res = await fetch(`${getBaseUrl()}/operations?limit=${limit}&order=desc`);
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
                { backgroundColor: 'rgba(59, 130, 246, 0.05)' },
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
        return newOperations;
      });
    } catch (error) {
      console.error('Failed to fetch operations:', error);
    }
  }, [limit]);

  useEffect(() => {
    const interval = setInterval(fetchOperations, 10000); // 10s interval to safely stay under rate limits
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
    <div ref={containerRef} className="space-y-3">
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
