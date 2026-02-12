'use client';

import Link from 'next/link';
import { Operation, shortenAddress, timeAgo, getOperationTypeLabel, formatXLM } from '@/lib/stellar';
import { forwardRef } from 'react';
import { cn } from '@/lib/shared/designSystem';
import { txRoute } from '@/lib/shared/routes';

interface CompactOperationRowProps {
  operation: Operation;
}

// Get icon based on operation type
const getOperationIcon = (type: string) => {
  switch (type) {
    case 'payment':
    case 'path_payment_strict_receive':
    case 'path_payment_strict_send':
      return (
        <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      );
    case 'create_account':
      return (
        <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      );
    case 'manage_buy_offer':
    case 'manage_sell_offer':
    case 'create_passive_sell_offer':
      return (
        <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      );
    case 'change_trust':
      return (
        <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    case 'set_options':
      return (
        <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'invoke_host_function':
      return (
        <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
  }
};

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
        href={txRoute(operation.transaction_hash)}
        className="flex items-center justify-between py-4 px-4 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:border-[var(--border-default)] transition-[colors,box-shadow,border-color] duration-300 group text-[13px]"
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
              operation.transaction_successful
                ? 'bg-[var(--success-muted)] border-[var(--success)]/30 text-[var(--success)]'
                : 'bg-[var(--error-muted)] border-[var(--error)]/30 text-[var(--error)]'
            )}
          >
            {getOperationIcon(operation.type)}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[var(--text-primary)] font-bold tracking-tight group-hover:text-[var(--primary-blue)] transition-colors capitalize">
                {getOperationTypeLabel(operation.type)}
              </span>
            </div>
            <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">
              {timeAgo(operation.created_at)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {amount && (
            <div className="text-right">
              <span className="text-[var(--text-primary)] font-bold font-mono">{formatXLM((amount || '').split(' ')[0])}</span>
              <span className="text-[var(--text-muted)] ml-1 text-[10px] uppercase font-bold tracking-wider">XLM</span>
            </div>
          )}
          <div className="text-right hidden sm:block">
            <span className="text-[var(--text-tertiary)] font-mono text-[12px] font-medium">
              {shortenAddress(operation.source_account)}
            </span>
          </div>
          <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 transition-[color,transform]" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    );
  }
);

CompactOperationRow.displayName = 'CompactOperationRow';

export default CompactOperationRow;
