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
          <span className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 border border-gray-200 rounded text-[10px] font-bold uppercase tracking-wide truncate max-w-[80px]">
              {info.functionName}
            </span>
            {info.effectAmount && info.effectAsset && (
              <span className={`flex items-center gap-1 ${info.effectType === 'received' ? 'text-emerald-600' : 'text-orange-600'}`}>
                <span className="text-[9px] font-bold uppercase">
                  {info.effectType === 'received' ? '↓' : '↑'}
                </span>
                <span className="font-bold">{formatCompact(info.effectAmount)}</span>
                <span className="text-[10px] uppercase font-bold opacity-70">{info.effectAsset}</span>
              </span>
            )}
          </span>
        );
      }

      if (info.type === 'manage_offer' && info.offerDetails) {
        return (
          <span className="flex items-center gap-1.5">
            <span className="text-gray-900 font-bold">Sell {formatCompact(info.offerDetails.amount)}</span>
            <span className="text-gray-400 text-[10px] uppercase font-bold">{info.offerDetails.sellingAsset}</span>
            <span className="text-gray-300">→</span>
            <span className="text-gray-400 text-[10px] uppercase font-bold">{info.offerDetails.buyingAsset}</span>
          </span>
        );
      }

      if ((info.type === 'multi_send' || info.type === 'bulk_send') && info.elementCount) {
        return (
          <span className="flex items-center gap-1.5">
            <span className="text-gray-900 font-bold">{info.elementCount}</span>
            <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Recipients</span>
            {info.amount && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-gray-900 font-bold">{formatCompact(info.amount)}</span>
              </>
            )}
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

      if (info?.type === 'manage_offer') {
        // Offer icon - purple tags
        return (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-purple-50 border-purple-100">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
        );
      }

      if (info?.type === 'multi_send' || info?.type === 'bulk_send') {
        // Multi Send icon - indigo users or stack
        return (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-indigo-50 border-indigo-100">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
        className="block bg-white border border-gray-100/75 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all duration-200 group relative overflow-hidden"
      >
        <div className="py-2.5 px-3 flex items-center gap-3">
          {/* Icon - Smaller & cleaner */}
          <div className="shrink-0 transform transition-transform group-hover:scale-105 duration-200">
            {(() => {
              if (!transaction.successful) {
                return (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 text-red-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                );
              }
              if (isSwap) {
                return (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </div>
                );
              }
              if (info?.type === 'manage_offer') {
                return (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-50 text-purple-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                );
              }
              if (info?.type === 'multi_send' || info?.type === 'bulk_send') {
                return (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                );
              }
              return (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              );
            })()}
          </div>

          <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
            {/* Primary Row: Type & Status */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 truncate">
                {info?.type === 'contract' && info.functionName ? (
                  <span className="capitalize">{info.functionName}</span>
                ) : info?.type === 'payment' ? (
                  <span>{isSwap ? 'Swap' : 'Payment'}</span>
                ) : info?.type === 'manage_offer' ? (
                  <span>Manage Offer</span>
                ) : info?.type === 'multi_send' || info?.type === 'bulk_send' ? (
                  <span>{info.type === 'bulk_send' ? 'Bulk Send' : 'Multi Send'}</span>
                ) : (
                  <span className="capitalize">{transaction.operation_count > 1 ? `${transaction.operation_count} Ops` : 'Transaction'}</span>
                )}
              </span>

              {/* Minimal Status Badge */}
              {!transaction.successful && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Proceesing Failed" />
              )}
            </div>

            {/* Secondary Row: Hash & Time */}
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium tracking-tight">
              <span className="font-mono hover:text-gray-600 transition-colors">{shortenAddress(transaction.hash, 4)}</span>
              <span className="opacity-50">•</span>
              <span>{timeAgo(transaction.created_at)}</span>
            </div>
          </div>

          {/* Right Side: Clean Values */}
          <div className="text-right flex flex-col justify-center items-end pl-2">
            {info?.type === 'payment' && info.amount ? (
              <div className="text-sm font-bold text-gray-900 tabular-nums">
                {isSwap ? '' : '+'}
                {formatCompact(info.amount)}
                <span className="text-[10px] text-gray-500 font-medium ml-1">{info.asset}</span>
              </div>
            ) : info?.type === 'contract' && (info.effectAmount || info.functionName) ? (
              <>
                {info.effectAmount ? (
                  <div className={`text-sm font-bold tabular-nums ${info.effectType === 'received' ? 'text-emerald-600' : 'text-orange-600'}`}>
                    {info.effectType === 'received' ? '+' : '-'}{formatCompact(info.effectAmount)}
                    <span className="text-[10px] font-medium ml-1 opacity-80">{info.effectAsset}</span>
                  </div>
                ) : (
                  <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    Contract Call
                  </div>
                )}
              </>
            ) : info?.type === 'manage_offer' && info.offerDetails ? (
              <div className="text-sm font-bold text-gray-900 tabular-nums">
                {formatCompact(info.offerDetails.amount)}
                <span className="text-[10px] text-gray-500 font-medium ml-1">{info.offerDetails.sellingAsset}</span>
              </div>
            ) : (info?.type === 'multi_send' || info?.type === 'bulk_send') ? (
              <div className="text-sm font-bold text-gray-900">
                {info.elementCount} <span className="text-[10px] text-gray-500 font-medium">Recipients</span>
              </div>
            ) : (
              <div className="text-[10px] font-bold text-gray-300 uppercase tracking-widest hover:text-gray-400 transition-colors">
                Details
              </div>
            )}
          </div>

        </div>
      </Link>
    );
  }
);


CompactTransactionRow.displayName = 'CompactTransactionRow';

export default CompactTransactionRow;
