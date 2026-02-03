'use client';

import { useState, useMemo } from 'react';
import { MarketAsset } from '@/lib/stellar';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface MarketsDesktopViewProps {
  initialAssets: MarketAsset[];
  xlmPrice: number;
}

type SortField = 'rank' | 'market_cap' | 'price_usd' | 'change_24h' | 'change_7d' | 'volume_24h';
type SortOrder = 'asc' | 'desc';

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length === 0) return <div className="w-[100px] h-[30px]" />;

  const width = 100;
  const height = 30;
  const padding = 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const firstPoint = `${padding},${height - padding}`;
  const lastPoint = `${width - padding},${height - padding}`;
  const areaPath = `M ${firstPoint} L ${points} L ${lastPoint} Z`;

  const color = positive ? '#10b981' : '#ef4444';
  const fillColor = positive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)';

  return (
    <svg width={width} height={height}>
      <path d={areaPath} fill={fillColor} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatNumber(num: number): string {
  if (num === 0 || isNaN(num)) return '0';
  const absNum = Math.abs(num);
  if (absNum >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (absNum >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (absNum >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (absNum >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
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

function formatXLMPrice(priceInXlm: number): string {
  if (priceInXlm === 0 || isNaN(priceInXlm)) return '-- XLM';
  if (priceInXlm >= 1e9) return (priceInXlm / 1e9).toFixed(1) + 'B XLM';
  if (priceInXlm >= 1e6) return (priceInXlm / 1e6).toFixed(1) + 'M XLM';
  if (priceInXlm >= 1e3) return (priceInXlm / 1e3).toFixed(1) + 'K XLM';
  if (priceInXlm >= 100) return priceInXlm.toFixed(0) + ' XLM';
  if (priceInXlm >= 1) return priceInXlm.toFixed(2) + ' XLM';
  if (priceInXlm >= 0.001) return priceInXlm.toFixed(3) + ' XLM';
  return '<0.001 XLM';
}

function formatPrice(price: number): string {
  if (price >= 1000) return '$' + price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (price >= 1) return '$' + price.toFixed(2);
  if (price >= 0.01) return '$' + price.toFixed(4);
  if (price >= 0.0001) return '$' + price.toFixed(6);
  return '$' + price.toFixed(8);
}

function ChangeCell({ value }: { value: number }) {
  const isPositive = value > 0;
  const isNeutral = Math.abs(value) < 0.01;

  if (isNeutral) {
    return <span className="text-slate-400 text-[12px]">0.00%</span>;
  }

  return (
    <span className={`text-[12px] font-medium ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
      {isPositive && '+'}
      {value.toFixed(2)}%
    </span>
  );
}

function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  return (
    <svg className={`w-3 h-3 ml-1 inline-block ${active ? 'text-sky-600' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 24 24">
      {order === 'desc' || !active ? (
        <path d="M7 10l5 5 5-5H7z" />
      ) : (
        <path d="M7 14l5-5 5 5H7z" />
      )}
    </svg>
  );
}

function getAssetUrl(asset: MarketAsset): string {
  if (asset.code === 'XLM' && !asset.issuer) {
    return '/asset/XLM';
  }
  return `/asset/${encodeURIComponent(asset.code)}${asset.issuer ? `?issuer=${encodeURIComponent(asset.issuer)}` : ''}`;
}

export default function MarketsDesktopView({ initialAssets, xlmPrice }: MarketsDesktopViewProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('market_cap');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

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
        case 'rank': comparison = a.rank - b.rank; break;
        case 'market_cap': comparison = (b.market_cap || 0) - (a.market_cap || 0); break;
        case 'price_usd': comparison = (b.price_usd || 0) - (a.price_usd || 0); break;
        case 'change_24h': comparison = (b.change_24h || 0) - (a.change_24h || 0); break;
        case 'change_7d': comparison = (b.change_7d || 0) - (a.change_7d || 0); break;
        case 'volume_24h': comparison = (b.volume_24h || 0) - (a.volume_24h || 0); break;
      }
      return sortOrder === 'desc' ? comparison : -comparison;
    });

    return assets;
  }, [initialAssets, searchQuery, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleFavorite = (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(assetId)) {
        newFavorites.delete(assetId);
      } else {
        newFavorites.add(assetId);
      }
      return newFavorites;
    });
  };

  const handleRowClick = (asset: MarketAsset) => {
    router.push(getAssetUrl(asset));
  };

  const HeaderCell = ({ label, field, className = '' }: { label: string; field?: SortField; className?: string }) => {
    const isSortable = !!field;
    const isActive = sortField === field;

    return (
      <th
        className={`py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-left whitespace-nowrap ${isSortable ? 'cursor-pointer hover:text-sky-600 transition-colors select-none' : ''} ${isActive ? 'text-sky-600' : 'text-slate-400'} ${className}`}
        onClick={() => field && handleSort(field)}
      >
        <span className="inline-flex items-center">
          {label}
          {isSortable && <SortIcon active={isActive} order={sortOrder} />}
        </span>
      </th>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-[1600px] p-6 lg:p-8">
        {/* Header Card */}
        <div className="mb-5 rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            {/* Left: Title & Meta */}
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Markets</span>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-900">Stellar Assets</div>
                <div className="mt-1 text-xs text-slate-500">
                  Network assets ranked by market capitalization
                </div>
              </div>
            </div>

            {/* Right: Quick Stats */}
            <div className="flex gap-3">
              <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100 min-w-[110px]">
                <div className="text-[9px] font-bold text-sky-600/60 uppercase tracking-widest mb-1">Market Cap</div>
                <div className="text-lg font-bold text-sky-600">{formatLargeNumber(marketTotals.totalMarketCap)}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 min-w-[110px]">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Volume 24h</div>
                <div className="text-lg font-bold text-slate-900">{formatLargeNumber(marketTotals.totalVolume)}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 min-w-[90px]">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Assets</div>
                <div className="text-lg font-bold text-slate-900">{marketTotals.totalAssets}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-5">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets..."
              className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-300 pl-11 text-sm shadow-sm"
            />
          </div>

          <div className="text-sm text-slate-400">
            Showing {filteredAndSortedAssets.length} assets
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="py-3 px-3 w-8"></th>
                <HeaderCell label="#" field="rank" className="w-12" />
                <HeaderCell label="Name" className="min-w-[180px]" />
                <HeaderCell label="Price" field="price_usd" className="text-right" />
                <HeaderCell label="24h %" field="change_24h" className="text-right" />
                <HeaderCell label="7d %" field="change_7d" className="text-right" />
                <HeaderCell label="Market Cap" field="market_cap" className="text-right" />
                <HeaderCell label="Volume (24h)" field="volume_24h" className="text-right" />
                <HeaderCell label="Supply" className="text-right" />
                <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-right">
                  Last 7 Days
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedAssets.map((asset) => {
                const assetId = `${asset.code}-${asset.issuer || 'native'}`;
                const isFavorite = favorites.has(assetId);
                const priceInXlm = xlmPrice > 0 ? (asset.price_usd || 0) / xlmPrice : 0;

                return (
                  <tr
                    key={assetId}
                    className="hover:bg-sky-50/30 transition-colors group cursor-pointer"
                    onClick={() => handleRowClick(asset)}
                  >
                    {/* Favorite */}
                    <td className="py-3 px-3">
                      <button
                        onClick={(e) => toggleFavorite(assetId, e)}
                        className={`transition-colors ${isFavorite ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}`}
                      >
                        <svg className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                    </td>

                    {/* Rank */}
                    <td className="py-3 px-3 text-slate-400 text-[13px] font-medium">{asset.rank}</td>

                    {/* Name */}
                    <td className="py-3 px-3">
                      <Link href={getAssetUrl(asset)} className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-slate-100 flex items-center justify-center">
                          {asset.code === 'XLM' && !asset.issuer ? (
                            <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
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
                            <span className="text-[10px] font-bold text-slate-500">
                              {asset.code.slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-slate-900 font-semibold text-[13px] group-hover:text-sky-600 transition-colors block">{asset.name}</span>
                          <span className="text-slate-400 text-[11px] font-medium">{asset.code}</span>
                        </div>
                      </Link>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-3 text-right">
                      <div className="text-slate-900 font-semibold text-[13px]">{formatPrice(asset.price_usd || 0)}</div>
                      <div className="text-slate-400 text-[10px]">{formatXLMPrice(priceInXlm)}</div>
                    </td>

                    {/* 24h Change */}
                    <td className="py-3 px-3 text-right">
                      <ChangeCell value={asset.change_24h || 0} />
                    </td>

                    {/* 7d Change */}
                    <td className="py-3 px-3 text-right">
                      <ChangeCell value={asset.change_7d || 0} />
                    </td>

                    {/* Market Cap */}
                    <td className="py-3 px-3 text-right">
                      <span className="text-slate-900 text-[13px]">${formatNumber(asset.market_cap || 0)}</span>
                    </td>

                    {/* Volume */}
                    <td className="py-3 px-3 text-right">
                      <span className="text-slate-900 text-[13px]">${formatNumber(asset.volume_24h || 0)}</span>
                    </td>

                    {/* Circulating Supply */}
                    <td className="py-3 px-3 text-right">
                      <span className="text-slate-900 text-[13px]">{formatNumber(asset.circulating_supply || 0)}</span>
                      <div className="text-slate-400 text-[10px]">{asset.code}</div>
                    </td>

                    {/* Sparkline */}
                    <td className="py-3 px-3">
                      <div className="flex justify-end">
                        <Sparkline data={asset.sparkline || []} positive={(asset.change_7d || 0) >= 0} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredAndSortedAssets.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-200/60">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-slate-900 font-semibold mb-1">No assets found</h3>
            <p className="text-slate-400 text-sm">No assets matching &quot;{searchQuery}&quot;</p>
          </div>
        )}
      </div>
    </div>
  );
}
