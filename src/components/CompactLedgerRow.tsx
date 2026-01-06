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
        className="data-row flex items-center justify-between py-3 px-4 group text-[13px]"
      >
        <div className="flex items-center gap-3">
          <div className="icon-container-sm">
            <svg className="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <span className="text-[var(--text-primary)] font-mono font-medium group-hover:text-[var(--primary)] transition-colors">
              #{ledger.sequence.toLocaleString()}
            </span>
            <span className="text-[var(--text-tertiary)] ml-2 text-[12px]">{timeAgo(ledger.closed_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right hidden sm:block">
            <span className="text-[var(--primary)] font-mono font-medium">{ledger.successful_transaction_count}</span>
            <span className="text-[var(--text-tertiary)] ml-1.5 text-[12px]">txs</span>
          </div>
          <div className="text-right">
            <span className="text-[var(--text-primary)] font-mono">{ledger.operation_count}</span>
            <span className="text-[var(--text-tertiary)] ml-1.5 text-[12px]">ops</span>
          </div>
          <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    );
  }
);

CompactLedgerRow.displayName = 'CompactLedgerRow';

export default CompactLedgerRow;
