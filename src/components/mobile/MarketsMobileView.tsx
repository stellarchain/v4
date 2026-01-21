'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MarketAsset } from '@/lib/stellar';

interface MarketsMobileViewProps {
  initialAssets: MarketAsset[];
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
  if (price === 0 || isNaN(price)) return '$--.--';
  if (price >= 1000) return '$' + price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (price >= 1) return '$' + price.toFixed(2);
  if (price >= 0.01) return '$' + price.toFixed(4);
  if (price >= 0.0001) return '$' + price.toFixed(6);
  return '$' + price.toFixed(8);
}

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length === 0) {
    return (
      <svg className="overflow-visible mb-1" height="24" viewBox="0 0 60 24" width="60">
        <path d="M0 12 L30 12 L60 12" fill="none" stroke="#94a3b8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      </svg>
    );
  }

  const width = 60;
  const height = 24;
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
    <svg className="overflow-visible mb-1" height="24" viewBox="0 0 60 24" width="60">
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
    <span className={`text-xs font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
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

export default function MarketsMobileView({ initialAssets }: MarketsMobileViewProps) {
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
    <div className="w-full bg-[#f3f6f8] min-h-screen pb-24 font-sans">
      {/* Header - Sticky */}
      <header className="pt-6 px-5 pb-4 sticky top-0 z-10 bg-[#f3f6f8]/95 backdrop-blur-sm">
        {/* Title Section */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-slate-900/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Assets</h1>
            <p className="text-sm text-slate-500">Stellar network assets by market cap</p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search assets..."
              className="w-full pl-10 pr-4 py-3 bg-white border-none rounded-xl text-sm font-medium placeholder-slate-400 text-slate-900 shadow-sm focus:ring-2 focus:ring-slate-900 focus:outline-none transition-all"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl shadow-sm text-sm font-medium text-slate-700 whitespace-nowrap hover:bg-slate-50 transition-colors"
            >
              {sortLabels[sortField]}
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-20">
                  {(Object.keys(sortLabels) as SortField[]).map((field) => (
                    <button
                      key={field}
                      onClick={() => handleSortChange(field)}
                      className={`w-full text-left px-4 py-2 text-sm ${sortField === field ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
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
        <div className="flex justify-between items-center mt-4 px-1">
          <span className="text-xs font-medium text-slate-500">
            {filteredAndSortedAssets.length} assets {totalPages > 1 && `• Page ${currentPage} of ${totalPages}`}
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-medium text-slate-500">Live prices</span>
          </div>
        </div>
      </header>

      {/* Asset List */}
      <main className="px-4 flex flex-col gap-3">
        {paginatedAssets.map((asset) => {
          const hasData = asset.price_usd > 0 && asset.market_cap > 0;

          return (
            <div
              key={`${asset.code}-${asset.issuer || 'native'}`}
              className={`bg-white p-4 rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] flex items-center justify-between hover:scale-[1.01] transition-transform active:scale-[0.99] cursor-pointer ${!hasData ? 'opacity-50' : ''}`}
              onClick={() => handleRowClick(asset)}
            >
              {/* Left: Rank + Name/MCap */}
              <div className="flex items-center gap-4">
                <span className="text-slate-300 font-semibold w-5 text-center text-sm">
                  {hasData ? asset.rank : '--'}
                </span>
                <div>
                  <div className="font-bold text-slate-900 text-base">{asset.code}</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                    {formatNumber(asset.market_cap || 0)}
                  </div>
                </div>
              </div>

              {/* Right: Price + Sparkline/Change */}
              <div className="flex-1 flex justify-end items-center gap-6">
                <div className="text-right">
                  <div className="font-bold text-slate-900 tracking-tight">
                    {formatPrice(asset.price_usd || 0)}
                  </div>
                </div>
                <div className="flex flex-col items-end w-20">
                  <Sparkline data={asset.sparkline || []} positive={(asset.change_24h || 0) >= 0} />
                  <ChangeIndicator value={asset.change_24h || 0} />
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {filteredAndSortedAssets.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-slate-900 font-semibold text-sm mb-1">No assets found</h3>
            <p className="text-slate-500 text-xs">Try a different search term</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4 pb-4">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                    currentPage === page
                      ? 'bg-slate-900 text-white shadow-lg'
                      : 'bg-white shadow-sm border border-slate-100 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
