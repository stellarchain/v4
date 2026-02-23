'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Ledger, timeAgo } from '@/lib/stellar';
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
  ledgers: Ledger[];
  loading: boolean;
  currentPage: number;
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
}

export default function LedgersPageClient({
  ledgers,
  loading,
  currentPage,
  hasNextPage,
  onPageChange,
}: LedgersPageClientProps) {
  const isMobile = useIsMobile();

  // Desktop view
  if (!isMobile) {
    return (
      <LedgersDesktopView
        ledgers={ledgers}
        loading={loading}
        currentPage={currentPage}
        hasNextPage={hasNextPage}
        onPageChange={onPageChange}
      />
    );
  }

  // Mobile view
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-20 pt-1">
      <div className="max-w-[1400px] mx-auto px-3">
        {/* Mobile Header */}
        <div className="px-3 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Ledgers
            </span>
          </div>
        </div>

        {/* Mobile Card List */}
        <div className="flex-1">
          {loading ? (
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
          ) : ledgers.length > 0 ? (
            <div className="space-y-2">
              {ledgers.map((ledger) => (
                <Link
                  key={ledger.id}
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
            </div>
          ) : (
            <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-4 text-center text-[var(--text-muted)] italic text-sm">
              No ledgers found
            </div>
          )}

          {/* Pagination */}
          {!loading && ledgers.length > 0 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <span className="text-sm text-[var(--text-muted)]">
                Page {currentPage}
              </span>

              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={!hasNextPage}
                className="px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
