'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LiquidityPool, PaginatedResponse, shortenAddress } from '@/lib/stellar';
import InlineSkeleton from '@/components/ui/InlineSkeleton';

interface MobileLiquidityPoolsProps {
    initialPools: PaginatedResponse<LiquidityPool>;
    loading?: boolean;
}

export default function MobileLiquidityPools({ initialPools, loading = false }: MobileLiquidityPoolsProps) {
    const router = useRouter();
    const [pools, setPools] = useState<LiquidityPool[]>(initialPools.records);
    const [nextLink, setNextLink] = useState<string | null>(initialPools._links?.next?.href || null);
    const [loadingMore, setLoadingMore] = useState(false);
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setPools(initialPools.records);
        setNextLink(initialPools._links?.next?.href || null);
    }, [initialPools]);

    // Primary color for this design (matches TransactionMobileView)
    const primaryColor = '#0F4C81';

    const loadMore = useCallback(async () => {
        if (!nextLink || loadingMore) return;
        setLoadingMore(true);
        try {
            const res = await fetch(nextLink);
            const data: PaginatedResponse<LiquidityPool> = await res.json();
            setPools(prev => [...prev, ...data.records]);
            setNextLink(data._links?.next?.href || null);
        } catch (e) {
            console.error('Failed to load more pools', e);
        } finally {
            setLoadingMore(false);
        }
    }, [nextLink, loadingMore]);

    // Infinite scroll observer
    useEffect(() => {
        if (!sentinelRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !loadingMore && nextLink) {
                    loadMore();
                }
            },
            { root: null, rootMargin: '100px', threshold: 0.1 }
        );

        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [loadingMore, nextLink, loadMore]);

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

    const formatShares = (shares: string) => {
        const num = parseFloat(shares);
        if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toFixed(0);
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pb-24 pt-4">
            <div className="px-4">
                {/* Header */}
                <div className="mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold tracking-tight" style={{ color: primaryColor }}>Liquidity Pools</h1>
                            <span className="bg-[var(--success)]/10 text-[var(--success)] text-[10px] px-1.5 py-0.5 rounded font-bold">
                                {loading ? <InlineSkeleton width="w-8" height="h-3" /> : `${pools.length}+`}
                            </span>
                        </div>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1">AMM pools on Stellar DEX</p>
                </div>

                {/* Pool Cards */}
                <div className="space-y-3">
                    {loading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={`pool-skeleton-${i}`}
                                className="block bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]"
                            >
                                <div className="p-3 pb-2">
                                    <span className="text-sm font-bold" style={{ color: primaryColor }}>
                                        Pool
                                    </span>
                                </div>
                                <div className="px-3 pb-2">
                                    <div className="flex items-center gap-2 text-[11px]">
                                        <div className="flex-1 bg-[var(--bg-tertiary)] rounded-lg px-2.5 py-2">
                                            <div className="text-[var(--text-muted)] mb-0.5">Asset A</div>
                                            <InlineSkeleton width="w-16" height="h-4" />
                                            <div className="mt-1"><InlineSkeleton width="w-14" height="h-3" /></div>
                                        </div>
                                        <div className="text-[var(--text-muted)]">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 bg-[var(--bg-tertiary)] rounded-lg px-2.5 py-2">
                                            <div className="text-[var(--text-muted)] mb-0.5">Asset B</div>
                                            <InlineSkeleton width="w-16" height="h-4" />
                                            <div className="mt-1"><InlineSkeleton width="w-14" height="h-3" /></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-3 py-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px]">
                                    <div>
                                        <span className="text-[var(--text-muted)]">Rate: </span>
                                        <InlineSkeleton width="w-20" height="h-3" />
                                    </div>
                                    <div>
                                        <span className="text-[var(--text-muted)]">Shares: </span>
                                        <InlineSkeleton width="w-12" height="h-3" />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : pools.map((pool) => {
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

                        return (
                            <Link
                                key={pool.id}
                                href={`/liquidity-pool/${pool.id}`}
                                className="block bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] active:bg-[var(--bg-tertiary)] transition-colors"
                            >
                                {/* Pool Header */}
                                <div className="p-3 pb-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold" style={{ color: primaryColor }}>
                                            {codeA} / {codeB}
                                        </span>
                                    </div>
                                </div>

                                {/* Reserves */}
                                <div className="px-3 pb-2">
                                    <div className="flex items-center gap-2 text-[11px]">
                                        <div className="flex-1 bg-[var(--bg-tertiary)] rounded-lg px-2.5 py-2">
                                            <div className="text-[var(--text-muted)] mb-0.5">{codeA}</div>
                                            <div className="font-mono font-bold text-[var(--text-primary)]">
                                                {formatAmount(assetA.amount)}
                                            </div>
                                            {issuerA && (
                                                <button
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/account/${issuerA}`); }}
                                                    className="text-[9px] text-[var(--text-muted)] font-mono truncate hover:text-[var(--primary-blue)] text-left"
                                                >
                                                    {shortenAddress(issuerA)}
                                                </button>
                                            )}
                                        </div>
                                        <div className="text-[var(--text-muted)]">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 bg-[var(--bg-tertiary)] rounded-lg px-2.5 py-2">
                                            <div className="text-[var(--text-muted)] mb-0.5">{codeB}</div>
                                            <div className="font-mono font-bold text-[var(--text-primary)]">
                                                {formatAmount(assetB.amount)}
                                            </div>
                                            {issuerB && (
                                                <button
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/account/${issuerB}`); }}
                                                    className="text-[9px] text-[var(--text-muted)] font-mono truncate hover:text-[var(--primary-blue)] text-left"
                                                >
                                                    {shortenAddress(issuerB)}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Stats */}
                                <div className="px-3 py-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px]">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <span className="text-[var(--text-muted)]">Rate: </span>
                                            <span className="font-mono text-[var(--text-secondary)]">1 {codeA} = {priceRatio} {codeB}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <span className="text-[var(--text-muted)]">Shares: </span>
                                            <span className="font-medium text-[var(--text-secondary)]">{formatShares(pool.total_shares)}</span>
                                        </div>
                                        <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}

                    {/* Infinite scroll sentinel */}
                    <div ref={sentinelRef} className="h-4" />

                    {/* Loading indicator */}
                    {loadingMore && (
                        <div className="py-4 text-center">
                            <div className="inline-block w-5 h-5 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}

                    {/* End of list */}
                    {!loading && !nextLink && pools.length > 0 && (
                        <div className="py-4 text-center text-[var(--text-muted)] text-xs">
                            No more pools
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
