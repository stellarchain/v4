'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Transaction, Operation, shortenAddress, timeAgo, getOperationTypeLabel } from '@/lib/stellar';
import GliderTabs from '@/components/ui/GliderTabs';

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
        <GliderTabs
          size="md"
          className="bg-[var(--bg-tertiary)] shadow-none border-0"
          tabs={[
            { id: 'transactions', label: 'Transactions', count: transactions.length },
            { id: 'operations', label: 'Operations', count: operations.length },
          ]}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id)}
        />
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'transactions' && (
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <p className="text-[var(--text-muted)] text-center py-4">No transactions found</p>
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
                          {shortenAddress(tx.hash)}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[var(--text-muted)] text-xs">From:</span>
                          <Link
                            href={`/account/${tx.source_account}`}
                            className="text-[var(--text-tertiary)] hover:text-[var(--primary)] font-mono text-xs"
                          >
                            {shortenAddress(tx.source_account)}
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
                          href={`/ledger/${tx.ledger_attr}`}
                          className="text-[var(--text-muted)] hover:text-[var(--text-tertiary)] text-xs"
                        >
                          #{tx.ledger_attr}
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
              <p className="text-[var(--text-muted)] text-center py-4">No operations found</p>
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
                            {shortenAddress(op.source_account)}
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
                            {shortenAddress(op.from)}
                          </Link>
                        </div>
                      )}
                      {op.to && (
                        <div className="flex items-center gap-1">
                          <span className="text-[var(--text-muted)]">To:</span>
                          <Link href={`/account/${op.to}`} className="text-[var(--text-tertiary)] hover:text-[var(--primary)] font-mono">
                            {shortenAddress(op.to)}
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
