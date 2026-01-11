'use client';

import Link from 'next/link';
import { Transaction, shortenAddress, timeAgo } from '@/lib/stellar';
import { forwardRef } from 'react';

interface CompactTransactionRowProps {
  transaction: Transaction;
}

const CompactTransactionRow = forwardRef<HTMLAnchorElement, CompactTransactionRowProps>(
  ({ transaction }, ref) => {
    // Determine what to display based on displayInfo
    const renderDisplayInfo = () => {
      const info = transaction.displayInfo;

      if (!info) {
        // Fallback to ops count
        return (
          <>
            <span className="text-gray-900 font-bold">{transaction.operation_count}</span>
            <span className="text-gray-400 ml-1 text-[10px] uppercase font-bold tracking-wider">OPS</span>
          </>
        );
      }

      if (info.type === 'payment' && info.amount && info.asset) {
        return (
          <>
            <span className="text-gray-900 font-bold">{info.amount}</span>
            <span className="text-gray-400 ml-1 text-[10px] uppercase font-bold tracking-wider">{info.asset}</span>
          </>
        );
      }

      if (info.type === 'contract' && info.functionName) {
        return (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 border border-gray-200 rounded text-[10px] font-bold uppercase tracking-wide truncate max-w-[100px]">
            {info.functionName}
          </span>
        );
      }

      // Fallback for 'other' type
      return (
        <>
          <span className="text-gray-900 font-bold">{transaction.operation_count}</span>
          <span className="text-gray-400 ml-1 text-[10px] uppercase font-bold tracking-wider">OPS</span>
        </>
      );
    };

    return (
      <Link
        ref={ref}
        href={`/transaction/${transaction.hash}`}
        className="flex items-center justify-between py-4 px-5 bg-white border border-gray-100 rounded-2xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgb(0,0,0,0.06)] hover:border-gray-200 transition-all duration-300 group text-[13px]"
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${transaction.successful ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
            {transaction.successful ? (
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-gray-900 font-bold font-mono tracking-tight group-hover:text-black transition-colors">
                {shortenAddress(transaction.hash, 8)}
              </span>
            </div>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span>{timeAgo(transaction.created_at)}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
              <span className="text-gray-500 font-semibold">
                {renderDisplayInfo()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 pl-3">
          <svg className="w-4 h-4 text-gray-300 group-hover:text-black group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    );
  }
);


CompactTransactionRow.displayName = 'CompactTransactionRow';

export default CompactTransactionRow;
