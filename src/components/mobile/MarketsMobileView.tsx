'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MarketAsset } from '@/lib/stellar';
import { containers, coreColors } from '@/lib/design-system';

interface MarketsMobileViewProps {
  initialAssets: MarketAsset[];
  xlmPrice: number;
}

type SortField = 'market_cap' | 'price_usd' | 'change_24h' | 'change_7d' | 'volume_24h';

function formatNumber(num: number): string {
  if (num === 0 || isNaN(num)) return '$--.--';
  const absNum = Math.abs(num);
  if (absNum >= 1e12) return '$' + (num / 1e12).toFixed(2) + 'T';
  if (absNum >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
  if (absNum >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
  if (absNum >= 1e3) return '$' + (num / 1e3).toFixed(2) + 'K';
  return '$' + num.toLocaleString(undefined, { maximumFractionDigits: 2 });
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
        <path d="M0 9 L24 9 L48 9" fill="none" stroke="#94a3b8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
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
    return <span className="text-xs font-bold text-slate-400">0.00%</span>;
  }

  const isPositive = value >= 0;

  return (
    <span className={`text-xs font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
      {isPositive ? '+' : ''}{value.toFixed(2)}%
    </span>
  );
}

function getAssetUrl(asset: MarketAsset): string {
  if (asset.code === 'XLM' && !asset.issuer) {
    return '/asset/XLM';
  }
  return `/asset/${encodeURIComponent(asset.code)}${asset.issuer ? `?issuer=${encodeURIComponent(asset.issuer)}` : ''}`;
}

const ASSETS_PER_PAGE = 50;

export default function MarketsMobileView({ initialAssets, xlmPrice }: MarketsMobileViewProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('market_cap');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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
        case 'market_cap': comparison = (b.market_cap || 0) - (a.market_cap || 0); break;
        case 'price_usd': comparison = (b.price_usd || 0) - (a.price_usd || 0); break;
        case 'change_24h': comparison = (b.change_24h || 0) - (a.change_24h || 0); break;
        case 'change_7d': comparison = (b.change_7d || 0) - (a.change_7d || 0); break;
        case 'volume_24h': comparison = (b.volume_24h || 0) - (a.volume_24h || 0); break;
      }
      return comparison;
    });

    return assets;
  }, [initialAssets, searchQuery, sortField]);

  // Reset to page 1 when search or sort changes
  const totalPages = Math.ceil(filteredAndSortedAssets.length / ASSETS_PER_PAGE);
  const paginatedAssets = filteredAndSortedAssets.slice(
    (currentPage - 1) * ASSETS_PER_PAGE,
    currentPage * ASSETS_PER_PAGE
  );

  // Reset page when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleSortChange = (field: SortField) => {
    setSortField(field);
    setCurrentPage(1);
    setShowSortMenu(false);
  };

  const handleRowClick = (asset: MarketAsset) => {
    router.push(getAssetUrl(asset));
  };

  const sortLabels: Record<SortField, string> = {
    market_cap: 'Market Cap',
    volume_24h: 'Volume',
    change_24h: '24h Change',
    change_7d: '7d Change',
    price_usd: 'Price',
  };

  return (
    <div className={`${containers.page}`}>
      {/* Header - Sticky */}
      <header className="pt-3 pb-3 sticky top-0 z-20 bg-slate-100/90 backdrop-blur-md">
        {/* Title Section */}
        <div className="flex items-center gap-2 mb-3 px-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: coreColors.primary }}>
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h1 className="text-base font-bold text-slate-900">Assets</h1>
          <span className="text-[10px] text-slate-400">by market cap</span>
        </div>

        {/* Search & Filter - aligned with list */}
        <div className="flex gap-2 items-stretch px-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search assets..."
              className="w-full h-10 pl-9 pr-3 bg-white border border-slate-200 rounded-xl text-sm font-medium placeholder-slate-400 text-slate-900 outline-none"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1.5 h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 whitespace-nowrap hover:bg-slate-50 transition-colors"
            >
              {sortLabels[sortField]}
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20">
                  {(Object.keys(sortLabels) as SortField[]).map((field) => (
                    <button
                      key={field}
                      onClick={() => handleSortChange(field)}
                      className={`w-full text-left px-4 py-2 text-sm ${sortField === field ? 'bg-slate-50 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                      style={sortField === field ? { color: coreColors.primary } : undefined}
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
          <span className="text-xs font-medium text-slate-500">
            {filteredAndSortedAssets.length} assets {totalPages > 1 && `• Page ${currentPage} of ${totalPages}`}
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-slate-500">Live prices</span>
          </div>
        </div>
      </header>

      {/* Asset List */}
      <main className="px-3">
        {/* Column Headers */}
        <div className="flex items-center px-3 py-2">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold w-9">Rank</span>
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold flex-1">Market Cap</span>
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold w-20 text-center">Price</span>
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold w-16 text-right">Change</span>
        </div>

        {/* Asset Cards */}
        <div className="space-y-1.5">
          {paginatedAssets.map((asset) => {
            const hasData = asset.price_usd > 0 && asset.market_cap > 0;
            const priceInXlm = xlmPrice > 0 ? (asset.price_usd || 0) / xlmPrice : 0;
            const change = asset.change_24h || 0;
            const isPositive = change > 0;
            const isNeutral = change === 0;

            return (
              <div
                key={`${asset.code}-${asset.issuer || 'native'}`}
                className={`bg-white rounded-xl shadow-sm border border-slate-100 px-2.5 py-2 flex items-center active:bg-slate-50 transition-colors cursor-pointer ${!hasData ? 'opacity-50' : ''}`}
                onClick={() => handleRowClick(asset)}
              >
                {/* Rank Badge */}
                <div className="w-9 flex-shrink-0">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold" style={{ backgroundColor: coreColors.primary }}>
                    {hasData ? asset.rank : '--'}
                  </div>
                </div>

                {/* Asset Name/MCap */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm leading-tight" style={{ color: coreColors.primary }}>{asset.code}</div>
                  <div className="text-[10px] text-slate-400 font-medium leading-tight">
                    {formatNumber(asset.market_cap || 0)}
                  </div>
                </div>

                {/* Price USD + XLM */}
                <div className="w-20 text-right">
                  <div className="font-bold text-sm leading-tight" style={{ color: coreColors.primary }}>
                    {formatPrice(asset.price_usd || 0)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium leading-tight">
                    {formatXLMPrice(priceInXlm)}
                  </div>
                </div>

                {/* Sparkline + Change */}
                <div className="w-16 flex flex-col items-end pl-1">
                  <Sparkline data={asset.sparkline || []} positive={isPositive} />
                  <div className="flex items-center gap-0.5">
                    {!isNeutral && (
                      <span className={`text-[9px] ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                        {isPositive ? '▲' : '▼'}
                      </span>
                    )}
                    <span className={`text-[10px] font-bold ${isPositive ? 'text-emerald-500' : isNeutral ? 'text-slate-400' : 'text-red-500'}`}>
                      {Math.abs(change).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredAndSortedAssets.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-100">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-slate-900 font-semibold text-sm mb-1">No assets found</h3>
            <p className="text-slate-500 text-xs">Try a different search term</p>
          </div>
        )}

        {/* Pagination - Outside Card */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4 pb-4">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-40 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <span className="text-xs font-medium text-slate-500">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-40 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
