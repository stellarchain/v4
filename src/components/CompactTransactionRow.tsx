'use client';

import Link from 'next/link';
import { Transaction, shortenAddress, timeAgo } from '@/lib/stellar';
import { forwardRef } from 'react';

interface CompactTransactionRowProps {
  transaction: Transaction;
}

const CompactTransactionRow = forwardRef<HTMLAnchorElement, CompactTransactionRowProps>(
  ({ transaction }, ref) => {
    const info = transaction.displayInfo;
    const isSwap = info?.isSwap;

    // Format numbers compactly for display
    const formatCompact = (numStr: string | undefined): string => {
      if (!numStr) return '0';
      const num = parseFloat(numStr);
      if (isNaN(num)) return '0';

      if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
      } else if (num >= 1000) {
        return (num / 1000).toFixed(2) + 'K';
      } else if (num >= 1) {
        return num.toFixed(2);
      } else if (num >= 0.01) {
        return num.toFixed(4);
      } else {
        return num.toPrecision(4);
      }
    };

    // Determine what to display based on displayInfo
    const renderDisplayInfo = () => {
      if (!info) {
        return (
          <>
            <span className="text-gray-900 font-bold">{transaction.operation_count}</span>
            <span className="text-gray-400 ml-1 text-[10px] uppercase font-bold tracking-wider">OPS</span>
          </>
        );
      }

      if (info.type === 'payment' && info.amount && info.asset) {
        if (isSwap && info.sourceAmount && info.sourceAsset) {
          // Clean swap display without badge
          return (
            <span className="flex items-center gap-1.5">
              <span className="text-gray-900 font-bold">{formatCompact(info.sourceAmount)}</span>
              <span className="text-gray-400 text-[10px] uppercase font-bold">{info.sourceAsset}</span>
              <span className="text-gray-300">→</span>
              <span className="text-gray-900 font-bold">{formatCompact(info.amount)}</span>
              <span className="text-gray-400 text-[10px] uppercase font-bold">{info.asset}</span>
            </span>
          );
        }
        return (
          <>
            <span className="text-gray-900 font-bold">{formatCompact(info.amount)}</span>
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

      return (
        <>
          <span className="text-gray-900 font-bold">{transaction.operation_count}</span>
          <span className="text-gray-400 ml-1 text-[10px] uppercase font-bold tracking-wider">OPS</span>
        </>
      );
    };

    // Render icon based on transaction type
    const renderIcon = () => {
      if (!transaction.successful) {
        return (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-red-50 border-red-100">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      }

      if (isSwap) {
        // Swap icon - blue background with swap arrows
        return (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-blue-50 border-blue-100">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
        );
      }

      // Default success icon
      return (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-emerald-50 border-emerald-100">
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    };

    return (
      <Link
        ref={ref}
        href={`/transaction/${transaction.hash}`}
        className="block bg-white border border-gray-100 rounded-2xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgb(0,0,0,0.06)] hover:border-gray-200 transition-all duration-300 group text-[13px] relative overflow-hidden"
      >
        <div className="p-4 flex items-center gap-4">
          {renderIcon()}

          <div className="min-w-0 flex-1 flex flex-col justify-center">
            {/* Top Row: Hash and Time */}
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-gray-900 font-bold font-mono tracking-tight group-hover:text-black transition-colors">
                {shortenAddress(transaction.hash, 8)}
              </span>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  {timeAgo(transaction.created_at)}
                </span>
                <svg className="w-4 h-4 text-gray-300 group-hover:text-black group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Bottom Row: Transaction Info */}
            <div className="text-[11px] text-gray-500 font-semibold flex items-center min-h-[1.25rem]">
              {renderDisplayInfo()}
            </div>
          </div>
        </div>
      </Link>
    );
  }
);


CompactTransactionRow.displayName = 'CompactTransactionRow';

export default CompactTransactionRow;
