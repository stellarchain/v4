'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RichListAccount, shortenAddress } from '@/lib/stellar';

interface TopAccountsMobileListProps {
    initialAccounts: RichListAccount[];
    totalAccounts: number;
}

export default function TopAccountsMobileList({ initialAccounts, totalAccounts }: TopAccountsMobileListProps) {
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
                            {totalAccounts.toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* Accounts List - Compact Cards */}
                {accounts.length === 0 ? (
                    <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-4 text-center text-[var(--text-muted)] italic text-sm">
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
                                                {account.label?.verified ? (
                                                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="#1D9BF0">
                                                        <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"/>
                                                    </svg>
                                                ) : account.label?.name ? (
                                                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="#6B7280">
                                                        <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484z"/>
                                                        <circle cx="12" cy="10" r="3" fill="white"/>
                                                        <path d="M18 18.5c0-2.5-2.7-4.5-6-4.5s-6 2-6 4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="#6B7280">
                                                        <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484z"/>
                                                        <text x="12" y="16" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">?</text>
                                                    </svg>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                                {shortenAddress(account.account)}
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
