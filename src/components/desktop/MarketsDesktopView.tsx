'use client';

import { useId, useState, useMemo } from 'react';
import { MarketAsset } from '@/lib/stellar';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { assetRoute } from '@/lib/shared/routes';
import InlineSkeleton from '@/components/ui/InlineSkeleton';

interface MarketsDesktopViewProps {
  initialAssets: MarketAsset[];
  xlmPrice: number;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  loading?: boolean;
  currentPage: number;
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
  totalPages?: number;
  totalItems?: number;
}

type SortField = 'rank' | 'market_cap' | 'price_usd' | 'volume_24h';
type SortOrder = 'asc' | 'desc';

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length === 0) return <div className="w-[100px] h-[30px]" />;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const gradientId = useId();

  const width = 116;
  const height = 36;
  const padding = 3;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const denominator = Math.max(data.length - 1, 1);
  const points = data.map((value, index) => {
    const x = padding + (index / denominator) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return { x, y, value };
  });
  const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(' ');

  const makeSmoothLinePath = () => {
    if (points.length === 1) {
      const p = points[0];
      return `M ${p.x} ${p.y} L ${p.x + 0.1} ${p.y}`;
    }
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const curr = points[i];
      const cx = (prev.x + curr.x) / 2;
      d += ` Q ${prev.x} ${prev.y} ${cx} ${(prev.y + curr.y) / 2}`;
    }
    const last = points[points.length - 1];
    d += ` T ${last.x} ${last.y}`;
    return d;
  };

  const linePath = makeSmoothLinePath();
  const firstPoint = `${padding},${height - padding}`;
  const lastPoint = `${width - padding},${height - padding}`;
  const areaPath = `${linePath} L ${lastPoint} L ${firstPoint} Z`;

  const color = positive ? '#10b981' : '#ef4444';
  const fillColor = positive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';
  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;
  const tooltipText = hoveredPoint ? hoveredPoint.value.toFixed(6) : '';
  const tooltipWidth = Math.max(52, tooltipText.length * 5.3);
  const tooltipX = hoveredPoint ? Math.min(Math.max(hoveredPoint.x, tooltipWidth / 2 + 2), width - tooltipWidth / 2 - 2) : 0;
  const tooltipY = hoveredPoint ? Math.max(hoveredPoint.y - 10, 10) : 0;
  const lastVisiblePoint = points[points.length - 1];

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>

      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle
        cx={lastVisiblePoint.x}
        cy={lastVisiblePoint.y}
        r="2.5"
        fill={color}
        stroke="var(--bg-secondary)"
        strokeWidth="1.2"
      />

      {points.map((point, index) => (
        <circle
          key={`spark-${index}`}
          cx={point.x}
          cy={point.y}
          r="4"
          fill="transparent"
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        />
      ))}
      {hoveredPoint && (
        <g pointerEvents="none">
          <rect
            x={tooltipX - tooltipWidth / 2}
            y={tooltipY - 9}
            width={tooltipWidth}
            height="12"
            rx="4"
            fill="var(--bg-secondary)"
            stroke="var(--border-default)"
            strokeWidth="0.6"
          />
          <text
            x={tooltipX}
            y={tooltipY - 1.5}
            textAnchor="middle"
            fontSize="7"
            fill="var(--text-secondary)"
            fontFamily="monospace"
          >
            {tooltipText}
          </text>
        </g>
      )}
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
    return <span className="text-[var(--text-muted)] text-[12px]">0.00%</span>;
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
    <svg className={`w-3 h-3 ml-1 inline-block ${active ? 'text-sky-600' : 'text-[var(--text-muted)]'}`} fill="currentColor" viewBox="0 0 24 24">
      {order === 'desc' || !active ? (
        <path d="M7 10l5 5 5-5H7z" />
      ) : (
        <path d="M7 14l5-5 5 5H7z" />
      )}
    </svg>
  );
}

function getAssetUrl(asset: MarketAsset): string {
  return assetRoute(asset.code, asset.issuer);
}

