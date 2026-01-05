'use client';

import Link from 'next/link';
import { Operation, shortenAddress, timeAgo, getOperationTypeLabel, formatXLM } from '@/lib/stellar';
import { forwardRef } from 'react';

interface CompactOperationRowProps {
  operation: Operation;
}

const CompactOperationRow = forwardRef<HTMLAnchorElement, CompactOperationRowProps>(
  ({ operation }, ref) => {
    const getAmount = () => {
      if (operation.amount) {
        return `${formatXLM(operation.amount)} ${operation.asset_type === 'native' ? 'XLM' : operation.asset_code || ''}`;
      }
      if (operation.starting_balance) {
        return `${formatXLM(operation.starting_balance)} XLM`;
      }
      return null;
    };

    const amount = getAmount();

    return (
      <Link
        ref={ref}
        href={`/transaction/${operation.transaction_hash}`}
        className="flex items-center justify-between py-3 px-4 bg-[#111] rounded-xl hover:bg-[#151515] transition-all group text-xs"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${operation.transaction_successful ? 'bg-[#1a1a2a]' : 'bg-[#2a1a1a]'
            }`}>
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <span className="text-white group-hover:text-[#BFF549] transition-colors">
              {getOperationTypeLabel(operation)}
            </span>
            <span className="text-[#555] ml-2">{timeAgo(operation.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {amount && (
            <span className="text-[#BFF549] font-semibold">{amount}</span>
          )}
          <div className="text-right hidden sm:block">
            <span className="text-[#777] font-mono text-xs">
              {shortenAddress(operation.source_account, 4)}
            </span>
          </div>
          <svg className="w-4 h-4 text-[#444] group-hover:text-[#BFF549] group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    );
  }
);

CompactOperationRow.displayName = 'CompactOperationRow';

export default CompactOperationRow;
