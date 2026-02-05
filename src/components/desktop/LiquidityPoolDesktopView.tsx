'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LiquidityPool, Operation, Transaction, LiquidityPoolTrade, LiquidityPoolEffect, shortenAddress, timeAgo, enrichTradesWithTransactionHashes } from '@/lib/stellar';

interface LiquidityPoolDesktopViewProps {
    pool: LiquidityPool;
    operations: Operation[];
    transactions: Transaction[];
    trades: LiquidityPoolTrade[];
    effects: LiquidityPoolEffect[];
}

export default function LiquidityPoolDesktopView({ pool, operations, transactions, trades: initialTrades, effects }: LiquidityPoolDesktopViewProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'operations' | 'trades' | 'effects'>('overview');
    const [copied, setCopied] = useState(false);
    const [trades, setTrades] = useState<LiquidityPoolTrade[]>(initialTrades);
    const [loadingTxHashes, setLoadingTxHashes] = useState(false);

    // Primary color for this design
    const primaryColor = '#0F4C81';

    // Fetch transaction hashes for trades when on trades tab
    useEffect(() => {
        if (activeTab !== 'trades' || loadingTxHashes) return;
        if (trades.every(t => t.transaction_hash)) return;

        setLoadingTxHashes(true);
        enrichTradesWithTransactionHashes(trades)
            .then(enrichedTrades => {
                setTrades(enrichedTrades);
            })
            .finally(() => {
                setLoadingTxHashes(false);
            });
    }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

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
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
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
    const amountA = parseFloat(assetA.amount);
    const amountB = parseFloat(assetB.amount);
    const priceRatio = amountA > 0 ? (amountB / amountA).toFixed(6) : '0';
    const priceRatioReverse = amountB > 0 ? (amountA / amountB).toFixed(6) : '0';

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'trades', label: 'Trades', count: trades.length },
        { id: 'effects', label: 'Effects', count: effects.length },
        { id: 'transactions', label: 'Transactions', count: transactions.length },
        { id: 'operations', label: 'Operations', count: operations.length },
    ] as const;

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] py-8">
            <div className="max-w-[1400px] mx-auto px-6">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-4 mb-4">
                        <Link
                            href="/liquidity-pools"
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-muted)] transition hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div className="flex items-center gap-3">
                            {/* Asset pair badges */}
                            <div className="flex items-center">
                                <div className="w-11 h-11 rounded-full bg-[var(--bg-secondary)] border-2 border-[var(--bg-primary)] flex items-center justify-center text-sm font-bold text-[var(--text-primary)] shadow-sm z-10">
                                    {codeA.slice(0, 3)}
                                </div>
                                <div className="w-11 h-11 rounded-full bg-[var(--bg-secondary)] border-2 border-[var(--bg-primary)] flex items-center justify-center text-sm font-bold text-[var(--text-primary)] shadow-sm -ml-3">
                                    {codeB.slice(0, 3)}
                                </div>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold" style={{ color: primaryColor }}>{codeA} / {codeB}</h1>
                                <div className="text-sm text-[var(--text-muted)]">Liquidity Pool</div>
                            </div>
                        </div>
                        {/* Quick stats */}
                        <div className="flex items-center gap-3 ml-auto">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)]">
                                <span className="text-xs text-[var(--text-muted)]">Fee</span>
                                <span className="text-sm font-semibold text-[var(--text-primary)]">{(pool.fee_bp / 100).toFixed(2)}%</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)]">
                                <span className="text-xs text-[var(--text-muted)]">Trustlines</span>
                                <span className="text-sm font-semibold text-[var(--text-primary)]">{pool.total_trustlines}</span>
                            </div>
                        </div>
                    </div>

                    {/* Pool ID */}
                    <div className="flex items-center gap-2 bg-[var(--bg-secondary)] rounded-lg px-4 py-2 border border-[var(--border-subtle)] w-fit">
                        <span className="font-mono text-sm text-[var(--text-tertiary)]">{pool.id}</span>
                        <button
                            onClick={handleCopy}
                            className="text-xs font-semibold px-2 py-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                            style={{ color: 'var(--primary-blue)' }}
                        >
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-6">
                    {/* Left Column - Pool Info */}
                    <div className="col-span-4">
                        {/* Reserve Assets */}
                        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] p-5 mb-4">
                            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Reserve Assets</h3>

                            {/* Asset A */}
                            <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 mb-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-lg font-bold text-[var(--text-primary)]">{codeA}</span>
                                    <span className="font-mono text-lg text-[var(--text-primary)]">{formatAmount(assetA.amount)}</span>
                                </div>
                                <div className="text-xs text-[var(--text-muted)] font-mono">{formatFullAmount(assetA.amount)}</div>
                                {issuerA ? (
                                    <Link href={`/account/${issuerA}`} className="text-xs font-mono text-[var(--primary-blue)] hover:underline mt-1 block">
                                        {shortenAddress(issuerA, 8)}
                                    </Link>
                                ) : (
                                    <span className="text-xs text-[var(--text-muted)] mt-1 block">Native Asset (XLM)</span>
                                )}
                            </div>

                            {/* Swap indicator */}
                            <div className="flex justify-center my-2">
                                <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                                    <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                    </svg>
                                </div>
                            </div>

                            {/* Asset B */}
                            <div className="bg-[var(--bg-tertiary)] rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-lg font-bold text-[var(--text-primary)]">{codeB}</span>
                                    <span className="font-mono text-lg text-[var(--text-primary)]">{formatAmount(assetB.amount)}</span>
                                </div>
                                <div className="text-xs text-[var(--text-muted)] font-mono">{formatFullAmount(assetB.amount)}</div>
                                {issuerB ? (
                                    <Link href={`/account/${issuerB}`} className="text-xs font-mono text-[var(--primary-blue)] hover:underline mt-1 block">
                                        {shortenAddress(issuerB, 8)}
                                    </Link>
                                ) : (
                                    <span className="text-xs text-[var(--text-muted)] mt-1 block">Native Asset (XLM)</span>
                                )}
                            </div>

                            {/* Exchange Rates */}
                            <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                                <div className="text-xs text-[var(--text-muted)] mb-2">Exchange Rate</div>
                                <div className="space-y-1">
                                    <div className="font-mono text-sm text-[var(--text-primary)]">
                                        1 {codeA} = {priceRatio} {codeB}
                                    </div>
                                    <div className="font-mono text-sm text-[var(--text-secondary)]">
                                        1 {codeB} = {priceRatioReverse} {codeA}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pool Stats */}
                        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] p-5">
                            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Pool Information</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-sm text-[var(--text-muted)]">Type</span>
                                    <span className="text-sm font-medium text-[var(--text-primary)] capitalize">{pool.type.replace('_', ' ')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-[var(--text-muted)]">Total Shares</span>
                                    <span className="text-sm font-mono text-[var(--text-primary)]">{formatFullAmount(pool.total_shares)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-[var(--text-muted)]">Trustlines</span>
                                    <span className="text-sm font-medium text-[var(--text-primary)]">{pool.total_trustlines.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-[var(--text-muted)]">Fee</span>
                                    <span className="text-sm font-medium text-[var(--text-primary)]">
                                        {pool.fee_bp ? `${(pool.fee_bp / 100).toFixed(2)}%` : '0.30%'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-[var(--text-muted)]">Last Modified</span>
                                    <span className="text-sm text-[var(--text-primary)]">
                                        {pool.last_modified_time ? timeAgo(pool.last_modified_time) : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-[var(--text-muted)]">Ledger</span>
                                    <Link href={`/ledger/${pool.last_modified_ledger}`} className="text-sm font-mono" style={{ color: 'var(--primary-blue)' }}>
                                        {pool.last_modified_ledger?.toLocaleString() || '-'}
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Tabs */}
                    <div className="col-span-8">
                        {/* Tabs */}
                        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-sm px-4 mb-6">
                            <div className="flex gap-1">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`px-4 py-3 text-sm font-semibold transition-all flex items-center gap-2 ${
                                            activeTab === tab.id
                                                ? 'border-b-2'
                                                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                        }`}
                                        style={activeTab === tab.id ? { color: primaryColor, borderColor: primaryColor } : {}}
                                    >
                                        {tab.label}
                                        {'count' in tab && tab.count > 0 && (
                                            <span
                                                className="px-1.5 py-0.5 text-xs rounded-full"
                                                style={activeTab === tab.id
                                                    ? { backgroundColor: `${primaryColor}15`, color: primaryColor }
                                                    : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }
                                                }
                                            >
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] overflow-hidden">
                            {activeTab === 'overview' && (
                                <div className="p-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-[var(--bg-tertiary)] rounded-lg p-4">
                                            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">Total Value Locked</div>
                                            <div className="text-xl font-bold text-[var(--text-primary)]">
                                                {formatAmount(assetA.amount)} {codeA}
                                            </div>
                                            <div className="text-sm text-[var(--text-muted)]">
                                                + {formatAmount(assetB.amount)} {codeB}
                                            </div>
                                        </div>
                                        <div className="bg-[var(--bg-tertiary)] rounded-lg p-4">
                                            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">Pool Participants</div>
                                            <div className="text-xl font-bold text-[var(--text-primary)]">
                                                {pool.total_trustlines.toLocaleString()}
                                            </div>
                                            <div className="text-sm text-[var(--text-muted)]">trustlines</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'trades' && (
                                <div>
                                    {trades.length === 0 ? (
                                        <div className="p-12 text-center text-[var(--text-muted)]">
                                            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                            </svg>
                                            <p>No trades found</p>
                                        </div>
                                    ) : (
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-[var(--border-subtle)]">
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Trade</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase">Time</th>
                                                    <th className="px-4 py-3 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border-subtle)]">
                                                {trades.map((trade) => {
                                                    const baseAsset = trade.base_asset_type === 'native' ? 'XLM' : trade.base_asset_code || 'UNK';
                                                    const counterAsset = trade.counter_asset_type === 'native' ? 'XLM' : trade.counter_asset_code || 'UNK';
                                                    return (
                                                        <tr
                                                            key={trade.id}
                                                            className={`hover:bg-[var(--bg-tertiary)] ${trade.transaction_hash ? 'cursor-pointer' : ''}`}
                                                            onClick={() => trade.transaction_hash && (window.location.href = `/transaction/${trade.transaction_hash}`)}
                                                        >
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-mono text-sm font-semibold text-[var(--error)]">-{formatAmount(trade.base_amount)}</span>
                                                                    <span className="text-sm text-[var(--text-muted)]">{baseAsset}</span>
                                                                    <svg className="w-3.5 h-3.5 text-[var(--text-tertiary)] mx-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                                    </svg>
                                                                    <span className="font-mono text-sm font-semibold text-[var(--success)]">+{formatAmount(trade.counter_amount)}</span>
                                                                    <span className="text-sm text-[var(--text-muted)]">{counterAsset}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-sm text-[var(--text-tertiary)]">
                                                                {timeAgo(trade.ledger_close_time)}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {trade.transaction_hash && (
                                                                    <svg className="w-4 h-4 text-[var(--text-muted)] inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                                    </svg>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}

                            {activeTab === 'effects' && (
                                <div>
                                    {effects.length === 0 ? (
                                        <div className="p-12 text-center text-[var(--text-muted)]">
                                            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            <p>No effects found</p>
                                        </div>
                                    ) : (
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-[var(--border-subtle)]">
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Type</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Account</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase">Shares</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase">Time</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border-subtle)]">
                                                {effects.map((effect) => {
                                                    const isDeposit = effect.type.includes('deposit');
                                                    const isWithdraw = effect.type.includes('withdraw');
                                                    return (
                                                        <tr key={effect.id} className="hover:bg-[var(--bg-tertiary)]">
                                                            <td className="px-4 py-3">
                                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                                                    isDeposit ? 'bg-[var(--success)]/10 text-[var(--success)]' : isWithdraw ? 'bg-[var(--error)]/10 text-[var(--error)]' : 'bg-[var(--primary-blue)]/10 text-[var(--primary-blue)]'
                                                                }`}>
                                                                    {effect.type.replace(/_/g, ' ')}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <Link href={`/account/${effect.account}`} className="font-mono text-sm hover:underline" style={{ color: 'var(--primary-blue)' }}>
                                                                    {shortenAddress(effect.account, 6)}
                                                                </Link>
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                {effect.shares_received && (
                                                                    <span className="text-sm font-semibold text-[var(--success)]">+{formatAmount(effect.shares_received)}</span>
                                                                )}
                                                                {effect.shares_redeemed && (
                                                                    <span className="text-sm font-semibold text-[var(--error)]">-{formatAmount(effect.shares_redeemed)}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-sm text-[var(--text-tertiary)]">
                                                                {timeAgo(effect.created_at)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}

                            {activeTab === 'transactions' && (
                                <div>
                                    {transactions.length === 0 ? (
                                        <div className="p-12 text-center text-[var(--text-muted)]">
                                            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                            <p>No transactions found</p>
                                        </div>
                                    ) : (
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-[var(--border-subtle)]">
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Hash</th>
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-muted)] uppercase">Status</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase">Operations</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase">Time</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border-subtle)]">
                                                {transactions.map((tx) => (
                                                    <tr key={tx.id} className="hover:bg-[var(--bg-tertiary)] cursor-pointer" onClick={() => window.location.href = `/transaction/${tx.hash}`}>
                                                        <td className="px-4 py-3">
                                                            <span className="font-mono text-sm font-semibold" style={{ color: 'var(--primary-blue)' }}>
                                                                {shortenAddress(tx.hash, 8)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                                                tx.successful ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--error)]/10 text-[var(--error)]'
                                                            }`}>
                                                                {tx.successful ? 'Success' : 'Failed'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">
                                                            {tx.operation_count}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-sm text-[var(--text-tertiary)]">
                                                            {timeAgo(tx.created_at)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}

                            {activeTab === 'operations' && (
                                <div>
                                    {operations.length === 0 ? (
                                        <div className="p-12 text-center text-[var(--text-muted)]">
                                            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            <p>No operations found</p>
                                        </div>
                                    ) : (
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-[var(--border-subtle)]">
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Type</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Source Account</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase">Time</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border-subtle)]">
                                                {operations.map((op) => (
                                                    <tr key={op.id} className="hover:bg-[var(--bg-tertiary)] cursor-pointer" onClick={() => window.location.href = `/transaction/${op.transaction_hash}`}>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                                                op.transaction_successful ? 'bg-[var(--primary-blue)]/10 text-[var(--primary-blue)]' : 'bg-[var(--error)]/10 text-[var(--error)]'
                                                            }`}>
                                                                {op.type.replace(/_/g, ' ')}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Link href={`/account/${op.source_account}`} className="font-mono text-sm hover:underline" style={{ color: 'var(--primary-blue)' }}>
                                                                {shortenAddress(op.source_account, 6)}
                                                            </Link>
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-sm text-[var(--text-tertiary)]">
                                                            {timeAgo(op.created_at)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
