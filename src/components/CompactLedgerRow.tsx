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
        className="flex items-center justify-between py-3 px-4 bg-[#111] rounded-xl hover:bg-[#151515] transition-all group text-xs"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1a1a1a] rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-[#BFF549]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <span className="text-white font-mono font-medium text-sm group-hover:text-[#BFF549] transition-colors">
              #{ledger.sequence.toLocaleString()}
            </span>
            <span className="text-[#555] ml-2">{timeAgo(ledger.closed_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="text-[#BFF549] font-semibold">{ledger.successful_transaction_count}</span>
            <span className="text-[#555] ml-1">txs</span>
          </div>
          <div className="text-right">
            <span className="text-white">{ledger.operation_count}</span>
            <span className="text-[#555] ml-1">ops</span>
          </div>
          <svg className="w-4 h-4 text-[#444] group-hover:text-[#BFF549] group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    );
  }
);

CompactLedgerRow.displayName = 'CompactLedgerRow';

export default CompactLedgerRow;
