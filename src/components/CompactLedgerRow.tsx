'use client';

import Link from 'next/link';
import { Ledger, timeAgo } from '@/lib/stellar';
import { forwardRef } from 'react';

interface CompactLedgerRowProps {
  ledger: Ledger;
}

const CompactLedgerRow = forwardRef<HTMLAnchorElement, CompactLedgerRowProps>(
  ({ ledger }, ref) => {
    return (
      <Link
        ref={ref}
        href={`/ledger/${ledger.sequence}`}
        className="flex items-center justify-between py-4 px-4 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-sm hover:shadow-md hover:border-[var(--border-default)] transition-[colors,box-shadow,border-color] duration-300 group text-[13px]"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] shrink-0">
            <svg className="w-5 h-5 text-[var(--text-muted)]" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[var(--primary-blue)] font-bold font-mono tracking-tight group-hover:text-[var(--text-primary)] transition-colors">
                #{ledger.sequence.toLocaleString()}
              </span>
            </div>
            <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">
              {timeAgo(ledger.closed_at)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="text-[var(--text-primary)] font-bold font-mono">{ledger.successful_transaction_count}</span>
            <span className="text-[var(--text-muted)] ml-1 text-[10px] uppercase font-bold tracking-wider">TXS</span>
          </div>
          <div className="text-right">
            <span className="text-[var(--text-primary)] font-bold font-mono">{ledger.operation_count}</span>
            <span className="text-[var(--text-muted)] ml-1 text-[10px] uppercase font-bold tracking-wider">OPS</span>
          </div>
          <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 transition-[color,transform]" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    );
  }
);

CompactLedgerRow.displayName = 'CompactLedgerRow';

export default CompactLedgerRow;
