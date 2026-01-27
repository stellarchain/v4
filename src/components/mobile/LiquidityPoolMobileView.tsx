'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LiquidityPool, Operation, Transaction, LiquidityPoolTrade, LiquidityPoolEffect, shortenAddress, timeAgo } from '@/lib/stellar';

interface LiquidityPoolMobileViewProps {
    pool: LiquidityPool;
    operations: Operation[];
    transactions: Transaction[];
    trades: LiquidityPoolTrade[];
    effects: LiquidityPoolEffect[];
}

export default function LiquidityPoolMobileView({ pool, operations, transactions, trades, effects }: LiquidityPoolMobileViewProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'operations' | 'trades' | 'effects'>('overview');
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(pool.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getAssetCode = (assetString: string) => {
        if (assetString === 'native') return 'XLM';
        const parts = assetString.split(':');
        return parts[0] || 'UNK';
    };

    const getAssetIssuer = (assetString: string) => {
        if (assetString === 'native') return null;
        const parts = assetString.split(':');
        return parts[1] || null;
    };

    const formatAmount = (amount: string) => {
        const num = parseFloat(amount);
        if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
        if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
        if (num >= 1) return num.toFixed(2);
        return num.toFixed(4);
    };

    const formatFullAmount = (amount: string) => {
        const num = parseFloat(amount);
        return num.toLocaleString(undefined, { maximumFractionDigits: 7 });
    };

    const assetA = pool.reserves[0];
    const assetB = pool.reserves[1];
    const codeA = getAssetCode(assetA.asset);
    const codeB = getAssetCode(assetB.asset);
    const issuerA = getAssetIssuer(assetA.asset);
    const issuerB = getAssetIssuer(assetB.asset);

    // Calculate price ratio
    const amountA = parseFloat(assetA.amount);
    const amountB = parseFloat(assetB.amount);
    const priceRatio = amountA > 0 ? (amountB / amountA).toFixed(4) : '0';

    const tabs = [
        { id: 'overview', label: 'Info' },
        { id: 'trades', label: 'Trades' },
        { id: 'effects', label: 'Effects' },
        { id: 'transactions', label: 'Txns' },
        { id: 'operations', label: 'Ops' },
    ] as const;

    return (
        <div className="bg-[var(--bg-primary)] text-[var(--text-secondary)] min-h-screen flex flex-col font-sans pb-24">
            <main className="flex-1 px-4 pt-3 pb-8 max-w-lg mx-auto w-full">
                {/* Pool Header Card */}
                <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-4 mb-4">
                    {/* Pool Identity */}
                    <div className="flex items-center gap-3">
                        {/* Icon */}
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-[var(--text-primary)] truncate">
                                    {codeA} / {codeB}
                                </span>
                                {/* Back Button */}
                                <Link
                                    href="/liquidity-pools"
                                    className="ml-auto flex-shrink-0 p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </Link>
                            </div>
                            <div className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-wide">
                                Liquidity Pool
                            </div>
                        </div>
                    </div>

                    {/* Pool ID - Compact */}
                    <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                        <div className="flex items-center justify-between gap-2">
                            <div className="font-mono text-[11px] text-[var(--text-muted)] truncate flex-1">{pool.id}</div>
                            <button
                                onClick={handleCopy}
                                className="text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 flex-shrink-0"
                                style={{ color: 'var(--primary-blue)' }}
                            >
                                {copied ? 'Copied!' : 'Copy'}
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-4 bg-[var(--bg-secondary)] rounded-xl p-1 border border-[var(--border-subtle)]">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${activeTab === tab.id
                                ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                                : 'text-[var(--text-muted)]'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="space-y-4">
                        {/* Reserve Assets */}
                        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] p-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Reserve Assets</h3>
                            <div className="space-y-3">
                                {/* Asset A */}
                                <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-bold text-[var(--text-primary)]">{codeA}</span>
                                        <span className="font-mono text-sm text-[var(--text-primary)]">{formatAmount(assetA.amount)}</span>
                                    </div>
                                    {issuerA && (
                                        <Link
                                            href={`/account/${issuerA}`}
                                            className="text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--primary-blue)]"
                                        >
                                            {shortenAddress(issuerA, 6)}
                                        </Link>
                                    )}
                                    {!issuerA && (
                                        <span className="text-[10px] text-[var(--text-muted)]">Native Asset</span>
                                    )}
                                </div>

                                {/* Swap Arrow */}
                                <div className="flex justify-center">
                                    <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                                        <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Asset B */}
                                <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-bold text-[var(--text-primary)]">{codeB}</span>
                                        <span className="font-mono text-sm text-[var(--text-primary)]">{formatAmount(assetB.amount)}</span>
                                    </div>
                                    {issuerB && (
                                        <Link
                                            href={`/account/${issuerB}`}
                                            className="text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--primary-blue)]"
                                        >
                                            {shortenAddress(issuerB, 6)}
                                        </Link>
                                    )}
                                    {!issuerB && (
                                        <span className="text-[10px] text-[var(--text-muted)]">Native Asset</span>
                                    )}
                                </div>
                            </div>

                            {/* Exchange Rate */}
                            <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                                <div className="text-xs text-[var(--text-muted)]">Exchange Rate</div>
                                <div className="font-mono text-sm text-[var(--text-primary)]">
                                    1 {codeA} = {priceRatio} {codeB}
                                </div>
                            </div>
                        </div>

                        {/* Pool Stats */}
                        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] p-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Pool Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-wide">Type</div>
                                    <div className="text-sm font-medium text-[var(--text-primary)] mt-1 capitalize">{pool.type.replace('_', ' ')}</div>
                                </div>
                                <div>
                                    <div className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-wide">Total Shares</div>
                                    <div className="text-sm font-mono text-[var(--text-primary)] mt-1">{formatFullAmount(pool.total_shares)}</div>
                                </div>
                                <div>
                                    <div className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-wide">Trustlines</div>
                                    <div className="text-sm font-medium text-[var(--text-primary)] mt-1">{pool.total_trustlines.toLocaleString()}</div>
                                </div>
                                <div>
                                    <div className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-wide">Fee</div>
                                    <div className="text-sm font-medium text-[var(--text-primary)] mt-1">
                                        {pool.fee_bp ? `${(pool.fee_bp / 100).toFixed(2)}%` : '0.30%'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-wide">Last Modified</div>
                                    <div className="text-sm font-medium text-[var(--text-primary)] mt-1">
                                        {pool.last_modified_time ? timeAgo(pool.last_modified_time) : '-'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-wide">Ledger</div>
                                    <Link
                                        href={`/ledger/${pool.last_modified_ledger}`}
                                        className="text-sm font-mono mt-1 block"
                                        style={{ color: 'var(--primary-blue)' }}
                                    >
                                        {pool.last_modified_ledger?.toLocaleString() || '-'}
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'transactions' && (
                    <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                        {transactions.length === 0 ? (
                            <div className="p-8 text-center text-[var(--text-muted)]">
                                <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <p className="text-sm">No transactions found</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[var(--border-subtle)]">
                                {transactions.map((tx) => (
                                    <Link
                                        key={tx.id}
                                        href={`/transaction/${tx.hash}`}
                                        className="flex items-center gap-3 p-3 active:bg-[var(--bg-tertiary)] transition-colors"
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.successful ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                            }`}>
                                            {tx.successful ? (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-mono text-xs text-[var(--text-primary)] truncate">
                                                {shortenAddress(tx.hash, 8)}
                                            </div>
                                            <div className="text-[10px] text-[var(--text-muted)]">
                                                {tx.operation_count} operation{tx.operation_count !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] text-[var(--text-muted)]">
                                                {timeAgo(tx.created_at)}
                                            </div>
                                        </div>
                                        <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'trades' && (
                    <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                        {trades.length === 0 ? (
                            <div className="p-8 text-center text-[var(--text-muted)]">
                                <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                <p className="text-sm">No trades found</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[var(--border-subtle)]">
                                {trades.map((trade) => {
                                    const baseAsset = trade.base_asset_type === 'native' ? 'XLM' : trade.base_asset_code || 'UNK';
                                    const counterAsset = trade.counter_asset_type === 'native' ? 'XLM' : trade.counter_asset_code || 'UNK';
                                    return (
                                        <div
                                            key={trade.id}
                                            className="p-3"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-500/10 text-cyan-500">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="font-mono text-red-400">-{formatAmount(trade.base_amount)}</span>
                                                        <span className="text-[var(--text-muted)]">{baseAsset}</span>
                                                        <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                        </svg>
                                                        <span className="font-mono text-green-400">+{formatAmount(trade.counter_amount)}</span>
                                                        <span className="text-[var(--text-muted)]">{counterAsset}</span>
                                                    </div>
                                                    {trade.base_account && (
                                                        <Link
                                                            href={`/account/${trade.base_account}`}
                                                            className="font-mono text-[10px] text-[var(--text-muted)] hover:text-[var(--primary-blue)]"
                                                        >
                                                            {shortenAddress(trade.base_account, 6)}
                                                        </Link>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] text-[var(--text-muted)]">
                                                        {timeAgo(trade.ledger_close_time)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'effects' && (
                    <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                        {effects.length === 0 ? (
                            <div className="p-8 text-center text-[var(--text-muted)]">
                                <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <p className="text-sm">No effects found</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[var(--border-subtle)]">
                                {effects.map((effect) => {
                                    const isDeposit = effect.type.includes('deposit');
                                    const isWithdraw = effect.type.includes('withdraw');
                                    return (
                                        <div
                                            key={effect.id}
                                            className="p-3"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDeposit ? 'bg-green-500/10 text-green-500' : isWithdraw ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                                                    }`}>
                                                    {isDeposit ? (
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                        </svg>
                                                    ) : isWithdraw ? (
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-medium text-[var(--text-primary)] capitalize">
                                                        {effect.type.replace(/_/g, ' ')}
                                                    </div>
                                                    <Link
                                                        href={`/account/${effect.account}`}
                                                        className="font-mono text-[10px] text-[var(--text-muted)] hover:text-[var(--primary-blue)]"
                                                    >
                                                        {shortenAddress(effect.account, 6)}
                                                    </Link>
                                                    {effect.shares_received && (
                                                        <div className="text-[10px] text-green-400">+{formatAmount(effect.shares_received)} shares</div>
                                                    )}
                                                    {effect.shares_redeemed && (
                                                        <div className="text-[10px] text-red-400">-{formatAmount(effect.shares_redeemed)} shares</div>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] text-[var(--text-muted)]">
                                                        {timeAgo(effect.created_at)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'operations' && (
                    <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                        {operations.length === 0 ? (
                            <div className="p-8 text-center text-[var(--text-muted)]">
                                <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <p className="text-sm">No operations found</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[var(--border-subtle)]">
                                {operations.map((op) => (
                                    <Link
                                        key={op.id}
                                        href={`/transaction/${op.transaction_hash}`}
                                        className="flex items-center gap-3 p-3 active:bg-[var(--bg-tertiary)] transition-colors"
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${op.transaction_successful ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'
                                            }`}>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-medium text-[var(--text-primary)] capitalize">
                                                {op.type.replace(/_/g, ' ')}
                                            </div>
                                            <div className="font-mono text-[10px] text-[var(--text-muted)] truncate">
                                                {shortenAddress(op.source_account, 6)}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] text-[var(--text-muted)]">
                                                {timeAgo(op.created_at)}
                                            </div>
                                        </div>
                                        <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
