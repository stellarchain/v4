'use client';

import Link from 'next/link';
import { Transaction, shortenAddress, timeAgo } from '@/lib/stellar';
import { forwardRef } from 'react';
import { interactive, spacing } from '@/lib/design-system';

interface CompactTransactionRowProps {
  transaction: Transaction;
}

const CompactTransactionRow = forwardRef<HTMLAnchorElement, CompactTransactionRowProps>(
  ({ transaction }, ref) => {
    const info = transaction.displayInfo;

    // Format numbers compactly
    const formatCompact = (numStr: string | undefined): string => {
      if (!numStr) return '0';
      const num = parseFloat(numStr);
      if (isNaN(num)) return '0';
      if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
      return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    };

    const isCredit = info?.effectType === 'received' || (info?.type === 'payment' && !titleIsSent(transaction));

    // Helper to determine if payment is sent or received (simple heuristic)
    function titleIsSent(tx: Transaction) {
      // In global list, we usually see generic perspective, but let's assume credit green, debit red/black
      return false;
    }

    return (
      <Link
        ref={ref}
        href={`/transaction/${transaction.hash}`}
        className={`block border-b border-slate-200/50 ${interactive.row}`}
      >
        <div className={`flex items-center justify-between ${spacing.rowPaddingCompact}`}>
          {/* Left Side: Icon & Title/Meta */}
          <div className="flex items-start space-x-3">
            <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${transaction.successful
              ? 'bg-emerald-50 text-emerald-500'
              : 'bg-red-50 text-red-500'
              }`}>
              {transaction.successful ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>

            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 leading-tight capitalize">
                {info?.type === 'contract'
                  ? (info.functionName || 'Smart Contract')
                  : info?.type === 'payment'
                    ? 'Payment'
                    : 'Transaction'}
              </span>
              <span className="text-xs text-slate-400 font-medium font-mono mt-0.5 flex items-center">
                {shortenAddress(transaction.hash, 4)}
                <span className="mx-1 text-slate-300">•</span>
                {timeAgo(transaction.created_at)}
              </span>
            </div>
          </div>

          {/* Right Side: Amount or Label */}
          <div className="text-right">
            {(info?.type === 'payment' && info.amount) || (info?.type === 'contract' && info.effectAmount) ? (
              <span className={`text-xs font-bold ${info.effectType === 'received' || info?.type === 'payment'
                ? 'text-emerald-600'
                : 'text-slate-900'
                }`}>
                {info.effectType === 'received' || info?.type === 'payment' ? '+' : ''}
                {formatCompact(info.amount || info.effectAmount)} {info.asset || info.effectAsset}
              </span>
            ) : (
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {info?.type === 'contract' ? (info.functionName || 'Contract') : 'Details'}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }
);


CompactTransactionRow.displayName = 'CompactTransactionRow';

export default CompactTransactionRow;
