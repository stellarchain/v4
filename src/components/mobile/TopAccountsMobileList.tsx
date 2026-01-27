'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RichListAccount, shortenAddress } from '@/lib/stellar';

interface TopAccountsMobileListProps {
    initialAccounts: RichListAccount[];
}

export default function TopAccountsMobileList({ initialAccounts }: TopAccountsMobileListProps) {
    const [accounts, setAccounts] = useState<RichListAccount[]>(initialAccounts);
    // Pagination would be implemented here in a full version

    return (
        <div className="space-y-3">
            {accounts.map((account) => (
                <div
                    key={account.account}
                    className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] p-3 relative overflow-hidden"
                >
                    {/* Rank Badge */}
                    <div className="absolute top-3 right-3">
                        <div className="bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-bold px-2 py-0.5 rounded-full border border-[var(--primary)]/20">
                            #{account.rank}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        {/* Verification Icon */}
                        <div className="mt-0.5">
                            {account.label?.verified ? (
                                <div className="w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20">
                                    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            ) : (
                                <div className="w-8 h-8 bg-[var(--success)]/10 rounded-full flex items-center justify-center border border-[var(--success)]/20">
                                    <svg className="w-4 h-4 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 pr-12">
                            {/* Account Name/Label */}
                            <div className="font-bold text-sm text-[var(--text-primary)] mb-0.5 truncate">
                                {account.label?.name || 'UNKNOWN'}
                            </div>

                            {/* Account Address */}
                            <Link href={`/account/${account.account}`} className="text-xs font-mono text-[var(--text-tertiary)] hover:text-[var(--primary)] transition-colors block mb-2">
                                {shortenAddress(account.account)}
                            </Link>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-y-2 gap-x-4 border-t border-[var(--border-subtle)] pt-2">
                                <div>
                                    <p className="text-[10px] uppercase text-[var(--text-muted)] font-medium">Balance</p>
                                    <p className="text-xs font-mono font-medium text-[var(--text-secondary)]">
                                        {(account.balance / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M XLM
                                    </p>
                                </div>

                                <div>
                                    <p className="text-[10px] uppercase text-[var(--text-muted)] font-medium">% of Coins</p>
                                    <p className="text-xs font-mono font-medium text-[var(--text-secondary)]">
                                        {parseFloat(account.percent_of_coins).toFixed(4)}%
                                    </p>
                                </div>

                                <div>
                                    <p className="text-[10px] uppercase text-[var(--text-muted)] font-medium">Transactions</p>
                                    <p className="text-xs font-mono font-medium text-[var(--text-secondary)]">
                                        {account.transactions.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
