'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { MarketAsset } from '@/lib/stellar';
import { containers } from '@/lib/shared/designSystem';
import { assetRoute } from '@/lib/shared/routes';
import InlineSkeleton from '@/components/ui/InlineSkeleton';

interface MarketsMobileViewProps {
  initialAssets: MarketAsset[];
  xlmPrice: number;
  loading?: boolean;
  currentPage: number;
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
  totalPages?: number;
  totalItems?: number;
}

type SortField = 'rank' | 'market_cap' | 'price_usd' | 'change_1h' | 'change_24h' | 'volume_24h';

function formatNumber(num: number): string {
  if (num === 0 || isNaN(num)) return '$--.--';
  const absNum = Math.abs(num);
  if (absNum >= 1e12) return '$' + (num / 1e12).toFixed(2) + 'T';
  if (absNum >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
  if (absNum >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
  if (absNum >= 1e3) return '$' + (num / 1e3).toFixed(2) + 'K';
  return '$' + num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatLargeNumber(num: number): string {
  if (num === 0 || isNaN(num)) return '--';
  const absNum = Math.abs(num);
  if (absNum >= 1e12) return '$' + (num / 1e12).toFixed(2) + 'T';
  if (absNum >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
  if (absNum >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
  if (absNum >= 1e3) return '$' + (num / 1e3).toFixed(1) + 'K';
  return '$' + num.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatPrice(price: number): string {
  if (price === 0 || isNaN(price)) return '$--';
  if (price >= 10000) return '$' + (price / 1000).toFixed(1) + 'K';
  if (price >= 1000) return '$' + price.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (price >= 1) return '$' + price.toFixed(2);
  if (price >= 0.01) return '$' + price.toFixed(3);
  if (price >= 0.001) return '$' + price.toFixed(4);
  if (price >= 0.0001) return '$' + price.toFixed(5);
  if (price >= 0.00001) return '$' + price.toFixed(6);
  return '<$0.00001';
}

function formatXLMPrice(priceInXlm: number): string {
  if (priceInXlm === 0 || isNaN(priceInXlm)) return '-- XLM';
  if (priceInXlm >= 1e9) return (priceInXlm / 1e9).toFixed(1) + 'B XLM';
  if (priceInXlm >= 1e6) return (priceInXlm / 1e6).toFixed(1) + 'M XLM';
  if (priceInXlm >= 1e3) return (priceInXlm / 1e3).toFixed(1) + 'K XLM';
  if (priceInXlm >= 100) return priceInXlm.toFixed(0) + ' XLM';
  if (priceInXlm >= 1) return priceInXlm.toFixed(2) + ' XLM';
  if (priceInXlm >= 0.001) return priceInXlm.toFixed(3) + ' XLM';
  // For tiny values, show as fraction of XLM
  return '<0.001 XLM';
}

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length === 0) {
    return (
      <svg className="overflow-visible" height="18" viewBox="0 0 48 18" width="48">
        <path d="M0 9 L24 9 L48 9" fill="none" stroke="var(--text-muted)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      </svg>
    );
  }

  const width = 48;
  const height = 18;
  const padding = 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' L ');

  const color = positive ? '#10b981' : '#ef4444';

  return (
    <svg className="overflow-visible" height="18" viewBox="0 0 48 18" width="48">
      <path
        d={`M ${points}`}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function ChangeIndicator({ value }: { value: number }) {
  if (value === 0 || isNaN(value)) {
    return <span className="text-xs font-bold text-[var(--text-muted)]">0.00%</span>;
  }

  const isPositive = value >= 0;

  return (
    <span className={`text-xs font-bold ${isPositive ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
      {isPositive ? '+' : ''}{value.toFixed(2)}%
    </span>
  );
}

function getAssetUrl(asset: MarketAsset): string {
  return assetRoute(asset.code, asset.issuer);
}

const ASSETS_PER_PAGE = 50;

export default function MarketsMobileView({
  initialAssets,
  xlmPrice,
  loading = false,
  currentPage,
  hasNextPage,
  onPageChange,
  totalPages = 1,
  totalItems = 0,
}: MarketsMobileViewProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ASSETS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const paginationTotalPages = Math.max(totalPages, hasNextPage ? currentPage + 1 : currentPage, 1);

  // Calculate market totals
  const marketTotals = useMemo(() => {
    const totalMarketCap = initialAssets.reduce((sum, asset) => sum + (asset.market_cap || 0), 0);
    const totalVolume = initialAssets.reduce((sum, asset) => sum + (asset.volume_24h || 0), 0);
    const totalAssets = initialAssets.length;
    return { totalMarketCap, totalVolume, totalAssets };
  }, [initialAssets]);

  const filteredAndSortedAssets = useMemo(() => {
    let assets = [...initialAssets];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      assets = assets.filter(
        (asset) => asset.code.toLowerCase().includes(query) || asset.name.toLowerCase().includes(query)
      );
    }

    assets.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'rank': comparison = (a.rank || 0) - (b.rank || 0); break;
        case 'market_cap': comparison = (b.market_cap || 0) - (a.market_cap || 0); break;
        case 'price_usd': comparison = (b.price_usd || 0) - (a.price_usd || 0); break;
        case 'change_24h': comparison = (b.change_24h || 0) - (a.change_24h || 0); break;
        case 'change_1h': comparison = (b.change_1h || 0) - (a.change_1h || 0); break;
        case 'volume_24h': comparison = (b.volume_24h || 0) - (a.volume_24h || 0); break;
      }
      return comparison;
    });

    return assets;
  }, [initialAssets, searchQuery, sortField]);

  // Get visible assets based on visibleCount
  const visibleAssets = useMemo(() => {
    return filteredAndSortedAssets.slice(0, visibleCount);
  }, [filteredAndSortedAssets, visibleCount]);

  const hasMoreItems = visibleCount < filteredAndSortedAssets.length;
  const filteredCount = filteredAndSortedAssets.length;

  // Load more items function
  const loadMore = useCallback(() => {
    if (!hasMoreItems || isLoadingMore) return;

    setIsLoadingMore(true);
    // Simulate a brief loading state for better UX
    setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + ASSETS_PER_PAGE, filteredAndSortedAssets.length));
      setIsLoadingMore(false);
    }, 200);
  }, [hasMoreItems, isLoadingMore, filteredAndSortedAssets.length]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreItems && !isLoadingMore) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMoreItems, isLoadingMore, loadMore]);

  // Reset visible count when search or sort changes
  useEffect(() => {
    setVisibleCount(ASSETS_PER_PAGE);
  }, [searchQuery, sortField]);

  // Reset visible count when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleSortChange = (field: SortField) => {
    setSortField(field);
    setShowSortMenu(false);
  };

  const handleRowClick = (asset: MarketAsset) => {
    router.push(getAssetUrl(asset));
  };

  const sortLabels: Record<SortField, string> = {
    rank: 'Rank',
    market_cap: 'Market Cap',
    volume_24h: 'Volume',
    change_1h: '1h Change',
    change_24h: '24h Change',
    price_usd: 'Price',
  };

  return (
    <div className={`${containers.page}`}>
      {/* Header - Sticky */}
      <header className="pt-3 pb-3 sticky top-0 z-20 bg-[var(--bg-primary)]/90 backdrop-blur-md">
        {/* Market Stats Summary */}
        <div className="mx-3 mb-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-sm overflow-visible">
          <div className="flex divide-x divide-[var(--border-subtle)]">
            <div className="flex-1 py-2.5 px-3 text-center group relative">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium">Market Cap</p>
                <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 16v-4m0-4h.01" />
                </svg>
              </div>
              <p className="text-sm font-bold" style={{ color: 'var(--primary-blue)' }}>{loading ? <InlineSkeleton width="w-16" /> : formatLargeNumber(marketTotals.totalMarketCap)}</p>
              <div className="absolute top-full left-0 mt-2 px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-[10px] rounded-lg opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30 border border-[var(--border-default)]">
                Total market cap of all Stellar assets
              </div>
            </div>
            <div className="flex-1 py-2.5 px-3 text-center group relative">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium">Volume 24h</p>
                <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 16v-4m0-4h.01" />
                </svg>
              </div>
              <p className="text-sm font-bold" style={{ color: 'var(--primary-blue)' }}>{loading ? <InlineSkeleton width="w-16" /> : formatLargeNumber(marketTotals.totalVolume)}</p>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-[10px] rounded-lg opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30 border border-[var(--border-default)]">
                Combined 24h trading volume
              </div>
            </div>
            <div className="flex-1 py-2.5 px-3 text-center group relative">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium">Assets</p>
                <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 16v-4m0-4h.01" />
                </svg>
              </div>
              <p className="text-sm font-bold" style={{ color: 'var(--primary-blue)' }}>{loading ? <InlineSkeleton width="w-10" /> : (totalItems > 0 ? totalItems.toLocaleString() : marketTotals.totalAssets)}</p>
              <div className="absolute top-full right-0 mt-2 px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-[10px] rounded-lg opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30 border border-[var(--border-default)]">
                Total tracked Stellar assets
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter - aligned with list */}
        <div className="flex gap-2 items-stretch px-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3 z-10 flex items-center text-[var(--text-muted)] pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search assets..."
              className="w-full h-10 pl-10 pr-3 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl text-sm font-medium placeholder-[var(--text-muted)] text-[var(--text-primary)]"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1.5 h-10 px-3 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl text-sm font-medium text-[var(--text-secondary)] whitespace-nowrap hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              {sortLabels[sortField]}
              <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                <div className="absolute right-0 mt-2 w-40 bg-[var(--bg-secondary)] rounded-xl shadow-lg border border-[var(--border-default)] py-1 z-20">
                  {(Object.keys(sortLabels) as SortField[]).map((field) => (
                    <button
                      key={field}
                      onClick={() => handleSortChange(field)}
                      className={`w-full text-left px-4 py-2 text-sm ${sortField === field ? 'bg-[var(--bg-tertiary)] font-medium' : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)]'}`}
                      style={sortField === field ? { color: 'var(--primary-blue)' } : undefined}
                    >
                      {sortLabels[field]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex justify-between items-center mt-3 px-4">
          <span className="text-xs font-medium text-[var(--text-tertiary)]">
            {loading ? <InlineSkeleton width="w-36" /> : <>{filteredCount} assets {filteredCount > ASSETS_PER_PAGE && `• Showing ${Math.min(visibleCount, filteredCount)}`}</>}
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
            <span className="text-xs font-medium text-[var(--text-tertiary)]">Live prices</span>
          </div>
        </div>
      </header>

      {/* Asset List */}
      <main className="px-3">
        {/* Column Headers */}
        <div className="flex items-center px-3 py-2">
          <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-bold w-7">#</span>
          <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-bold flex-1 pl-4">Asset</span>
          <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-bold w-20 text-center">Price</span>
          <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-bold w-16 text-right">Change</span>
        </div>

        {/* Asset Cards */}
        <div className="space-y-1.5">
          {loading ? (
            Array.from({ length: 10 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-3 py-3 flex items-center"
              >
                <div className="w-6 flex-shrink-0"><InlineSkeleton width="w-4" /></div>
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mr-2 bg-slate-700" />
                <div className="flex-1 min-w-0">
                  <InlineSkeleton width="w-14" />
                  <div className="mt-1"><InlineSkeleton width="w-20" /></div>
                </div>
                <div className="w-20 text-right">
                  <InlineSkeleton width="w-16" />
                  <div className="mt-1"><InlineSkeleton width="w-14" /></div>
                </div>
                <div className="w-16 flex flex-col items-end pl-2">
                  <InlineSkeleton width="w-12" />
                  <div className="mt-1"><InlineSkeleton width="w-10" /></div>
                </div>
              </div>
            ))
          ) : visibleAssets.map((asset, index) => {
            const hasData = asset.price_usd > 0 && asset.market_cap > 0;
            const priceInXlm = xlmPrice > 0 ? (asset.price_usd || 0) / xlmPrice : 0;
            const change = asset.change_1h || 0;
            const isPositive = change > 0;
            const isNeutral = change === 0;
            const displayRank = asset.rank > 0 ? asset.rank : ((currentPage - 1) * 50 + index + 1);

            return (
              <div
                key={`${asset.code}-${asset.issuer || 'native'}`}
                className={`bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-3 py-3 flex items-center active:bg-[var(--bg-tertiary)] transition-colors cursor-pointer ${!hasData ? 'opacity-50' : ''}`}
                onClick={() => handleRowClick(asset)}
              >
                {/* Rank */}
                <div className="w-6 flex-shrink-0">
                    <span className="text-xs font-medium text-[var(--text-muted)]">
                    {displayRank}
                  </span>
                </div>

                {/* Logo */}
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mr-2 bg-slate-700 flex items-center justify-center">
                  {asset.code === 'XLM' && !asset.issuer ? (
                    <div className="w-full h-full bg-[var(--text-primary)] flex items-center justify-center">
                      <svg className="w-5 h-5 text-[var(--bg-primary)]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  ) : asset.image ? (
                    <Image
                      src={asset.image}
                      alt={asset.code}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-xs font-bold text-slate-100">
                      {asset.code.slice(0, 2)}
                    </span>
                  )}
                </div>

                {/* Asset Name/MCap */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[15px] leading-tight" style={{ color: 'var(--primary-blue)' }}>{asset.code}</div>
                  <div className="text-xs text-[var(--text-muted)] font-medium leading-tight">
                    {formatNumber(asset.market_cap || 0)}
                  </div>
                </div>

                {/* Price USD + XLM */}
                <div className="w-20 text-right">
                  <div className="font-bold text-[15px] leading-tight" style={{ color: 'var(--primary-blue)' }}>
                    {formatPrice(asset.price_usd || 0)}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] font-medium leading-tight">
                    {formatXLMPrice(priceInXlm)}
                  </div>
                </div>

                {/* Sparkline + Change */}
                <div className="w-16 flex flex-col items-end pl-2">
                  <Sparkline data={asset.sparkline || []} positive={isPositive} />
                  <span className={`text-xs font-medium ${isPositive ? 'text-[var(--success)]' : isNeutral ? 'text-[var(--text-muted)]' : 'text-[var(--error)]'}`}>
                    {isPositive ? '+' : ''}{change.toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sentinel element for Intersection Observer */}
        <div ref={sentinelRef} className="h-4" />

        {/* Loading Spinner */}
        {isLoadingMore && (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-[var(--border-default)] border-t-[var(--primary-blue)] rounded-full animate-spin" />
              <span className="text-xs font-medium text-[var(--text-tertiary)]">Loading more...</span>
            </div>
          </div>
        )}

        {/* Load More Fallback Button */}
        {hasMoreItems && !isLoadingMore && (
          <div className="flex justify-center py-4">
            <button
              onClick={loadMore}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl text-sm font-medium text-[var(--text-tertiary)] shadow-sm hover:bg-[var(--bg-tertiary)] active:bg-[var(--bg-primary)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Load more ({filteredCount - visibleCount} remaining)
            </button>
          </div>
        )}

        {/* No More Items Message */}
        {!hasMoreItems && filteredCount > ASSETS_PER_PAGE && (
          <div className="flex items-center justify-center py-4 pb-4">
            <span className="text-xs font-medium text-[var(--text-muted)]">
              All {filteredCount} assets displayed
            </span>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && filteredAndSortedAssets.length > 0 && (paginationTotalPages > 1 || hasNextPage || currentPage > 1) && (
          <div className="flex flex-col items-center gap-3 py-4 pb-20">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-muted)] active:bg-[var(--bg-tertiary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {(() => {
                const pages: (number | string)[] = [];
                if (paginationTotalPages <= 5) {
                  for (let i = 1; i <= paginationTotalPages; i++) pages.push(i);
                } else {
                  pages.push(1);
                  if (currentPage > 3) pages.push('...');
                  const start = Math.max(2, currentPage - 1);
                  const end = Math.min(paginationTotalPages - 1, currentPage + 1);
                  for (let i = start; i <= end; i++) pages.push(i);
                  if (currentPage < paginationTotalPages - 2) pages.push('...');
                  pages.push(paginationTotalPages);
                }
                return pages.map((page, idx) =>
                  page === '...' ? (
                    <span key={`ellipsis-${idx}`} className="text-[var(--text-muted)] text-xs px-1">...</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => onPageChange(page as number)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-bold transition-colors ${
                        currentPage === page
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'text-[var(--text-muted)] active:bg-sky-50'
                      }`}
                    >
                      {page}
                    </button>
                  )
                );
              })()}

              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={!hasNextPage}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-muted)] active:bg-[var(--bg-tertiary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <span className="text-[10px] font-medium text-[var(--text-muted)]">
              Page {currentPage} of {paginationTotalPages} ({totalItems.toLocaleString()} assets)
            </span>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredAndSortedAssets.length === 0 && (
          <div className="text-center py-4 bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)]">
            <div className="w-12 h-12 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mx-auto mb-3 border border-[var(--border-subtle)]">
              <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-[var(--text-primary)] font-semibold text-sm mb-1">No assets found</h3>
            <p className="text-[var(--text-tertiary)] text-xs">Try a different search term</p>
          </div>
        )}
      </main>
    </div>
  );
}
