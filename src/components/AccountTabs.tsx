'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Transaction, Operation, shortenAddress, timeAgo, getOperationTypeLabel } from '@/lib/stellar';

interface AccountTabsProps {
  transactions: Transaction[];
  operations: Operation[];
}

export default function AccountTabs({ transactions, operations }: AccountTabsProps) {
  const [activeTab, setActiveTab] = useState<'transactions' | 'operations'>('transactions');

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
      {/* Tab Headers - Glider Style */}
      <div className="p-2">
        {(() => {
          const tabs = [
            { id: 'transactions', label: 'Transactions', count: transactions.length },
            { id: 'operations', label: 'Operations', count: operations.length },
          ];
          const activeTabIndex = tabs.findIndex(tab => tab.id === activeTab);
          const tabCount = tabs.length;

          return (
            <div className="relative flex items-center bg-[var(--bg-tertiary)] p-1 rounded-xl">
              {/* Glider Background */}
              <div
                className="absolute top-1 bottom-1 bg-[var(--primary-blue)]/10 rounded-lg transition-all duration-300 ease-out z-0"
                style={{
                  left: '4px',
                  width: `calc((100% - 8px) / ${tabCount})`,
                  transform: `translateX(${activeTabIndex >= 0 ? activeTabIndex * 100 : 0}%)`,
                  opacity: activeTabIndex >= 0 ? 1 : 0
                }}
              />

              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'transactions' | 'operations')}
                    className={`relative z-10 flex-1 py-2 text-sm rounded-lg transition-colors duration-200 text-center flex items-center justify-center gap-2 ${
                      isActive
                        ? 'text-[var(--primary-blue)] font-bold'
                        : 'text-[var(--text-secondary)] font-semibold hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {tab.label}
                    <span className={`text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center bg-[var(--primary-blue)] text-white`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'transactions' && (
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <p className="text-[var(--text-muted)] text-center py-8">No transactions found</p>
            ) : (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-[var(--bg-secondary)] rounded-xl p-4 hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Status Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.successful ? 'bg-[var(--success-muted)]' : 'bg-[var(--error-muted)]'
                      }`}>
                        {tx.successful ? (
                          <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>

                      <div className="min-w-0">
                        <Link
                          href={`/transaction/${tx.hash}`}
                          className="text-[var(--primary)] hover:underline font-mono text-sm"
                        >
                          {shortenAddress(tx.hash, 8)}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[var(--text-muted)] text-xs">From:</span>
                          <Link
                            href={`/account/${tx.source_account}`}
                            className="text-[var(--text-tertiary)] hover:text-[var(--primary)] font-mono text-xs"
                          >
                            {shortenAddress(tx.source_account, 4)}
                          </Link>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="px-2 py-0.5 bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] rounded-xl text-xs">
                          {tx.operation_count} op{tx.operation_count !== 1 ? 's' : ''}
                        </span>
                        <Link
                          href={`/ledger/${tx.ledger}`}
                          className="text-[var(--text-muted)] hover:text-[var(--text-tertiary)] text-xs"
                        >
                          #{tx.ledger}
                        </Link>
                      </div>
                      <p className="text-[var(--text-muted)] text-xs mt-1">{timeAgo(tx.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'operations' && (
          <div className="space-y-2">
            {operations.length === 0 ? (
              <p className="text-[var(--text-muted)] text-center py-8">No operations found</p>
            ) : (
              operations.map((op) => (
                <div
                  key={op.id}
                  className="bg-[var(--bg-secondary)] rounded-xl p-4 hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Type Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        op.transaction_successful ? 'bg-[var(--info-muted)]' : 'bg-[var(--error-muted)]'
                      }`}>
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-xl text-xs font-medium">
                            {getOperationTypeLabel(op.type)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[var(--text-muted)] text-xs">Source:</span>
                          <Link
                            href={`/account/${op.source_account}`}
                            className="text-[var(--text-tertiary)] hover:text-[var(--primary)] font-mono text-xs"
                          >
                            {shortenAddress(op.source_account, 4)}
                          </Link>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {op.amount && (
                        <p className="text-[var(--text-primary)] font-medium text-sm">
                          {parseFloat(op.amount).toLocaleString()} {op.asset_code || 'XLM'}
                        </p>
                      )}
                      <p className="text-[var(--text-muted)] text-xs mt-1">{timeAgo(op.created_at)}</p>
                    </div>
                  </div>

                  {/* Additional Details */}
                  {(op.to || op.from) && (
                    <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center gap-4 text-xs">
                      {op.from && (
                        <div className="flex items-center gap-1">
                          <span className="text-[var(--text-muted)]">From:</span>
                          <Link href={`/account/${op.from}`} className="text-[var(--text-tertiary)] hover:text-[var(--primary)] font-mono">
                            {shortenAddress(op.from, 4)}
                          </Link>
                        </div>
                      )}
                      {op.to && (
                        <div className="flex items-center gap-1">
                          <span className="text-[var(--text-muted)]">To:</span>
                          <Link href={`/account/${op.to}`} className="text-[var(--text-tertiary)] hover:text-[var(--primary)] font-mono">
                            {shortenAddress(op.to, 4)}
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
