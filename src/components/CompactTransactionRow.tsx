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
            <span className="text-[var(--text-primary)] font-mono">{transaction.operation_count}</span>
            <span className="text-[var(--text-tertiary)] ml-1.5 text-[12px]">ops</span>
          </>
        );
      }

      if (info.type === 'payment' && info.amount && info.asset) {
        return (
          <>
            <span className="text-[var(--primary)] font-semibold">{info.amount}</span>
            <span className="text-[var(--text-tertiary)] ml-1.5 text-[12px]">{info.asset}</span>
          </>
        );
      }

      if (info.type === 'contract' && info.functionName) {
        return (
          <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-md text-[11px] font-medium truncate max-w-[100px]">
            {info.functionName}
          </span>
        );
      }

      // Fallback for 'other' type
      return (
        <>
          <span className="text-[var(--text-primary)] font-mono">{transaction.operation_count}</span>
          <span className="text-[var(--text-tertiary)] ml-1.5 text-[12px]">ops</span>
        </>
      );
    };

    return (
      <Link
        ref={ref}
        href={`/transaction/${transaction.hash}`}
        className="flex items-center justify-between py-4 px-5 bg-[var(--bg-secondary)] rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group text-[13px]"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`icon-container-sm shrink-0 ${transaction.successful ? 'bg-[var(--success-muted)]' : 'bg-[var(--error-muted)]'}`}>
            {transaction.successful ? (
              <svg className="w-4 h-4 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-[var(--error)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <div className="min-w-0">
            <span className="text-[var(--text-primary)] font-mono group-hover:text-[var(--primary)] transition-colors">
              {shortenAddress(transaction.hash, 6)}
            </span>
            <span className="text-[var(--text-tertiary)] ml-2 text-[12px]">{timeAgo(transaction.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right flex items-center">
            {renderDisplayInfo()}
          </div>
          <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    );
  }
);

CompactTransactionRow.displayName = 'CompactTransactionRow';

export default CompactTransactionRow;
