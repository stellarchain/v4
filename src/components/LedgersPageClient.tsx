'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import Link from 'next/link';
import { Ledger, timeAgo, getBaseUrl } from '@/lib/stellar';
import LedgersDesktopView from '@/components/desktop/LedgersDesktopView';

// Custom hook to detect mobile viewport
function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState(true); // Default to mobile for SSR

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}

interface LedgersPageClientProps {
  initialLedgers: Ledger[];
  limit?: number;
}

const PAGE_SIZE = 25;

export default function LedgersPageClient({
  initialLedgers,
  limit = 25
}: LedgersPageClientProps) {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const previousIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  const [mobileLoadedCount, setMobileLoadedCount] = useState(PAGE_SIZE);
  const isMobile = useIsMobile();

  // Fetch latest ledgers for live updates
  const fetchLedgers = useCallback(async (isInitial = false) => {
    try {
      const res = await fetch(`${getBaseUrl()}/ledgers?limit=${limit}&order=desc`);
      const data = await res.json();
      const newLedgers: Ledger[] = data._embedded.records;

      if (isInitial) {
        // Initial load - just set the data, no animation
        setLedgers(newLedgers);
        previousIdsRef.current = new Set(newLedgers.map(l => l.id));
        isInitialLoadRef.current = false;
        setIsInitialLoading(false);
        return;
      }

      // Live update - merge and animate new entries
      setLedgers(prevLedgers => {
        const existingMap = new Map(prevLedgers.map(l => [l.id, l]));
        const addedIds: string[] = [];

        newLedgers.forEach(l => {
          if (!existingMap.has(l.id)) {
            addedIds.push(l.id);
          }
          existingMap.set(l.id, l);
        });

        const merged = Array.from(existingMap.values())
          .sort((a, b) => b.sequence - a.sequence);

        // Animate only genuinely new ledgers (simple slide-in, no color change)
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

        previousIdsRef.current = new Set(merged.map(l => l.id));
        return merged;
      });
    } catch (error) {
      console.error('Failed to fetch ledgers:', error);
      // On error during initial load, fall back to server data
      if (isInitial) {
        setLedgers(initialLedgers);
        previousIdsRef.current = new Set(initialLedgers.map(l => l.id));
        isInitialLoadRef.current = false;
        setIsInitialLoading(false);
      }
    }
  }, [limit, initialLedgers]);

  // Load more older ledgers
  const loadMoreForMobile = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    const nextCount = mobileLoadedCount + PAGE_SIZE;
    if (nextCount <= ledgers.length) {
      setMobileLoadedCount(nextCount);
      return;
    }

    setIsLoadingMore(true);

    try {
      const sortedLedgers = [...ledgers].sort((a, b) => a.sequence - b.sequence);
      const oldestLedger = sortedLedgers[0];

      if (!oldestLedger) {
        setIsLoadingMore(false);
        setHasMore(false);
        return;
      }

      const res = await fetch(
        `${getBaseUrl()}/ledgers?limit=${PAGE_SIZE}&order=desc&cursor=${oldestLedger.paging_token}`
      );
      const data = await res.json();
      const olderLedgers: Ledger[] = data._embedded.records;

      if (olderLedgers.length === 0) {
        setIsLoadingMore(false);
        setHasMore(false);
        return;
      }

      setHasMore(olderLedgers.length >= PAGE_SIZE);

      setLedgers(prev => {
        const existingMap = new Map(prev.map(l => [l.id, l]));
        olderLedgers.forEach(l => {
          if (!existingMap.has(l.id)) {
            existingMap.set(l.id, l);
          }
        });
        return Array.from(existingMap.values()).sort((a, b) => b.sequence - a.sequence);
      });

      setMobileLoadedCount(prev => prev + PAGE_SIZE);
    } catch (error) {
      console.error('Failed to load more ledgers:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, mobileLoadedCount, ledgers]);

  // Mobile infinite scroll
  useEffect(() => {
    if (!isMobile || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !isLoadingMore && hasMore) {
          loadMoreForMobile();
        }
      },
      { root: null, rootMargin: '100px', threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [isMobile, isLoadingMore, hasMore, loadMoreForMobile]);

  // Initial fetch on mount (only for mobile)
  useEffect(() => {
    if (isMobile) {
      fetchLedgers(true);
    }
  }, [isMobile]);

  // Live updates interval (only after initial load, only for mobile)
  useEffect(() => {
    if (!isMobile || isInitialLoading) return;
    const interval = setInterval(() => fetchLedgers(false), 6000);
    return () => clearInterval(interval);
  }, [fetchLedgers, isInitialLoading, isMobile]);

  const setRowRef = useCallback((id: string) => (el: HTMLAnchorElement | null) => {
    if (el) {
      rowRefs.current.set(id, el);
    } else {
      rowRefs.current.delete(id);
    }
  }, []);

  const mobileVisibleLedgers = ledgers.slice(0, mobileLoadedCount);
  const mobileHasMore = hasMore || mobileLoadedCount < ledgers.length;

  // Desktop view - use the new redesigned component
  if (!isMobile) {
    return <LedgersDesktopView initialLedgers={initialLedgers} limit={limit} />;
  }

  // Mobile view - keep the existing card-based layout
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-20 pt-1">
      <div className="max-w-[1600px] mx-auto px-3">
        {/* Mobile Header */}
        <div className="px-3 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Ledgers
            </span>
            <span className="bg-[var(--success)]/10 text-[var(--success)] text-[10px] px-1.5 py-0.5 rounded font-bold">LIVE</span>
          </div>
        </div>

        {/* Mobile Card List */}
        <div className="flex-1 overflow-auto" ref={mobileContainerRef}>
          {isInitialLoading ? (
            // Mobile Skeleton
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)]">
                  <div className="px-3 py-3 flex items-center justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
                      <div className="flex flex-col gap-1.5">
                        <div className="h-4 w-20 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                        <div className="h-3 w-14 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="h-3 w-12 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                      <div className="h-3 w-10 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : mobileVisibleLedgers.length > 0 ? (
            <div className="space-y-2">
              {mobileVisibleLedgers.map((ledger) => (
                <Link
                  key={ledger.id}
                  ref={setRowRef(ledger.id)}
                  href={`/ledger/${ledger.sequence}`}
                  className="block bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] active:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <div className="px-3 py-3 flex items-center justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--success)]/10">
                        <svg className="w-5 h-5 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold leading-tight text-[var(--primary-blue)]">
                          #{ledger.sequence.toLocaleString()}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] font-medium font-mono mt-0.5">
                          {timeAgo(ledger.closed_at)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-[var(--text-primary)]">
                        {ledger.successful_transaction_count} <span className="text-[var(--text-muted)] font-medium">txs</span>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {ledger.operation_count} ops
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="h-1" />

              {/* Loading indicator */}
              {isLoadingMore && (
                <div className="flex justify-center py-4">
                  <svg className="w-6 h-6 animate-spin text-[var(--text-primary)]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              )}

              {/* Load More Button (fallback) */}
              {!isLoadingMore && mobileHasMore && (
                <div className="py-4">
                  <button
                    onClick={loadMoreForMobile}
                    className="w-full py-3 rounded-xl bg-[var(--bg-secondary)] shadow-sm border border-[var(--border-subtle)] text-sm font-semibold transition-colors hover:bg-[var(--bg-tertiary)] active:bg-[var(--bg-hover)] text-[var(--text-primary)]"
                  >
                    Load More
                  </button>
                </div>
              )}

              {/* End of list */}
              {!isLoadingMore && !mobileHasMore && mobileVisibleLedgers.length > 0 && (
                <div className="py-4 text-center text-[var(--text-muted)] text-sm">
                  No more ledgers
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-12 text-center text-[var(--text-muted)] italic text-sm">
              No ledgers found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
