'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LiquidityPool, Operation, Transaction, LiquidityPoolTrade, LiquidityPoolEffect, shortenAddress, timeAgo, enrichTradesWithTransactionHashes } from '@/lib/stellar';
import GliderTabs from '@/components/ui/GliderTabs';

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

    const formatNumber = (num: number) => {
        if (num === 0 || isNaN(num)) return '0';
        const absNum = Math.abs(num);
        if (absNum >= 1e12) return (num / 1e12).toFixed(2) + 'T';
        if (absNum >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (absNum >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (absNum >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    };

    const formatPriceShort = (price: number) => {
        if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
        if (price >= 1) return price.toFixed(4);
        if (price >= 0.0001) return price.toFixed(6);
        return price.toFixed(8);
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
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
            <div className="mx-auto max-w-[1400px] px-4 py-4">
                {/* Header */}
                <div className="mb-4">
                    <div className="flex items-center gap-4 mb-3">
                        <Link
                            href="/liquidity-pools"
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-[var(--primary-blue)]">{codeA} / {codeB}</h1>
                            <div className="text-sm text-[var(--text-muted)]">Liquidity Pool</div>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)]">
                                <span className="text-xs text-[var(--text-muted)]">Fee</span>
                                <span className="text-sm font-semibold text-[var(--text-primary)]">{(pool.fee_bp / 100).toFixed(2)}%</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)]">
                                <span className="text-xs text-[var(--text-muted)]">Trustlines</span>
                                <span className="text-sm font-semibold text-[var(--text-primary)]">{pool.total_trustlines.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Pool ID bar */}
                    <div className="flex items-center gap-3 bg-[var(--bg-secondary)] rounded-xl px-4 py-2.5 border border-[var(--border-subtle)]">
                        <span className="font-mono text-sm text-[var(--text-tertiary)] truncate">{pool.id}</span>
                        <button
                            onClick={handleCopy}
                            className="text-sm font-medium text-sky-600 px-2 py-0.5 rounded hover:bg-sky-50/50 transition-colors shrink-0"
                        >
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-4">
                    {/* Left Column */}
                    <div className="space-y-4">
                        {/* Reserve Assets Card */}
                        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] p-4">
                            <h3 className="font-semibold text-sm text-[var(--text-primary)] mb-3">Reserve Assets</h3>

                            {/* Asset A */}
                            <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-bold text-[var(--text-primary)]">{codeA}</span>
                                    <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">{formatAmount(assetA.amount)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        {issuerA ? (
                                            <Link href={`/account/${issuerA}`} className="text-xs font-mono text-sky-600 hover:underline">
                                                {shortenAddress(issuerA)}
                                            </Link>
                                        ) : (
                                            <span className="text-xs text-[var(--text-muted)]">Native Asset (XLM)</span>
                                        )}
                                    </div>
                                    <span className="text-xs text-[var(--text-muted)] font-mono">{formatFullAmount(assetA.amount)}</span>
                                </div>
                            </div>

                            {/* Swap indicator */}
                            <div className="flex justify-center my-2">
                                <div className="w-7 h-7 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                                    <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                    </svg>
                                </div>
                            </div>

                            {/* Asset B */}
                            <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-bold text-[var(--text-primary)]">{codeB}</span>
                                    <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">{formatAmount(assetB.amount)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        {issuerB ? (
                                            <Link href={`/account/${issuerB}`} className="text-xs font-mono text-sky-600 hover:underline">
                                                {shortenAddress(issuerB)}
                                            </Link>
                                        ) : (
                                            <span className="text-xs text-[var(--text-muted)]">Native Asset (XLM)</span>
                                        )}
                                    </div>
                                    <span className="text-xs text-[var(--text-muted)] font-mono">{formatFullAmount(assetB.amount)}</span>
                                </div>
                            </div>

                            {/* Exchange Rates */}
                            <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
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

                        {/* Pool Information Card */}
                        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] p-4">
                            <h3 className="font-semibold text-sm text-[var(--text-primary)] mb-3">Pool Information</h3>
                            <div className="divide-y divide-[var(--border-subtle)]">
                                <div className="flex items-center justify-between py-2.5 first:pt-0">
                                    <span className="text-sm text-[var(--text-muted)]">Type</span>
                                    <span className="text-sm font-medium text-[var(--text-primary)] capitalize">{pool.type.replace('_', ' ')}</span>
                                </div>
                                <div className="flex items-center justify-between py-2.5">
                                    <span className="text-sm text-[var(--text-muted)]">Total Shares</span>
                                    <span className="text-sm font-mono text-[var(--text-primary)]">{formatFullAmount(pool.total_shares)}</span>
                                </div>
                                <div className="flex items-center justify-between py-2.5">
                                    <span className="text-sm text-[var(--text-muted)]">Trustlines</span>
                                    <span className="text-sm font-medium text-[var(--text-primary)]">{pool.total_trustlines.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between py-2.5">
                                    <span className="text-sm text-[var(--text-muted)]">Fee</span>
                                    <span className="text-sm font-medium text-[var(--text-primary)]">
                                        {pool.fee_bp ? `${(pool.fee_bp / 100).toFixed(2)}%` : '0.30%'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2.5">
                                    <span className="text-sm text-[var(--text-muted)]">Last Modified</span>
                                    <span className="text-sm text-[var(--text-primary)]">
                                        {pool.last_modified_time ? timeAgo(pool.last_modified_time) : '-'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2.5 last:pb-0">
                                    <span className="text-sm text-[var(--text-muted)]">Ledger</span>
                                    <Link href={`/ledger/${pool.last_modified_ledger}`} className="text-sm font-mono text-sky-600 hover:underline">
                                        {pool.last_modified_ledger?.toLocaleString() || '-'}
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Tabs + Content */}
                    <div className="space-y-4 min-w-0 overflow-hidden">
	                        {/* Tab Bar */}
	                        <GliderTabs
	                            size="md"
	                            className="border-[var(--border-default)]"
	                            tabs={tabs as any}
	                            activeId={activeTab as any}
	                            onChange={(id) => setActiveTab(id as any)}
	                        />

                        {/* Tab Content */}
                        {activeTab === 'overview' && (
                            <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] overflow-hidden">
                                <div className="p-4 border-b border-[var(--border-subtle)]">
                                    <h3 className="font-semibold text-[var(--text-primary)]">{codeA} / {codeB} Overview</h3>
                                    <p className="text-xs text-[var(--text-tertiary)] mt-1">Liquidity pool summary</p>
                                </div>
                                <div className="p-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-lg bg-[var(--bg-tertiary)]">
                                            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Total Value Locked</div>
                                            <div className="text-xl font-bold text-[var(--text-primary)]">
                                                {formatAmount(assetA.amount)} <span className="text-sm font-medium text-[var(--text-secondary)]">{codeA}</span>
                                            </div>
                                            <div className="text-sm text-[var(--text-muted)] mt-0.5">
                                                + {formatAmount(assetB.amount)} {codeB}
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-lg bg-[var(--bg-tertiary)]">
                                            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Pool Participants</div>
                                            <div className="text-xl font-bold text-[var(--text-primary)]">
                                                {pool.total_trustlines.toLocaleString()}
                                            </div>
                                            <div className="text-sm text-[var(--text-muted)] mt-0.5">trustlines</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'trades' && (
                            <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] overflow-x-auto">
                                <div className="p-4 border-b border-[var(--border-subtle)]">
                                    <h3 className="font-semibold text-[var(--text-primary)]">{codeA} / {codeB} Trades</h3>
                                    <p className="text-xs text-[var(--text-tertiary)] mt-1">Recent trades on Stellar DEX</p>
                                </div>

                                {trades.length === 0 ? (
                                    <div className="text-center py-16 text-[var(--text-muted)]">
                                        No trades found
                                    </div>
                                ) : (
                                    <table className="w-full sc-table">
                                        <thead>
                                            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                                                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-left">#</th>
                                                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-left">Type</th>
                                                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-left">Pair</th>
                                                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-right">{codeA} Amount</th>
                                                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-right">Counter Amount</th>
                                                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-right">Price</th>
                                                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-left">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--bg-primary)]">
                                            {trades.map((trade, index) => {
                                                const baseAsset = trade.base_asset_type === 'native' ? 'XLM' : trade.base_asset_code || 'UNK';
                                                const counterAsset = trade.counter_asset_type === 'native' ? 'XLM' : trade.counter_asset_code || 'UNK';
                                                const baseAmount = parseFloat(trade.base_amount);
                                                const counterAmount = parseFloat(trade.counter_amount);
                                                const price = baseAmount > 0 ? counterAmount / baseAmount : 0;
                                                const isBuy = !!trade.base_account;
                                                return (
                                                    <tr
                                                        key={trade.id}
                                                        className={`hover:bg-sky-50/30 transition-colors ${trade.transaction_hash ? 'cursor-pointer' : ''}`}
                                                        onClick={() => trade.transaction_hash && (window.location.href = `/transaction/${trade.transaction_hash}`)}
                                                    >
                                                        <td className="py-3 px-4 text-sm text-[var(--text-tertiary)]">{index + 1}</td>
                                                        <td className="py-3 px-4">
                                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                                isBuy
                                                                    ? 'bg-emerald-50 text-emerald-600'
                                                                    : 'bg-rose-50 text-rose-600'
                                                            }`}>
                                                                {isBuy ? 'BUY' : 'SELL'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className="text-sm font-medium text-sky-600">{baseAsset}/{counterAsset}</span>
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono text-sm text-[var(--text-primary)]">
                                                            {formatNumber(baseAmount)}
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono text-sm text-[var(--text-secondary)]">
                                                            {formatNumber(counterAmount)} {counterAsset}
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono text-sm text-[var(--text-secondary)]">
                                                            {formatPriceShort(price)} {counterAsset}
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-[var(--text-tertiary)]">
                                                            {timeAgo(trade.ledger_close_time)}
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
                            <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] overflow-x-auto">
                                <div className="p-4 border-b border-[var(--border-subtle)]">
                                    <h3 className="font-semibold text-[var(--text-primary)]">{codeA} / {codeB} Effects</h3>
                                    <p className="text-xs text-[var(--text-tertiary)] mt-1">Deposits and withdrawals</p>
                                </div>

                                {effects.length === 0 ? (
                                    <div className="text-center py-16 text-[var(--text-muted)]">
                                        No effects found
                                    </div>
                                ) : (
                                    <table className="w-full sc-table">
                                        <thead>
                                            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                                                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-left">Type</th>
                                                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-left">Account</th>
                                                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-right">Shares</th>
                                                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-left">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--bg-primary)]">
                                            {effects.map((effect) => {
                                                const isDeposit = effect.type.includes('deposit');
                                                const isWithdraw = effect.type.includes('withdraw');
                                                return (
                                                    <tr key={effect.id} className="hover:bg-sky-50/30 transition-colors">
                                                        <td className="py-3 px-4">
                                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                                isDeposit
                                                                    ? 'bg-emerald-50 text-emerald-600'
                                                                    : isWithdraw
                                                                    ? 'bg-rose-50 text-rose-600'
                                                                    : 'bg-sky-50 text-sky-600'
                                                            }`}>
                                                                {effect.type.replace(/_/g, ' ').toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <Link href={`/account/${effect.account}`} className="font-mono text-sm text-sky-600 hover:underline">
                                                                {shortenAddress(effect.account)}
                                                            </Link>
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            {effect.shares_received && (
                                                                <span className="text-sm font-mono text-emerald-600">+{formatAmount(effect.shares_received)}</span>
                                                            )}
                                                            {effect.shares_redeemed && (
                                                                <span className="text-sm font-mono text-rose-600">-{formatAmount(effect.shares_redeemed)}</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-[var(--text-tertiary)]">
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
                            <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] overflow-x-auto">
                                <div className="p-4 border-b border-[var(--border-subtle)]">
                                    <h3 className="font-semibold text-[var(--text-primary)]">{codeA} / {codeB} Transactions</h3>
                                    <p className="text-xs text-[var(--text-tertiary)] mt-1">Recent pool transactions</p>
                                </div>

                                {transactions.length === 0 ? (
                                    <div className="text-center py-16 text-[var(--text-muted)]">
                                        No transactions found
                                    </div>
                                ) : (
                                    <table className="w-full sc-table">
                                        <thead>
                                            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                                                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-left">Hash</th>
                                                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-left">Status</th>
                                                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-right">Operations</th>
                                                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-left">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--bg-primary)]">
                                            {transactions.map((tx) => (
                                                <tr key={tx.id} className="hover:bg-sky-50/30 cursor-pointer transition-colors" onClick={() => window.location.href = `/transaction/${tx.hash}`}>
                                                    <td className="py-3 px-4">
                                                        <span className="font-mono text-sm text-sky-600 hover:underline">
                                                            {shortenAddress(tx.hash)}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                            tx.successful
                                                                ? 'bg-emerald-50 text-emerald-600'
                                                                : 'bg-rose-50 text-rose-600'
                                                        }`}>
                                                            {tx.successful ? 'SUCCESS' : 'FAILED'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-sm font-medium text-[var(--text-secondary)]">
                                                        {tx.operation_count}
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-[var(--text-tertiary)]">
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
                            <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] overflow-x-auto">
                                <div className="p-4 border-b border-[var(--border-subtle)]">
                                    <h3 className="font-semibold text-[var(--text-primary)]">{codeA} / {codeB} Operations</h3>
                                    <p className="text-xs text-[var(--text-tertiary)] mt-1">Recent pool operations</p>
                                </div>

                                {operations.length === 0 ? (
                                    <div className="text-center py-16 text-[var(--text-muted)]">
                                        No operations found
                                    </div>
                                ) : (
                                    <table className="w-full sc-table">
                                        <thead>
                                            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                                                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-left">Type</th>
                                                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-left">Source Account</th>
                                                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-left">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--bg-primary)]">
                                            {operations.map((op) => (
                                                <tr key={op.id} className="hover:bg-sky-50/30 cursor-pointer transition-colors" onClick={() => window.location.href = `/transaction/${op.transaction_hash}`}>
                                                    <td className="py-3 px-4">
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                            op.transaction_successful
                                                                ? 'bg-sky-50 text-sky-600'
                                                                : 'bg-rose-50 text-rose-600'
                                                        }`}>
                                                            {op.type.replace(/_/g, ' ').toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <Link href={`/account/${op.source_account}`} className="font-mono text-sm text-sky-600 hover:underline">
                                                            {shortenAddress(op.source_account)}
                                                        </Link>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-[var(--text-tertiary)]">
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
    );
}
