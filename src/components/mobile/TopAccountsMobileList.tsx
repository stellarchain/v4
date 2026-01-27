'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RichListAccount, shortenAddress } from '@/lib/stellar';

interface TopAccountsMobileListProps {
    initialAccounts: RichListAccount[];
}

export default function TopAccountsMobileList({ initialAccounts }: TopAccountsMobileListProps) {
    const [accounts] = useState<RichListAccount[]>(initialAccounts || []);

    const formatBalance = (balance: number) => {
        if (balance >= 1e9) return `${(balance / 1e9).toFixed(2)}B`;
        if (balance >= 1e6) return `${(balance / 1e6).toFixed(2)}M`;
        if (balance >= 1e3) return `${(balance / 1e3).toFixed(2)}K`;
        return balance.toFixed(2);
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pb-20 pt-1">
            <div className="px-3">
                {/* Mobile Header - Matching transactions/ledgers style */}
                <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-primary)]">
                            Top Accounts
                        </span>
                        <span className="bg-[var(--success)]/10 text-[var(--success)] text-[10px] px-1.5 py-0.5 rounded font-bold">
                            Top 50
                        </span>
                    </div>
                </div>

                {/* Accounts List - Matching transactions/ledgers card style */}
                <div className="space-y-2">
                    {accounts.length === 0 ? (
                        <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-12 text-center text-[var(--text-muted)] italic text-sm">
                            No accounts found
                        </div>
                    ) : (
                        accounts.map((account) => (
                            <Link
                                key={account.account}
                                href={`/account/${account.account}`}
                                className="block bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] active:bg-[var(--bg-tertiary)] transition-colors"
                            >
                                <div className="px-3 py-3 flex items-center justify-between">
                                    <div className="flex items-start space-x-3">
                                        <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                                            account.label?.verified
                                                ? 'bg-[var(--success)]/10 text-[var(--success)]'
                                                : 'bg-[var(--primary-blue)]/10 text-[var(--primary-blue)]'
                                        }`}>
                                            {account.label?.verified ? (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-bold leading-tight text-[var(--primary-blue)]">
                                                    {account.label?.name || 'Unknown'}
                                                </span>
                                                {account.label?.verified && (
                                                    <svg className="w-3.5 h-3.5 text-[var(--success)]" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                )}
                                            </div>
                                            <span className="text-xs text-[var(--text-muted)] font-medium font-mono mt-0.5">
                                                {shortenAddress(account.account, 4)} • #{account.rank}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-[var(--text-primary)]">
                                            {formatBalance(account.balance || 0)} <span className="text-[var(--text-muted)] font-medium">XLM</span>
                                        </div>
                                        <div className="text-[11px] text-[var(--text-muted)]">
                                            {parseFloat(account.percent_of_coins || '0').toFixed(2)}%
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
