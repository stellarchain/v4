'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LiquidityPool, Operation, Transaction, LiquidityPoolTrade, LiquidityPoolEffect, shortenAddress, timeAgo, enrichTradesWithTransactionHashes } from '@/lib/stellar';
import GliderTabs from '@/components/ui/GliderTabs';

interface LiquidityPoolMobileViewProps {
    pool: LiquidityPool;
    operations: Operation[];
    transactions: Transaction[];
    trades: LiquidityPoolTrade[];
    effects: LiquidityPoolEffect[];
}

export default function LiquidityPoolMobileView({ pool, operations, transactions, trades: initialTrades, effects }: LiquidityPoolMobileViewProps) {
    const [activeTab, setActiveTab] = useState<'transactions' | 'operations' | 'trades' | 'effects'>('trades');
    const [copied, setCopied] = useState(false);
    const [trades, setTrades] = useState<LiquidityPoolTrade[]>(initialTrades);
    const [loadingTxHashes, setLoadingTxHashes] = useState(false);

    // Primary color for this design (matches TransactionMobileView)
    const primaryColor = '#0F4C81';

    // Fetch transaction hashes for trades when on trades tab
    useEffect(() => {
        if (activeTab !== 'trades' || loadingTxHashes) return;
        if (trades.every(t => t.transaction_hash)) return; // Already have all hashes

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

    const [searchQuery, setSearchQuery] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const query = searchQuery.trim();
        if (!query) return;
        const upperQuery = query.toUpperCase();
        if (query.length === 56 && upperQuery.startsWith('C')) {
            window.location.href = `/contract/${upperQuery}`;
        } else if (query.length === 56 && upperQuery.startsWith('G')) {
            window.location.href = `/account/${upperQuery}`;
        } else if (query.length === 64) {
            window.location.href = `/transaction/${query.toLowerCase()}`;
        } else if (/^\d+$/.test(query)) {
            window.location.href = `/ledger/${query}`;
        } else {
            window.location.href = `/account/${query}`;
        }
        setSearchQuery('');
    };

    const tabs = [
        { id: 'trades', label: 'Trades', count: trades.length },
        { id: 'effects', label: 'Effects', count: effects.length },
        { id: 'transactions', label: 'Transactions', count: transactions.length },
        { id: 'operations', label: 'Operations', count: operations.length },
    ] as const;

    return (
        <div className="bg-[var(--bg-primary)] text-[var(--text-secondary)] min-h-screen flex flex-col font-sans pb-24">
            {/* Header - matching transaction page */}
            <header className="sticky top-0 z-10 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link
                        href="/liquidity-pools"
                        className="p-2 rounded-full bg-[var(--bg-secondary)] shadow-sm hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)]"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <h1 className="text-xl font-bold tracking-tight" style={{ color: primaryColor }}>Liquidity Pool</h1>
                </div>
                <div className="flex-1 max-w-[180px] ml-auto">
                    <form onSubmit={handleSearch} className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search..."
                            className="w-full pl-10 pr-3 py-2 bg-[var(--bg-tertiary)] border-none rounded-full text-sm text-[var(--text-secondary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent)] focus:bg-[var(--bg-secondary)] transition-all"
                        />
                    </form>
                </div>
            </header>

            <main className="px-4 pt-4 max-w-lg mx-auto w-full">
                {/* Metadata Row - matching transaction page */}
                <div className="flex flex-wrap items-center gap-3 mb-4 text-xs font-medium text-[var(--text-tertiary)]">
                    <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                        style={{
                            backgroundColor: `${primaryColor}15`,
                            color: primaryColor,
                            borderColor: `${primaryColor}40`
                        }}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        {codeA} / {codeB}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                        Fee {(pool.fee_bp / 100).toFixed(2)}%
                    </span>
                    <button
                        onClick={handleCopy}
                        className="px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] font-mono text-[11px] tracking-wide hover:bg-[var(--bg-hover)] transition-colors"
                    >
                        #{pool.id.slice(0, 4)}...{pool.id.slice(-3)}
                        {copied && <span className="text-[var(--success)] ml-1">✓</span>}
                    </button>
                </div>

                {/* Summary Card - Reserve Assets */}
                <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-4 mb-5">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-widest">Pool Type</div>
                            <div className="text-base font-bold text-[var(--text-primary)] mt-1">Constant Product</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-widest">Trustlines</div>
                            <div className="text-base font-bold text-[var(--text-primary)] mt-1">{pool.total_trustlines}</div>
                        </div>
                    </div>

                    {/* Reserve Assets Display */}
                    <div className="mt-4 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-2xl p-4">
                        {/* Asset A */}
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-widest">Reserve A</span>
                            <span className="text-base font-bold text-[var(--text-primary)] font-mono">{formatAmount(assetA.amount)} <span className="text-sm text-[var(--text-muted)]">{codeA}</span></span>
                        </div>

                        {/* Divider */}
                        <div className="my-3 border-t border-dashed border-[var(--border-subtle)]"></div>

                        {/* Asset B */}
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-widest">Reserve B</span>
                            <span className="text-base font-bold text-[var(--text-primary)] font-mono">{formatAmount(assetB.amount)} <span className="text-sm text-[var(--text-muted)]">{codeB}</span></span>
                        </div>
                    </div>

                    {/* Network Fee */}
                    <div className="mt-4 pt-4 border-t border-[var(--border-default)]/50">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-[var(--text-muted)]">Exchange Rate</span>
                            <span className="text-sm font-mono font-semibold" style={{ color: primaryColor }}>1 {codeA} = {formatFullAmount(priceRatio)} {codeB}</span>
                        </div>
                    </div>
                </div>

                {/* Tabs - Glider Style */}
                <GliderTabs
                  className="mt-3 mb-1"
                  tabs={[
                    { id: 'trades', label: 'Trades' },
                    { id: 'effects', label: 'Effects' },
                    { id: 'transactions', label: 'Transactions' },
                    { id: 'operations', label: 'Operations' },
                  ]}
                  activeId={activeTab}
                  onChange={setActiveTab}
                />

                {activeTab === 'transactions' && (
                    <div className="space-y-2 mt-2">
                        {transactions.length === 0 ? (
                            <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] py-12 text-center text-[var(--text-muted)] text-sm">
                                No transactions found
                            </div>
                        ) : (
                            transactions.map((tx) => (
                                <Link
                                    key={tx.id}
                                    href={`/transaction/${tx.hash}`}
                                    className="block bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-3 active:bg-[var(--bg-tertiary)] transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tx.successful ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--error)]/10 text-[var(--error)]'}`}>
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
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                                                    {shortenAddress(tx.hash, 8)}
                                                </div>
                                                <div className="text-[11px] text-[var(--text-muted)]">
                                                    {tx.operation_count} operation{tx.operation_count !== 1 ? 's' : ''}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 ml-3">
                                            <span className="text-[11px] text-[var(--text-muted)]">{timeAgo(tx.created_at)}</span>
                                            <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'trades' && (
                    <div className="space-y-2 mt-2">
                        {trades.length === 0 ? (
                            <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] py-12 text-center text-[var(--text-muted)] text-sm">
                                No trades found
                            </div>
                        ) : (
                            trades.map((trade) => {
                                const baseAsset = trade.base_asset_type === 'native' ? 'XLM' : trade.base_asset_code || 'UNK';
                                const counterAsset = trade.counter_asset_type === 'native' ? 'XLM' : trade.counter_asset_code || 'UNK';
                                const baseAmount = parseFloat(trade.base_amount);
                                const counterAmount = parseFloat(trade.counter_amount);
                                const priceValue = baseAmount > 0 ? counterAmount / baseAmount : 0;
                                const account = trade.base_account || '';
                                const tradeTime = new Date(trade.ledger_close_time);

                                const TradeRow = trade.transaction_hash ? Link : 'div';
                                const rowProps = trade.transaction_hash
                                    ? { href: `/transaction/${trade.transaction_hash}` }
                                    : {};

                                return (
                                    <TradeRow
                                        key={trade.id}
                                        {...rowProps as any}
                                        className="block bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-3 active:bg-[var(--bg-tertiary)] transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 text-sm mb-0.5">
                                                    <span className="font-semibold text-[var(--text-primary)]">
                                                        {baseAmount >= 1000 ? baseAmount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : baseAmount.toFixed(4)}
                                                    </span>
                                                    <span className="text-[var(--text-muted)] font-normal">{baseAsset}</span>
                                                    <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                                    </svg>
                                                    <span className="font-semibold text-[var(--text-primary)]">
                                                        {counterAmount >= 1000 ? counterAmount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : counterAmount.toFixed(4)}
                                                    </span>
                                                    <span className="text-[var(--text-muted)] font-normal">{counterAsset}</span>
                                                </div>
                                                <div className="text-[11px] text-[var(--text-muted)]">
                                                    {tradeTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {tradeTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                    {account && (
                                                        <>
                                                            <span className="mx-1.5">·</span>
                                                            <span className="font-mono">{shortenAddress(account, 4)}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 ml-3">
                                                <div className="text-right">
                                                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                                                        @{priceValue >= 1 ? priceValue.toFixed(4) : priceValue.toFixed(7)}
                                                    </div>
                                                </div>
                                                {trade.transaction_hash && (
                                                    <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                    </TradeRow>
                                );
                            })
                        )}
                    </div>
                )}

                {activeTab === 'effects' && (
                    <div className="space-y-2 mt-2">
                        {effects.length === 0 ? (
                            <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] py-12 text-center text-[var(--text-muted)] text-sm">
                                No effects found
                            </div>
                        ) : (
                            effects.map((effect) => {
                                const isDeposit = effect.type.includes('deposit');
                                const isWithdraw = effect.type.includes('withdraw');
                                return (
                                    <div
                                        key={effect.id}
                                        className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDeposit ? 'bg-[var(--success)]/10 text-[var(--success)]' : isWithdraw ? 'bg-[var(--error)]/10 text-[var(--error)]' : 'bg-[var(--primary-blue)]/10 text-[var(--primary-blue)]'}`}>
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
                                                <div className="min-w-0">
                                                    <div className="text-sm font-semibold text-[var(--text-primary)] capitalize">
                                                        {effect.type.replace(/_/g, ' ')}
                                                        {effect.shares_received && (
                                                            <span className="text-[var(--success)] ml-2">+{formatAmount(effect.shares_received)} shares</span>
                                                        )}
                                                        {effect.shares_redeemed && (
                                                            <span className="text-[var(--error)] ml-2">-{formatAmount(effect.shares_redeemed)} shares</span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-[var(--text-muted)]">
                                                        {timeAgo(effect.created_at)}
                                                        <span className="mx-1.5">·</span>
                                                        <Link
                                                            href={`/account/${effect.account}`}
                                                            className="font-mono hover:text-[var(--primary-blue)]"
                                                        >
                                                            {shortenAddress(effect.account, 4)}
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {activeTab === 'operations' && (
                    <div className="space-y-2 mt-2">
                        {operations.length === 0 ? (
                            <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] py-12 text-center text-[var(--text-muted)] text-sm">
                                No operations found
                            </div>
                        ) : (
                            operations.map((op) => (
                                <Link
                                    key={op.id}
                                    href={`/transaction/${op.transaction_hash}`}
                                    className="block bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-3 active:bg-[var(--bg-tertiary)] transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${op.transaction_successful ? 'bg-[var(--primary-blue)]/10 text-[var(--primary-blue)]' : 'bg-[var(--error)]/10 text-[var(--error)]'}`}>
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold text-[var(--text-primary)] capitalize">
                                                    {op.type.replace(/_/g, ' ')}
                                                </div>
                                                <div className="text-[11px] text-[var(--text-muted)]">
                                                    {timeAgo(op.created_at)}
                                                    <span className="mx-1.5">·</span>
                                                    <span className="font-mono">{shortenAddress(op.source_account, 4)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <svg className="w-4 h-4 text-[var(--text-muted)] ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                )}
            </main>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
