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
        className="data-row flex items-center justify-between py-3 px-4 group text-[13px]"
      >
        <div className="flex items-center gap-3">
          <div className={`icon-container-sm ${operation.transaction_successful ? 'bg-[var(--info-muted)]' : 'bg-[var(--error-muted)]'}`}>
            <svg className="w-4 h-4 text-[var(--info)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <span className="text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
              {getOperationTypeLabel(operation)}
            </span>
            <span className="text-[var(--text-tertiary)] ml-2 text-[12px]">{timeAgo(operation.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-5">
          {amount && (
            <span className="text-[var(--primary)] font-mono font-medium">{amount}</span>
          )}
          <div className="text-right hidden sm:block">
            <span className="text-[var(--text-secondary)] font-mono text-[12px]">
              {shortenAddress(operation.source_account, 4)}
            </span>
          </div>
          <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    );
  }
);

CompactOperationRow.displayName = 'CompactOperationRow';

export default CompactOperationRow;
