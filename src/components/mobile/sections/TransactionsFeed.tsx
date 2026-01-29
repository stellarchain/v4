'use client';

import Link from 'next/link';
import LiveTransactionFeed from '@/components/LiveTransactionFeed';

interface TransactionsFeedProps {
  initialTransactions: any[];
}

export default function TransactionsFeed({ initialTransactions }: TransactionsFeedProps) {
  return (
    <div className="px-3 mt-4">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center space-x-2">
          <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Live Transactions</h2>
          <span className="bg-[var(--success)]/10 text-[var(--success)] text-[11px] px-1.5 py-0.5 rounded font-bold">REALTIME</span>
        </div>
        <Link
          href="/transactions"
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </Link>
      </div>

      {/* Transaction Cards */}
      <LiveTransactionFeed initialTransactions={initialTransactions} limit={30} filter="payments" />

      {/* Load More */}
      <div className="mt-3 text-center">
        <Link
          href="/transactions"
          className="inline-block bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-2.5 text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest hover:text-[var(--success)] transition-colors"
        >
          Load More Records
        </Link>
      </div>
    </div>
  );
}
