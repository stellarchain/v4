'use client';

import { KnownAccount } from '@/lib/stellar';
import Link from 'next/link';

interface AccountDirectoryProps {
    initialAccounts: KnownAccount[];
}

export default function AccountDirectory({ initialAccounts }: AccountDirectoryProps) {
    return (
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-subtle)] overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-[var(--bg-tertiary)] border-b border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-5">Account</div>
                <div className="col-span-3 text-right">Balance</div>
                <div className="col-span-2 text-right">% Supply</div>
                <div className="col-span-1 text-center">Status</div>
            </div>

            {/* Account Rows */}
            <div className="divide-y divide-[var(--border-subtle)]">
                {initialAccounts.map((account, index) => {
                    // Parse balance and percentage from tags
                    const balanceTag = account.tags?.find(t => t.includes('XLM')) || '0 XLM';
                    const percentTag = account.tags?.find(t => t.includes('%')) || '';
                    const isVerified = account.tags?.includes('verified');

                    return (
                        <Link
                            href={`/account/${account.address}`}
                            key={account.address}
                            className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-[var(--bg-tertiary)] transition-colors group"
                        >
                            {/* Rank */}
                            <div className="col-span-1 flex items-center justify-center">
                                <span className={`text-sm font-bold ${index < 3
                                        ? 'text-[var(--primary)]'
                                        : 'text-[var(--text-muted)]'
                                    }`}>
                                    {index + 1}
                                </span>
                            </div>

                            {/* Account Info */}
                            <div className="col-span-5 flex items-center gap-3 min-w-0">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isVerified
                                        ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                                        : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                                    }`}>
                                    {account.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[var(--text-primary)] font-medium truncate group-hover:text-[var(--primary)] transition-colors">
                                            {account.name}
                                        </span>
                                        {isVerified && (
                                            <svg className="w-4 h-4 text-[#3b82f6] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                    {account.domain && (
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <svg className="w-3 h-3 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                            </svg>
                                            <span className="text-xs text-[var(--text-tertiary)]">
                                                {account.domain}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Balance */}
                            <div className="col-span-3 flex items-center justify-end">
                                <span className="text-[var(--text-primary)] font-semibold text-sm">
                                    {balanceTag}
                                </span>
                            </div>

                            {/* Percentage */}
                            <div className="col-span-2 flex items-center justify-end">
                                {percentTag && (
                                    <span className="px-2 py-1 rounded-2xl text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                                        {percentTag}
                                    </span>
                                )}
                            </div>

                            {/* Status */}
                            <div className="col-span-1 flex items-center justify-center">
                                {isVerified ? (
                                    <span className="px-2 py-1 rounded-full text-[10px] font-semibold uppercase bg-green-500/10 text-green-500">
                                        Known
                                    </span>
                                ) : (
                                    <span className="w-2 h-2 rounded-full bg-[var(--text-muted)]/30"></span>
                                )}
                            </div>
                        </Link>
                    );
                })}

                {initialAccounts.length === 0 && (
                    <div className="py-20 text-center">
                        <div className="w-16 h-16 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <h3 className="text-[var(--text-primary)] font-medium mb-1">No accounts found</h3>
                        <p className="text-[var(--text-muted)] text-sm">
                            Unable to load account data at this time.
                        </p>
                    </div>
                )}
            </div>

            {/* Footer */}
            {initialAccounts.length > 0 && (
                <div className="px-6 py-4 bg-[var(--bg-tertiary)] border-t border-[var(--border-subtle)] flex items-center justify-between">
                    <span className="text-xs text-[var(--text-muted)]">
                        Showing top {initialAccounts.length} accounts by XLM balance
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)]">
                        Data from Stellarchain API
                    </span>
                </div>
            )}
        </div>
    );
}
