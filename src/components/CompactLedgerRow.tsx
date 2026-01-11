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
        className="flex items-center justify-between py-4 px-5 bg-white border border-gray-100 rounded-2xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgb(0,0,0,0.06)] hover:border-gray-200 transition-all duration-300 group text-[13px]"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 border border-gray-100 shrink-0">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-gray-900 font-bold font-mono tracking-tight group-hover:text-black transition-colors">
                #{ledger.sequence.toLocaleString()}
              </span>
            </div>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              {timeAgo(ledger.closed_at)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right hidden sm:block">
            <span className="text-gray-900 font-bold font-mono">{ledger.successful_transaction_count}</span>
            <span className="text-gray-400 ml-1 text-[10px] uppercase font-bold tracking-wider">TXS</span>
          </div>
          <div className="text-right">
            <span className="text-gray-900 font-bold font-mono">{ledger.operation_count}</span>
            <span className="text-gray-400 ml-1 text-[10px] uppercase font-bold tracking-wider">OPS</span>
          </div>
          <svg className="w-4 h-4 text-gray-300 group-hover:text-black group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    );
  }
);

CompactLedgerRow.displayName = 'CompactLedgerRow';

export default CompactLedgerRow;
