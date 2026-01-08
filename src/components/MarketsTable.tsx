'use client';

import { useState, useMemo } from 'react';
import { MarketAsset } from '@/lib/stellar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface MarketsTableProps {
  initialAssets: MarketAsset[];
}

type SortField = 'rank' | 'market_cap' | 'price_usd' | 'change_24h' | 'change_7d' | 'volume_24h';
type SortOrder = 'asc' | 'desc';

// Sparkline component - clean enterprise style
function Sparkline({ data, positive, onClick }: { data: number[]; positive: boolean; onClick?: () => void }) {
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

  // Create area fill path
  const firstPoint = `${padding},${height - padding}`;
  const lastPoint = `${width - padding},${height - padding}`;
  const areaPath = `M ${firstPoint} L ${points} L ${lastPoint} Z`;

  const color = positive ? 'var(--success)' : 'var(--error)';
  const fillColor = positive ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)';

  return (
    <svg
      width={width}
      height={height}
      className={onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
      onClick={onClick}
    >
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

function StatBox({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="bg-[var(--bg-tertiary)] rounded-xl p-3">
      <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wide font-medium">{label}</p>
      <p className="text-[14px] font-medium mt-0.5" style={{ color: valueColor || 'var(--text-primary)' }}>{value}</p>
    </div>
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

function formatPrice(price: number): string {
  if (price >= 1000) return '$' + price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (price >= 1) return '$' + price.toFixed(2);
  if (price >= 0.01) return '$' + price.toFixed(4);
  if (price >= 0.0001) return '$' + price.toFixed(6);
  return '$' + price.toFixed(8);
}

function ChangeCell({ value }: { value: number }) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = Math.abs(value) < 0.01;

  if (isNeutral) {
    return <span className="text-[var(--text-tertiary)] text-[11px]">0.00%</span>;
  }

  return (
    <span className={`text-[11px] font-medium ${isPositive ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
      {isPositive && '+'}
      {value.toFixed(2)}%
    </span>
  );
}

// Sort icon
function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  return (
    <svg className={`w-3 h-3 ml-1 inline-block ${active ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`} fill="currentColor" viewBox="0 0 24 24">
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

export default function MarketsTable({ initialAssets }: MarketsTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('market_cap');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

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
        className={`py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap ${isSortable ? 'cursor-pointer hover:text-[var(--text-secondary)] transition-colors select-none' : ''} ${className}`}
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Markets</h1>
            <span className="px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[10px] font-medium text-[#777]">
              Directory
            </span>
          </div>
          <p className="text-[var(--text-muted)] text-xs">
            Stellar network assets ranked by market capitalization
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div />
        <div className="flex items-center gap-2">
          <span className="live-indicator" />
          <span className="text-[12px] text-[var(--text-secondary)] font-medium">Live prices</span>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets..."
            className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all pl-11 shadow-inner text-sm"
          />
        </div>

        {/* Sort Dropdown */}
        <div className="flex gap-2">
          <select
            value={`${sortField}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-') as [SortField, SortOrder];
              setSortField(field);
              setSortOrder(order);
            }}
            className="bg-[var(--bg-tertiary)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 appearance-none cursor-pointer pr-10"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px' }}
          >
            <option value="market_cap-desc">Market Cap</option>
            <option value="volume_24h-desc">Volume (24h)</option>
            <option value="price_usd-desc">Price</option>
            <option value="change_24h-desc">24h Gainers</option>
            <option value="change_24h-asc">24h Losers</option>
            <option value="change_7d-desc">7d Gainers</option>
          </select>

          {/* Columns button (visual only for now) */}
          <button className="bg-[var(--bg-tertiary)] rounded-xl px-4 py-3 text-[var(--text-muted)] text-sm hover:text-[var(--text-primary)] transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4h18M3 8h18M3 12h18M3 16h18M3 20h18" />
            </svg>
            <span className="hidden sm:inline">Columns</span>
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-[var(--bg-secondary)] rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-subtle)]">
              <th className="py-2 px-2 w-6"></th>
              <HeaderCell label="#" field="rank" className="w-10 py-2 px-2" />
              <HeaderCell label="Name" className="min-w-[160px] py-2 px-2" />
              <HeaderCell label="Price" field="price_usd" className="text-right py-2 px-2" />
              <HeaderCell label="1h %" field="change_24h" className="text-right py-2 px-2" />
              <HeaderCell label="24h %" field="change_24h" className="text-right py-2 px-2" />
              <HeaderCell label="7d %" field="change_7d" className="text-right py-2 px-2" />
              <HeaderCell label="Market Cap" field="market_cap" className="text-right py-2 px-2" />
              <HeaderCell label="Volume(24h)" field="volume_24h" className="text-right py-2 px-2" />
              <HeaderCell label="Circulating Supply" className="text-right py-2 px-2" />
              <th className="py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-right whitespace-nowrap">
                Last 7 Days
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedAssets.map((asset) => {
              const assetId = `${asset.code}-${asset.issuer || 'native'}`;
              const isFavorite = favorites.has(assetId);

              return (
                <tr
                  key={assetId}
                  className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-tertiary)]/50 transition-colors group cursor-pointer"
                  onClick={() => handleRowClick(asset)}
                >
                  {/* Favorite */}
                  <td className="py-2.5 px-2">
                    <button
                      onClick={(e) => toggleFavorite(assetId, e)}
                      className="text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill={isFavorite ? 'var(--primary)' : 'none'} stroke={isFavorite ? 'var(--primary)' : 'currentColor'} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                  </td>

                  {/* Rank */}
                  <td className="py-2.5 px-2 text-[var(--text-tertiary)] text-[12px] font-medium">{asset.rank}</td>

                  {/* Name */}
                  <td className="py-2.5 px-2">
                    <Link href={getAssetUrl(asset)} className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[var(--text-primary)] font-medium text-[13px] group-hover:text-[var(--primary)] transition-colors">{asset.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[var(--text-tertiary)] text-[11px] font-medium">{asset.code}</span>
                          <span className="px-1.5 py-0.5 bg-[var(--border-subtle)] text-[var(--text-muted)] text-[9px] font-medium rounded">Buy</span>
                        </div>
                      </div>
                    </Link>
                  </td>

                  {/* Price */}
                  <td className="py-2.5 px-2 text-right">
                    <span className="text-[var(--text-primary)] font-medium text-[13px]">{formatPrice(asset.price_usd || 0)}</span>
                  </td>

                  {/* 1h Change (using 24h as placeholder) */}
                  <td className="py-2.5 px-2 text-right">
                    <ChangeCell value={(asset.change_24h || 0) / 2} />
                  </td>

                  {/* 24h Change */}
                  <td className="py-2.5 px-2 text-right">
                    <ChangeCell value={asset.change_24h || 0} />
                  </td>

                  {/* 7d Change */}
                  <td className="py-2.5 px-2 text-right">
                    <ChangeCell value={asset.change_7d || 0} />
                  </td>

                  {/* Market Cap */}
                  <td className="py-2.5 px-2 text-right">
                    <span className="text-[var(--text-primary)] text-[12px]">${formatNumber(asset.market_cap || 0)}</span>
                    <div className="text-[var(--text-muted)] text-[10px] mt-0.5">
                      {asset.volume_24h > 0 && asset.market_cap > 0 ? `${((asset.volume_24h / asset.market_cap) * 100).toFixed(2)}% of MCap` : ''}
                    </div>
                  </td>

                  {/* Volume */}
                  <td className="py-2.5 px-2 text-right">
                    <span className="text-[var(--text-primary)] text-[12px]">${formatNumber(asset.volume_24h || 0)}</span>
                  </td>

                  {/* Circulating Supply */}
                  <td className="py-2.5 px-2 text-right">
                    <span className="text-[var(--text-primary)] text-[12px]">{formatNumber(asset.circulating_supply || 0)}</span>
                    <div className="text-[var(--text-muted)] text-[10px] mt-0.5">{asset.code}</div>
                  </td>

                  {/* Sparkline */}
                  <td className="py-2.5 px-2">
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

      {/* Tablet Table (simplified) */}
      <div className="hidden md:block lg:hidden bg-[var(--bg-secondary)] rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-subtle)]">
              <HeaderCell label="#" field="rank" className="w-12" />
              <HeaderCell label="Name" />
              <HeaderCell label="Price" field="price_usd" className="text-right" />
              <HeaderCell label="24h %" field="change_24h" className="text-right" />
              <HeaderCell label="Market Cap" field="market_cap" className="text-right" />
              <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-right">7 Days</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedAssets.map((asset) => (
              <tr
                key={`tablet-${asset.code}-${asset.issuer || asset.rank}`}
                className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                onClick={() => handleRowClick(asset)}
              >
                <td className="py-3 px-3 text-[var(--text-tertiary)] text-[13px] font-mono">{asset.rank}</td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div>
                      <span className="text-[var(--text-primary)] font-medium text-[13px]">{asset.code}</span>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-right text-[var(--text-primary)] font-mono text-[13px]">{formatPrice(asset.price_usd || 0)}</td>
                <td className="py-3 px-3 text-right"><ChangeCell value={asset.change_24h || 0} /></td>
                <td className="py-3 px-3 text-right text-[var(--text-primary)] font-mono text-[13px]">${formatNumber(asset.market_cap || 0)}</td>
                <td className="py-3 px-3">
                  <div className="flex justify-end">
                    <Sparkline data={asset.sparkline || []} positive={(asset.change_7d || 0) >= 0} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2">
        {filteredAndSortedAssets.map((asset) => (
          <div
            key={`mobile-${asset.code}-${asset.issuer || asset.rank}`}
            className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm active:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            onClick={() => handleRowClick(asset)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-[var(--text-muted)] text-[11px] font-mono w-5">{asset.rank}</span>
                <div>
                  <span className="text-[var(--text-primary)] font-semibold">{asset.code}</span>
                  <span className="text-[var(--text-tertiary)] text-[12px] ml-2">{asset.name !== asset.code ? asset.name : ''}</span>
                </div>
              </div>
              <Sparkline data={asset.sparkline || []} positive={(asset.change_7d || 0) >= 0} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-[var(--text-primary)] font-mono font-medium">{formatPrice(asset.price_usd || 0)}</span>
                <span className="text-[var(--text-muted)] text-[12px] ml-2">MCap ${formatNumber(asset.market_cap || 0)}</span>
              </div>
              <div className="flex gap-4">
                <div className="text-right">
                  <p className="text-[var(--text-muted)] text-[10px] uppercase">24h</p>
                  <ChangeCell value={asset.change_24h || 0} />
                </div>
                <div className="text-right">
                  <p className="text-[var(--text-muted)] text-[10px] uppercase">7d</p>
                  <ChangeCell value={asset.change_7d || 0} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredAndSortedAssets.length === 0 && (
        <div className="text-center py-20 bg-[var(--bg-secondary)] rounded-2xl shadow-sm">
          <div className="w-16 h-16 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-[var(--text-primary)] font-medium mb-1">No assets found</h3>
          <p className="text-[var(--text-muted)] text-sm">No assets found matching &quot;{searchQuery}&quot;</p>
        </div>
      )}

      {/* Footer Info */}
      <div className="text-sm text-[var(--text-muted)]">
        Showing {filteredAndSortedAssets.length} assets
      </div>
    </div>
  );
}
