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

    const getRankColor = (rank: number) => {
        if (rank === 1) return 'text-yellow-500';
        if (rank === 2) return 'text-gray-400';
        if (rank === 3) return 'text-amber-600';
        return 'text-[var(--text-muted)]';
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

                {/* Accounts Table */}
                <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                    {accounts.length === 0 ? (
                        <div className="px-4 py-12 text-center text-[var(--text-muted)] italic text-sm">
                            No accounts found
                        </div>
                    ) : (
                        accounts.map((account, index) => (
                            <Link
                                key={account.account}
                                href={`/account/${account.account}`}
                                className={`flex items-center px-3 py-3 active:bg-[var(--bg-tertiary)] transition-colors ${
                                    index % 2 === 1 ? 'bg-[var(--bg-primary)]/30' : ''
                                } ${index !== accounts.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''}`}
                            >
                                {/* Rank */}
                                <div className={`w-10 flex-shrink-0 text-sm font-bold ${getRankColor(account.rank)}`}>
                                    #{account.rank}
                                </div>

                                {/* Name & Address */}
                                <div className="flex-1 min-w-0 pr-3">
                                    <div className="flex items-center gap-1">
                                        <span className="text-sm font-semibold text-[var(--primary-blue)] truncate">
                                            {account.label?.name || 'Unknown'}
                                        </span>
                                        {account.label?.verified && (
                                            <svg className="w-3.5 h-3.5 flex-shrink-0 text-[var(--success)]" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                                        {shortenAddress(account.account, 4)}
                                    </div>
                                </div>

                                {/* Balance & Percentage */}
                                <div className="text-right flex-shrink-0">
                                    <div className="text-sm font-bold text-[var(--text-primary)]">
                                        {formatBalance(account.balance || 0)} <span className="text-[var(--text-muted)] font-normal text-xs">XLM</span>
                                    </div>
                                    <div className="text-[11px] text-[var(--text-muted)]">
                                        {parseFloat(account.percent_of_coins || '0').toFixed(2)}%
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