export default function MarketsDesktopView({
  initialAssets,
  xlmPrice,
  searchQuery,
  onSearchQueryChange,
  loading = false,
  currentPage,
  hasNextPage,
  onPageChange,
  totalPages = 1,
  totalItems = 0,
}: MarketsDesktopViewProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
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

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      assets = assets.filter(
        (asset) => {
          const code = String(asset.code || '').toLowerCase();
          const issuer = String(asset.issuer || '').toLowerCase();
          const label = String((asset as any).label ?? asset.name ?? '').toLowerCase();
          return code.includes(query) || issuer.includes(query) || label.includes(query);
        }
      );
    }

    assets.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'rank': comparison = (a.rank || 0) - (b.rank || 0); break;
        case 'market_cap': comparison = (a.market_cap || 0) - (b.market_cap || 0); break;
        case 'price_usd': comparison = (a.price_usd || 0) - (b.price_usd || 0); break;
        case 'volume_24h': comparison = (a.volume_24h || 0) - (b.volume_24h || 0); break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return assets;
  }, [initialAssets, searchQuery, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'rank' ? 'asc' : 'desc');
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
        className={`py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-left whitespace-nowrap ${isSortable ? 'cursor-pointer hover:text-sky-700 transition-colors select-none' : ''} ${isActive ? 'text-sky-700' : 'text-[var(--text-muted)]'} ${className}`}
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
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[1400px] p-4 lg:p-4">
        {/* Header Card */}
        <div className="mb-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {/* Left: Title & Meta */}
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-10 h-10 bg-sky-50 dark:bg-sky-900/40 rounded-xl flex items-center justify-center text-sky-700 dark:text-sky-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Markets</span>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live
                  </span>
                </div>
                <div className="text-xl font-bold text-[var(--text-primary)]">Stellar Assets</div>
                <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                  Network assets ranked by market capitalization
                </div>
              </div>
            </div>

            {/* Right: Quick Stats */}
            <div className="flex gap-3">
              <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800/50 min-w-[110px]">
                <div className="text-[9px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-widest mb-1">Market Cap</div>
                <div className="text-lg font-bold text-sky-700 dark:text-sky-400">{loading ? <InlineSkeleton width="w-20" /> : formatLargeNumber(marketTotals.totalMarketCap)}</div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-primary)]/70 border border-[var(--border-subtle)] min-w-[110px]">
                <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Volume 24h</div>
                <div className="text-lg font-bold text-[var(--text-primary)]">{loading ? <InlineSkeleton width="w-20" /> : formatLargeNumber(marketTotals.totalVolume)}</div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-primary)]/70 border border-[var(--border-subtle)] min-w-[90px]">
                <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Assets</div>
                <div className="text-lg font-bold text-[var(--text-primary)]">{loading ? <InlineSkeleton width="w-10" /> : (totalItems > 0 ? totalItems.toLocaleString() : marketTotals.totalAssets)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-5 h-5 text-[var(--text-muted)] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search by code, issuer, label..."
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-300 text-sm shadow-sm"
            />
          </div>

          <div className="text-sm text-[var(--text-muted)]">
            {loading ? <InlineSkeleton width="w-32" /> : <>Showing {filteredAndSortedAssets.length} assets</>}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-sm overflow-hidden">
          <table className="w-full sc-table">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50">
                <th className="py-3 px-3 w-8"></th>
                <HeaderCell label="#" field="rank" className="w-12" />
                <HeaderCell label="Name" className="min-w-[180px]" />
                <HeaderCell label="Price" field="price_usd" className="text-right" />
                <HeaderCell label="1h %" className="text-right" />
                <HeaderCell label="Market Cap" field="market_cap" className="text-right" />
                <HeaderCell label="Volume (24h)" field="volume_24h" className="text-right" />
                <HeaderCell label="Supply" className="text-right" />
                <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-right">
                  Last 1h
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {loading ? (
                Array.from({ length: 10 }).map((_, index) => (
                  <tr key={`skeleton-${index}`}>
                    <td className="py-3 px-3"><InlineSkeleton width="w-4" /></td>
                    <td className="py-3 px-3"><InlineSkeleton width="w-6" /></td>
                    <td className="py-3 px-3"><InlineSkeleton width="w-36" /></td>
                    <td className="py-3 px-3 text-right"><InlineSkeleton width="w-20" /></td>
                    <td className="py-3 px-3 text-right"><InlineSkeleton width="w-14" /></td>
                    <td className="py-3 px-3 text-right"><InlineSkeleton width="w-20" /></td>
                    <td className="py-3 px-3 text-right"><InlineSkeleton width="w-20" /></td>
                    <td className="py-3 px-3 text-right"><InlineSkeleton width="w-16" /></td>
                    <td className="py-3 px-3 text-right"><InlineSkeleton width="w-24" /></td>
                  </tr>
                ))
              ) : filteredAndSortedAssets.map((asset, index) => {
                const assetId = `${asset.code}-${asset.issuer || 'native'}`;
                const isFavorite = favorites.has(assetId);
                const priceInXlm = xlmPrice > 0 ? (asset.price_usd || 0) / xlmPrice : 0;
                const displayRank = asset.rank > 0 ? asset.rank : ((currentPage - 1) * 50 + index + 1);
                const sparklineData = asset.sparkline || [];
                const sparklinePositive = sparklineData.length > 1
                  ? sparklineData[sparklineData.length - 1] >= sparklineData[0]
                  : (asset.change_1h || 0) >= 0;

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
                        className={`transition-colors ${isFavorite ? 'text-amber-400' : 'text-[var(--text-muted)] hover:text-amber-400'}`}
                      >
                        <svg className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                    </td>

                    {/* Rank */}
                    <td className="py-3 px-3 text-[var(--text-muted)] text-[13px] font-medium">{displayRank}</td>

                    {/* Name */}
                    <td className="py-3 px-3">
                      <Link href={getAssetUrl(asset)} className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-slate-700 flex items-center justify-center">
                          {asset.code === 'XLM' && !asset.issuer ? (
                            <div className="w-full h-full bg-[var(--text-primary)] flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
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
                            <span className="text-[10px] font-bold text-slate-100">
                              {asset.code.slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[var(--text-primary)] font-semibold text-[13px] group-hover:text-sky-700 transition-colors block">{asset.name}</span>
                          <span className="text-[var(--text-muted)] text-[11px] font-medium">{asset.code}</span>
                        </div>
                      </Link>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-3 text-right">
                      <div className="text-[var(--text-primary)] font-semibold text-[13px]">{formatPrice(asset.price_usd || 0)}</div>
                      <div className="text-[var(--text-muted)] text-[10px]">{formatXLMPrice(priceInXlm)}</div>
                    </td>

                    {/* 1h Change */}
                    <td className="py-3 px-3 text-right">
                      <ChangeCell value={asset.change_1h || 0} />
                    </td>

                    {/* Market Cap */}
                    <td className="py-3 px-3 text-right">
                      <span className="text-[var(--text-primary)] text-[13px]">${formatNumber(asset.market_cap || 0)}</span>
                    </td>

                    {/* Volume */}
                    <td className="py-3 px-3 text-right">
                      <span className="text-[var(--text-primary)] text-[13px]">${formatNumber(asset.volume_24h || 0)}</span>
                    </td>

                    {/* Circulating Supply */}
                    <td className="py-3 px-3 text-right">
                      <span className="text-[var(--text-primary)] text-[13px]">{formatNumber(asset.circulating_supply || 0)}</span>
                      <div className="text-[var(--text-muted)] text-[10px]">{asset.code}</div>
                    </td>

                    {/* Sparkline */}
                    <td className="py-3 px-3">
                      <div className="flex justify-end">
                        <Sparkline data={sparklineData} positive={sparklinePositive} />
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && filteredAndSortedAssets.length > 0 && (paginationTotalPages > 1 || hasNextPage || currentPage > 1) && (
          <div className="mt-6 flex items-center justify-center gap-1.5">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-muted)] hover:bg-sky-50 hover:border-sky-200 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {(() => {
              const pages: (number | string)[] = [];
              if (paginationTotalPages <= 7) {
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
                        : 'text-[var(--text-muted)] hover:bg-sky-50 hover:text-sky-700'
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
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-muted)] hover:bg-sky-50 hover:border-sky-200 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <span className="ml-3 text-[10px] font-medium text-[var(--text-muted)]">
              Page {currentPage} of {paginationTotalPages} ({totalItems.toLocaleString()} assets)
            </span>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredAndSortedAssets.length === 0 && (
          <div className="text-center py-16 bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)]">
            <div className="w-14 h-14 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-[var(--text-primary)] font-semibold mb-1">No assets found</h3>
            <p className="text-[var(--text-muted)] text-sm">No assets matching &quot;{searchQuery}&quot;</p>
          </div>
        )}
      </div>
    </div>
  );
}
