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
                {/* Header */}
                <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-primary)]">
                            Top Accounts
                        </span>
                        <span className="bg-[var(--primary-blue)]/10 text-[var(--primary-blue)] text-[10px] px-1.5 py-0.5 rounded font-bold">
                            Top 50
                        </span>
                    </div>
                </div>

                {/* Accounts List - Compact Cards */}
                {accounts.length === 0 ? (
                    <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-12 text-center text-[var(--text-muted)] italic text-sm">
                        No accounts found
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        {accounts.map((account) => (
                            <Link
                                key={account.account}
                                href={`/account/${account.account}`}
                                className="block bg-[var(--bg-secondary)] rounded-lg shadow-sm border border-[var(--border-subtle)] active:bg-[var(--bg-tertiary)] transition-colors"
                            >
                                <div className="px-3 py-2">
                                    {/* Single Row Layout */}
                                    <div className="flex items-center">
                                        {/* Rank */}
                                        <span className={`w-7 flex-shrink-0 text-[13px] font-bold ${
                                            account.rank === 1 ? 'text-yellow-500' :
                                            account.rank === 2 ? 'text-gray-400' :
                                            account.rank === 3 ? 'text-amber-600' :
                                            'text-[var(--text-muted)]'
                                        }`}>
                                            #{account.rank}
                                        </span>

                                        {/* Name & Address */}
                                        <div className="flex-1 min-w-0 mr-2">
                                            <div className="flex items-center gap-1">
                                                <span className="text-[13px] font-semibold text-[var(--primary-blue)] truncate">
                                                    {account.label?.name || 'Unknown'}
                                                </span>
                                                {account.label?.verified && (
                                                    <svg className="w-3 h-3 flex-shrink-0 text-[var(--success)]" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                                {shortenAddress(account.account, 4)}
                                            </span>
                                        </div>

                                        {/* Balance & Percentage */}
                                        <div className="text-right flex-shrink-0">
                                            <div className="text-[13px] font-bold text-[var(--text-primary)]">
                                                {formatBalance(account.balance || 0)} <span className="text-[var(--text-muted)] font-normal text-[10px]">XLM</span>
                                            </div>
                                            <div className="text-[10px] text-[var(--text-muted)]">
                                                {parseFloat(account.percent_of_coins || '0').toFixed(2)}%
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
