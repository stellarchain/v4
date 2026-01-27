'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { LiquidityPool, PaginatedResponse, shortenAddress } from '@/lib/stellar';

interface LiquidityPoolsDesktopViewProps {
    initialPools: PaginatedResponse<LiquidityPool>;
}

export default function LiquidityPoolsDesktopView({ initialPools }: LiquidityPoolsDesktopViewProps) {
    const [pools, setPools] = useState<LiquidityPool[]>(initialPools._embedded.records);
    const [nextLink, setNextLink] = useState<string | null>(initialPools._links.next?.href || null);
    const [loading, setLoading] = useState(false);
    const sentinelRef = useRef<HTMLDivElement>(null);

    // Primary color for this design
    const primaryColor = '#0F4C81';

    const loadMore = useCallback(async () => {
        if (!nextLink || loading) return;
        setLoading(true);
        try {
            const res = await fetch(nextLink);
            const data: PaginatedResponse<LiquidityPool> = await res.json();
            setPools(prev => [...prev, ...data._embedded.records]);
            setNextLink(data._links.next?.href || null);
        } catch (e) {
            console.error('Failed to load more pools', e);
        } finally {
            setLoading(false);
        }
    }, [nextLink, loading]);

    useEffect(() => {
        if (!sentinelRef.current) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !loading && nextLink) {
                    loadMore();
                }
            },
            { root: null, rootMargin: '100px', threshold: 0.1 }
        );
        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [loading, nextLink, loadMore]);

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

    const formatShares = (shares: string) => {
        const num = parseFloat(shares);
        if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return num.toFixed(0);
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] py-8">
            <div className="max-w-[1400px] mx-auto px-6">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-4 mb-2">
                        <Link
                            href="/"
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-muted)] transition hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold" style={{ color: primaryColor }}>Liquidity Pools</h1>
                            <p className="text-sm text-[var(--text-muted)]">
                                AMM pools on Stellar DEX - {pools.length}+ pools loaded
                            </p>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[var(--border-subtle)]">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Pool</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Reserve A</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Reserve B</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Exchange Rate</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Total Shares</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Trustlines</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                            {pools.map((pool) => {
                                const assetA = pool.reserves[0];
                                const assetB = pool.reserves[1];
                                const codeA = getAssetCode(assetA.asset);
                                const codeB = getAssetCode(assetB.asset);
                                const issuerA = getAssetIssuer(assetA.asset);
                                const issuerB = getAssetIssuer(assetB.asset);
                                const amountA = parseFloat(assetA.amount);
                                const amountB = parseFloat(assetB.amount);
                                const priceRatio = amountA > 0 ? (amountB / amountA).toFixed(4) : '0';

                                return (
                                    <tr
                                        key={pool.id}
                                        className="hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                                        onClick={() => window.location.href = `/liquidity-pool/${pool.id}`}
                                    >
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                                                    style={{ backgroundColor: primaryColor }}
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="font-semibold" style={{ color: primaryColor }}>{codeA} / {codeB}</div>
                                                    <div className="text-xs text-[var(--text-muted)] font-mono">
                                                        {shortenAddress(pool.id, 6)}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="font-mono text-sm text-[var(--text-primary)]">{formatAmount(assetA.amount)}</div>
                                            <div className="text-xs text-[var(--text-muted)]">{codeA}</div>
                                            {issuerA && (
                                                <div className="text-[10px] text-[var(--text-muted)] font-mono">{shortenAddress(issuerA, 4)}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="font-mono text-sm text-[var(--text-primary)]">{formatAmount(assetB.amount)}</div>
                                            <div className="text-xs text-[var(--text-muted)]">{codeB}</div>
                                            {issuerB && (
                                                <div className="text-[10px] text-[var(--text-muted)] font-mono">{shortenAddress(issuerB, 4)}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="text-sm text-[var(--text-secondary)]">
                                                1 {codeA} = <span className="font-mono">{priceRatio}</span> {codeB}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="font-mono text-sm text-[var(--text-primary)]">{formatShares(pool.total_shares)}</div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="text-sm text-[var(--text-secondary)]">{pool.total_trustlines.toLocaleString()}</div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <svg className="w-4 h-4 text-[var(--text-muted)] inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Infinite scroll sentinel */}
                    <div ref={sentinelRef} className="h-4" />

                    {/* Loading indicator */}
                    {loading && (
                        <div className="py-6 text-center border-t border-[var(--border-subtle)]">
                            <div className="inline-flex items-center gap-2 text-[var(--text-muted)]">
                                <div className="w-5 h-5 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm">Loading more pools...</span>
                            </div>
                        </div>
                    )}

                    {/* End of list */}
                    {!nextLink && pools.length > 0 && (
                        <div className="py-4 text-center text-[var(--text-muted)] text-sm border-t border-[var(--border-subtle)]">
                            All pools loaded
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
