'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { LiquidityPool, PaginatedResponse, shortenAddress, getBaseUrl } from '@/lib/stellar';
import { useNetwork } from '@/contexts/NetworkContext';

interface LiquidityPoolsDesktopViewProps {
    initialPools: PaginatedResponse<LiquidityPool>;
}

const PAGE_SIZE = 25;

const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    if (num >= 1) return num.toFixed(2);
    return num.toFixed(4);
};

const formatShares = (shares: string) => {
    const num = parseFloat(shares);
    if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toFixed(0);
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

// Pagination component
const PaginationControls = ({ currentPage, totalPages, onPageChange, loading, hasMore }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    loading: boolean;
    hasMore: boolean;
}) => {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-center gap-1.5 px-4 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-tertiary)]">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-muted)] hover:bg-sky-50 hover:border-sky-200 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                    pageNum = i + 1;
                } else if (currentPage <= 3) {
                    pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                } else {
                    pageNum = currentPage - 2 + i;
                }
                return (
                    <button
                        key={pageNum}
                        onClick={() => onPageChange(pageNum)}
                        disabled={loading}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-bold transition-colors ${currentPage === pageNum
                            ? 'bg-sky-600 text-white shadow-sm'
                            : 'text-[var(--text-muted)] hover:bg-sky-50 hover:text-sky-700'
                            }`}
                    >
                        {pageNum}
                    </button>
                );
            })}

            {hasMore && totalPages > 5 && (
                <span className="text-[var(--text-muted)] text-xs px-1">...</span>
            )}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={(currentPage >= totalPages && !hasMore) || loading}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-muted)] hover:bg-sky-50 hover:border-sky-200 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>

            {loading && (
                <svg className="w-4 h-4 animate-spin ml-2 text-sky-500" aria-hidden="true" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            )}
        </div>
    );
};

export default function LiquidityPoolsDesktopView({ initialPools }: LiquidityPoolsDesktopViewProps) {
    const { network } = useNetwork();

    const [pools, setPools] = useState<LiquidityPool[]>(initialPools._embedded.records);
    const [isInitialLoading, setIsInitialLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [oldestCursor, setOldestCursor] = useState<string | null>(initialPools._links.next?.href || null);
    const [hasMore, setHasMore] = useState(!!initialPools._links.next?.href);
    const [searchQuery, setSearchQuery] = useState('');
    const seenIdsRef = useRef<Set<string>>(new Set(initialPools._embedded.records.map(p => p.id)));

    const fetchMoreIfNeeded = useCallback(async (targetPage: number) => {
        const neededItems = targetPage * PAGE_SIZE;
        if (neededItems <= pools.length || !hasMore || isLoadingMore) return;

        setIsLoadingMore(true);

        try {
            const cursor = pools[pools.length - 1]?.paging_token;

            if (!cursor) {
                setIsLoadingMore(false);
                setHasMore(false);
                return;
            }

            const res = await fetch(
                `${getBaseUrl()}/liquidity_pools?limit=${PAGE_SIZE}&order=desc&cursor=${cursor}`
            );
            const data: PaginatedResponse<LiquidityPool> = await res.json();
            const olderPools = data._embedded.records;

            if (olderPools.length === 0) {
                setIsLoadingMore(false);
                setHasMore(false);
                return;
            }

            setOldestCursor(data._links.next?.href || null);
            setHasMore(olderPools.length >= PAGE_SIZE);

            // Filter out already seen pools
            const unseenPools = olderPools.filter(p => !seenIdsRef.current.has(p.id));

            setPools(prev => {
                const newPools = [...prev, ...unseenPools];
                seenIdsRef.current = new Set(newPools.map(p => p.id));
                return newPools;
            });
        } catch (error) {
            console.error('Failed to load more pools:', error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, pools, hasMore]);

    const goToPage = useCallback((page: number) => {
        setCurrentPage(page);
        fetchMoreIfNeeded(page);
    }, [fetchMoreIfNeeded]);

    // Filter pools based on search
    const filteredPools = useMemo(() => {
        if (!searchQuery.trim()) return pools;
        const query = searchQuery.toLowerCase();
        return pools.filter(pool => {
            const codeA = getAssetCode(pool.reserves[0]?.asset || '');
            const codeB = getAssetCode(pool.reserves[1]?.asset || '');
            const issuerA = getAssetIssuer(pool.reserves[0]?.asset || '');
            const issuerB = getAssetIssuer(pool.reserves[1]?.asset || '');
            return (
                pool.id.toLowerCase().includes(query) ||
                codeA.toLowerCase().includes(query) ||
                codeB.toLowerCase().includes(query) ||
                (issuerA && issuerA.toLowerCase().includes(query)) ||
                (issuerB && issuerB.toLowerCase().includes(query))
            );
        });
    }, [pools, searchQuery]);

    // Calculate stats
    const stats = useMemo(() => {
        const total = pools.length;
        const totalTrustlines = pools.reduce((sum, p) => sum + p.total_trustlines, 0);
        const totalShares = pools.reduce((sum, p) => sum + parseFloat(p.total_shares || '0'), 0);

        // Estimate total liquidity (sum of all reserves)
        let totalLiquidity = 0;
        pools.forEach(pool => {
            pool.reserves.forEach(r => {
                totalLiquidity += parseFloat(r.amount || '0');
            });
        });

        return { total, totalTrustlines, totalShares, totalLiquidity };
    }, [pools]);

    // Calculate pagination
    const totalPages = Math.ceil(filteredPools.length / PAGE_SIZE) + (hasMore ? 1 : 0);
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const visiblePools = filteredPools.slice(startIndex, startIndex + PAGE_SIZE);

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
            <div className="mx-auto max-w-[1400px] p-4 lg:p-4">
                {/* Header Card */}
                <div className="mb-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        {/* Left: Title & Meta */}
                        <div className="flex items-start gap-4 min-w-0">
                            <Link
                                href="/"
                                className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400 transition hover:bg-sky-100 dark:hover:bg-sky-900/60"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </Link>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Stellar DEX</span>
                                    <span className="bg-sky-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                                        AMM
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-violet-500">
                                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                                        Liquidity Pools
                                    </span>
                                </div>
                                <div className="text-xl font-bold text-[var(--text-primary)]">Liquidity Pools</div>
                                <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                                    Automated Market Maker pools on the Stellar network
                                </div>
                            </div>
                        </div>

                        {/* Right: Quick Stats */}
                        <div className="flex gap-3 flex-wrap">
                            <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] min-w-[90px]">
                                <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Pools</div>
                                <div className="text-lg font-bold text-[var(--text-primary)]">{stats.total.toLocaleString()}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800/50 min-w-[100px]">
                                <div className="text-[9px] font-bold text-violet-700 dark:text-violet-400 uppercase tracking-widest mb-1">Total Shares</div>
                                <div className="text-lg font-bold text-violet-700 dark:text-violet-400">{formatShares(stats.totalShares.toString())}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800/50 min-w-[100px]">
                                <div className="text-[9px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-widest mb-1">Liquidity</div>
                                <div className="text-lg font-bold text-sky-700 dark:text-sky-400">{formatAmount(stats.totalLiquidity.toString())}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search / Filters Row */}
                <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-4 h-4 text-[var(--text-muted)] pointer-events-none" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by asset code, issuer, or pool ID..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-colors"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)] transition-colors"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                        <span className="font-medium">{filteredPools.length}</span>
                        <span>pools found</span>
                    </div>
                </div>

                {/* Pools Table */}
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full sc-table">
                            <thead>
                                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]">
                                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">Pool</th>
                                    <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right whitespace-nowrap">Reserve A</th>
                                    <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right whitespace-nowrap">Reserve B</th>
                                    <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right whitespace-nowrap">Exchange Rate</th>
                                    <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right whitespace-nowrap">Total Shares</th>
                                    <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right whitespace-nowrap">Trustlines</th>
                                    <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-center whitespace-nowrap">Fee</th>
                                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-center whitespace-nowrap w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)]">
                                {isInitialLoading ? (
                                    // Skeleton loading
                                    Array.from({ length: 15 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="py-3 px-4"><div className="h-10 w-32 bg-[var(--bg-tertiary)] rounded" /></td>
                                            <td className="py-3 px-3"><div className="h-4 w-20 bg-[var(--bg-tertiary)] rounded ml-auto" /></td>
                                            <td className="py-3 px-3"><div className="h-4 w-20 bg-[var(--bg-tertiary)] rounded ml-auto" /></td>
                                            <td className="py-3 px-3"><div className="h-4 w-24 bg-[var(--bg-tertiary)] rounded ml-auto" /></td>
                                            <td className="py-3 px-3"><div className="h-4 w-16 bg-[var(--bg-tertiary)] rounded ml-auto" /></td>
                                            <td className="py-3 px-3"><div className="h-4 w-12 bg-[var(--bg-tertiary)] rounded ml-auto" /></td>
                                            <td className="py-3 px-3"><div className="h-5 w-12 bg-[var(--bg-tertiary)] rounded mx-auto" /></td>
                                            <td className="py-3 px-4"><div className="h-6 w-6 bg-[var(--bg-tertiary)] rounded mx-auto" /></td>
                                        </tr>
                                    ))
                                ) : visiblePools.length > 0 ? (
                                    visiblePools.map((pool) => {
                                        const assetA = pool.reserves[0];
                                        const assetB = pool.reserves[1];
                                        const codeA = getAssetCode(assetA?.asset || '');
                                        const codeB = getAssetCode(assetB?.asset || '');
                                        const issuerA = getAssetIssuer(assetA?.asset || '');
                                        const issuerB = getAssetIssuer(assetB?.asset || '');
                                        const amountA = parseFloat(assetA?.amount || '0');
                                        const amountB = parseFloat(assetB?.amount || '0');
                                        const priceRatio = amountA > 0 ? (amountB / amountA) : 0;
                                        const feePercent = (pool.fee_bp / 100).toFixed(2);

                                        return (
                                            <tr
                                                key={pool.id}
                                                className="hover:bg-[var(--bg-hover)] transition-colors group cursor-pointer"
                                                onClick={() => window.location.href = `/liquidity-pool/${pool.id}`}
                                            >
                                                {/* Pool */}
                                                <td className="py-2.5 px-4">
                                                    <div>
                                                        <Link
                                                            href={`/liquidity-pool/${pool.id}`}
                                                            className="font-semibold text-sm text-[var(--text-primary)] group-hover:text-sky-600 transition-colors"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {codeA} / {codeB}
                                                        </Link>
                                                        <div className="text-[10px] text-[var(--text-muted)] font-mono">
                                                            {shortenAddress(pool.id, 6)}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Reserve A */}
                                                <td className="py-2.5 px-3 text-right">
                                                    <div className="text-[12px] font-medium text-[var(--text-primary)] font-mono">
                                                        {formatAmount(assetA?.amount || '0')}
                                                    </div>
                                                    <div className="text-[10px] text-[var(--text-muted)]">{codeA}</div>
                                                    {issuerA && (
                                                        <div className="text-[9px] text-[var(--text-muted)] font-mono">{shortenAddress(issuerA, 3)}</div>
                                                    )}
                                                </td>

                                                {/* Reserve B */}
                                                <td className="py-2.5 px-3 text-right">
                                                    <div className="text-[12px] font-medium text-[var(--text-primary)] font-mono">
                                                        {formatAmount(assetB?.amount || '0')}
                                                    </div>
                                                    <div className="text-[10px] text-[var(--text-muted)]">{codeB}</div>
                                                    {issuerB && (
                                                        <div className="text-[9px] text-[var(--text-muted)] font-mono">{shortenAddress(issuerB, 3)}</div>
                                                    )}
                                                </td>

                                                {/* Exchange Rate */}
                                                <td className="py-2.5 px-3 text-right">
                                                    <div className="text-[12px] text-[var(--text-secondary)]">
                                                        <span className="text-[var(--text-muted)]">1 {codeA} =</span>
                                                    </div>
                                                    <div className="text-[12px] font-medium text-[var(--text-primary)] font-mono">
                                                        {priceRatio > 1000 ? priceRatio.toExponential(2) : priceRatio.toFixed(4)} <span className="text-[var(--text-muted)] font-normal">{codeB}</span>
                                                    </div>
                                                </td>

                                                {/* Total Shares */}
                                                <td className="py-2.5 px-3 text-right">
                                                    <div className="text-[12px] font-medium text-[var(--text-primary)] font-mono">
                                                        {formatShares(pool.total_shares)}
                                                    </div>
                                                </td>

                                                {/* Trustlines */}
                                                <td className="py-2.5 px-3 text-right">
                                                    <div className="inline-flex items-center gap-1">
                                                        <svg className="w-3 h-3 text-emerald-500" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                        </svg>
                                                        <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                                                            {pool.total_trustlines.toLocaleString()}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Fee */}
                                                <td className="py-2.5 px-3 text-center">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 border border-amber-100 text-[10px] font-bold text-amber-700">
                                                        {feePercent}%
                                                    </span>
                                                </td>

                                                {/* Arrow */}
                                                <td className="py-2.5 px-4 text-center">
                                                    <div className="w-7 h-7 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-sky-50 group-hover:text-sky-700 transition-colors mx-auto">
                                                        <svg className="w-4 h-4" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="text-center py-4 text-[var(--text-muted)] text-sm">
                                            {searchQuery ? 'No pools found matching your search.' : 'No liquidity pools found.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={goToPage}
                        loading={isLoadingMore}
                        hasMore={hasMore}
                    />
                </div>
            </div>
        </div>
    );
}
