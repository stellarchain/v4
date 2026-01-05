'use client';

import Link from 'next/link';
import { Transaction, shortenAddress, timeAgo } from '@/lib/stellar';
import { forwardRef } from 'react';

interface CompactTransactionRowProps {
  transaction: Transaction;
}

const CompactTransactionRow = forwardRef<HTMLAnchorElement, CompactTransactionRowProps>(
  ({ transaction }, ref) => {
    return (
      <Link
        ref={ref}
        href={`/transaction/${transaction.hash}`}
        className="flex items-center justify-between py-3 px-4 bg-[#111] rounded-xl hover:bg-[#151515] transition-all group text-xs"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${transaction.successful ? 'bg-[#1a2a1a]' : 'bg-[#2a1a1a]'
            }`}>
            {transaction.successful ? (
              <svg className="w-4 h-4 text-[#BFF549]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <div>
            <span className="text-white font-mono group-hover:text-[#BFF549] transition-colors">
              {shortenAddress(transaction.hash, 6)}
            </span>
            <span className="text-[#555] ml-2">{timeAgo(transaction.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="text-[#777] font-mono text-xs">
              {shortenAddress(transaction.source_account, 4)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-white">{transaction.operation_count}</span>
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

CompactTransactionRow.displayName = 'CompactTransactionRow';

export default CompactTransactionRow;
