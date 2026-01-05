'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { MarketAsset } from '@/lib/stellar';

interface MarketsTableProps {
  initialAssets: MarketAsset[];
}

type SortField = 'rank' | 'market_cap' | 'price_usd' | 'change_24h' | 'change_7d' | 'volume_24h';
type SortOrder = 'asc' | 'desc';
type TimeRange = '24h' | '7d' | '30d';

interface PricePoint {
  timestamp: number;
  price: number;
}

// Large chart component for modal
function DetailedChart({ data, positive }: { data: PricePoint[]; positive: boolean }) {
  if (!data || data.length === 0) return null;

  const width = 600;
  const height = 200;
  const paddingX = 45;
  const paddingY = 25;

  const prices = data.map(d => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const points = data.map((point, index) => {
    const x = paddingX + (index / (data.length - 1)) * (width - paddingX * 2);
    const y = height - paddingY - ((point.price - min) / range) * (height - paddingY * 2);
    return `${x},${y}`;
  }).join(' ');

  const firstPoint = `${paddingX},${height - paddingY}`;
  const lastPoint = `${width - paddingX},${height - paddingY}`;
  const areaPath = `M ${firstPoint} L ${points} L ${lastPoint} Z`;

  const color = positive ? '#BFF549' : '#ef4444';

  const yLabels = [min, min + range * 0.5, max];
  const xLabelIndices = [0, Math.floor(data.length * 0.5), data.length - 1];

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {yLabels.map((_, i) => {
        const y = height - paddingY - (i / 2) * (height - paddingY * 2);
        return <line key={i} x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#1a1a1a" strokeWidth="1" />;
      })}

      {yLabels.map((val, i) => {
        const y = height - paddingY - (i / 2) * (height - paddingY * 2);
        return (
          <text key={i} x={paddingX - 5} y={y + 4} textAnchor="end" className="fill-[#555] text-[9px]">
            ${val < 0.01 ? val.toFixed(6) : val < 1 ? val.toFixed(4) : val.toFixed(2)}
          </text>
        );
      })}

      {xLabelIndices.map((idx) => {
        if (!data[idx]) return null;
        const x = paddingX + (idx / (data.length - 1)) * (width - paddingX * 2);
        const date = new Date(data[idx].timestamp);
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return (
          <text key={idx} x={x} y={height - 5} textAnchor="middle" className="fill-[#555] text-[9px]">
            {label}
          </text>
        );
      })}

      <path d={areaPath} fill="url(#chartGradient)" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {data.length > 0 && (
        <circle
          cx={width - paddingX}
          cy={height - paddingY - ((data[data.length - 1].price - min) / range) * (height - paddingY * 2)}
          r="4"
          fill={color}
        />
      )}
    </svg>
  );
}

// Price chart modal - mobile optimized
function ChartModal({ asset, onClose }: { asset: MarketAsset; onClose: () => void }) {
  const [priceData, setPriceData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  const fetchPriceData = useCallback(async () => {
    setLoading(true);
    try {
      const assetId = asset.code === 'XLM' ? 'XLM' : `${asset.code}-${asset.issuer}`;
      const url = asset.code === 'XLM'
        ? 'https://api.stellar.expert/explorer/public/xlm-price'
        : `https://api.stellar.expert/explorer/public/asset/${assetId}/price`;

      const response = await fetch(url, { headers: { 'Accept': 'application/json' } });

      if (response.ok) {
        const data = await response.json();
        let points: PricePoint[] = [];

        if (Array.isArray(data)) {
          points = data.map((item: [number, number]) => ({ timestamp: item[0], price: item[1] }));
        } else if (data.price7d) {
          points = data.price7d.map((item: [number, number]) => ({ timestamp: item[0], price: item[1] }));
        }

        const now = Date.now();
        const ranges: Record<TimeRange, number> = {
          '24h': 24 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000,
        };

        const filteredPoints = points.filter(p => p.timestamp > now - ranges[timeRange]);
        setPriceData(filteredPoints.length > 0 ? filteredPoints : points.slice(-50));
      } else {
        fallbackToSparkline();
      }
    } catch {
      fallbackToSparkline();
    }
    setLoading(false);

    function fallbackToSparkline() {
      const now = Date.now();
      const interval = 3600000 * 6;
      setPriceData(
        (asset.sparkline || []).map((price, i) => ({
          timestamp: now - (asset.sparkline!.length - 1 - i) * interval,
          price,
        }))
      );
    }
  }, [asset, timeRange]);

  useEffect(() => { fetchPriceData(); }, [fetchPriceData]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const isPositive = (asset.change_7d || 0) >= 0;

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div
        className="relative bg-[#0a0a0a] border-t sm:border border-[#1a1a1a] sm:rounded-2xl w-full sm:max-w-lg max-h-[70vh] sm:max-h-[85vh] mb-16 sm:mb-0 overflow-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 safe-area-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle for mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#333] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1a1a1a]">
          <div>
            <h2 className="text-white font-semibold text-lg">{asset.code}</h2>
            <p className="text-[#555] text-xs">{asset.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1a1a1a] transition-colors">
            <svg className="w-5 h-5 text-[#555]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Price Info */}
        <div className="p-4 border-b border-[#1a1a1a]">
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-semibold text-white">{formatPrice(asset.price_usd || 0)}</span>
            <span className={`text-sm font-medium ${isPositive ? 'text-[#BFF549]' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{(asset.change_7d || 0).toFixed(2)}%
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-[#555]">
            <span>MCap: ${formatNumber(asset.market_cap || 0)}</span>
            <span>Vol 24h: ${formatNumber(asset.volume_24h || 0)}</span>
          </div>
        </div>

        {/* Time Range */}
        <div className="flex gap-2 p-4 border-b border-[#1a1a1a]">
          {(['24h', '7d', '30d'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                timeRange === range ? 'bg-[#BFF549]/10 text-[#BFF549]' : 'text-[#555] hover:text-white bg-[#111]'
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="p-4">
          {loading ? (
            <div className="h-[200px] flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[#BFF549] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <DetailedChart data={priceData} positive={isPositive} />
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 p-4 border-t border-[#1a1a1a]">
          <div className="bg-[#111] rounded-xl p-3">
            <p className="text-[#555] text-[10px] uppercase">24h Change</p>
            <p className={`text-sm font-medium ${(asset.change_24h || 0) >= 0 ? 'text-[#BFF549]' : 'text-red-400'}`}>
              {(asset.change_24h || 0) >= 0 ? '+' : ''}{(asset.change_24h || 0).toFixed(2)}%
            </p>
          </div>
          <div className="bg-[#111] rounded-xl p-3">
            <p className="text-[#555] text-[10px] uppercase">7d Change</p>
            <p className={`text-sm font-medium ${(asset.change_7d || 0) >= 0 ? 'text-[#BFF549]' : 'text-red-400'}`}>
              {(asset.change_7d || 0) >= 0 ? '+' : ''}{(asset.change_7d || 0).toFixed(2)}%
            </p>
          </div>
          <div className="bg-[#111] rounded-xl p-3">
            <p className="text-[#555] text-[10px] uppercase">Market Cap</p>
            <p className="text-sm font-medium text-white">${formatNumber(asset.market_cap || 0)}</p>
          </div>
          <div className="bg-[#111] rounded-xl p-3">
            <p className="text-[#555] text-[10px] uppercase">Volume 24h</p>
            <p className="text-sm font-medium text-white">${formatNumber(asset.volume_24h || 0)}</p>
          </div>
        </div>

        <div className="p-4 pt-0">
          <p className="text-[10px] text-[#444] text-center">Data from StellarExpert API</p>
        </div>
      </div>
    </div>
  );
}

// Sparkline
function Sparkline({ data, positive, onClick }: { data: number[]; positive: boolean; onClick?: () => void }) {
  if (!data || data.length === 0) return null;

  const width = 80;
  const height = 28;
  const padding = 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const color = positive ? '#BFF549' : '#ef4444';

  return (
    <svg
      width={width}
      height={height}
      className={onClick ? 'cursor-pointer active:opacity-60 transition-opacity' : ''}
      onClick={onClick}
    >
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

function formatPrice(price: number): string {
  if (price >= 1000) return '$' + price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (price >= 1) return '$' + price.toFixed(2);
  if (price >= 0.01) return '$' + price.toFixed(4);
  if (price >= 0.0001) return '$' + price.toFixed(6);
  return '$' + price.toFixed(8);
}

function ChangeBadge({ value, compact }: { value: number; compact?: boolean }) {
  const isPositive = value >= 0;
  const isNeutral = Math.abs(value) < 0.01;

  if (isNeutral) {
    return <span className={`text-[#666] ${compact ? 'text-[10px]' : 'text-xs'}`}>0.00%</span>;
  }

  return (
    <span className={`font-medium ${compact ? 'text-[10px]' : 'text-xs'} ${isPositive ? 'text-[#BFF549]' : 'text-red-400'}`}>
      {isPositive ? '+' : ''}{Math.abs(value).toFixed(2)}%
    </span>
  );
}

export default function MarketsTable({ initialAssets }: MarketsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset | null>(null);

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
        case 'market_cap': comparison = b.market_cap - a.market_cap; break;
        case 'price_usd': comparison = b.price_usd - a.price_usd; break;
        case 'change_24h': comparison = b.change_24h - a.change_24h; break;
        case 'change_7d': comparison = b.change_7d - a.change_7d; break;
        case 'volume_24h': comparison = b.volume_24h - a.volume_24h; break;
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-[#BFF549]/20 to-[#BFF549]/5 rounded-xl flex items-center justify-center">
            <svg className="w-4 h-4 text-[#BFF549]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Markets</h1>
            <p className="text-[#555] text-[10px]">{filteredAndSortedAssets.length} assets</p>
          </div>
        </div>
        <span className="w-2 h-2 bg-[#BFF549] rounded-full animate-pulse" />
      </div>

      {/* Search & Sort */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl py-2.5 pl-9 pr-3 text-white placeholder-[#444] text-sm focus:outline-none focus:border-[#333]"
          />
        </div>
        <select
          value={sortField}
          onChange={(e) => handleSort(e.target.value as SortField)}
          className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl px-3 text-white text-sm focus:outline-none appearance-none cursor-pointer"
        >
          <option value="rank">Rank</option>
          <option value="price_usd">Price</option>
          <option value="change_24h">24h%</option>
          <option value="market_cap">MCap</option>
        </select>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-[#1a1a1a] text-[10px] uppercase tracking-wider text-[#555] font-medium">
          <div className="col-span-3">Asset</div>
          <div className="col-span-2 text-right cursor-pointer hover:text-white" onClick={() => handleSort('price_usd')}>Price</div>
          <div className="col-span-1 text-right cursor-pointer hover:text-white" onClick={() => handleSort('change_24h')}>24h</div>
          <div className="col-span-1 text-right cursor-pointer hover:text-white" onClick={() => handleSort('change_7d')}>7d</div>
          <div className="col-span-2 text-right cursor-pointer hover:text-white" onClick={() => handleSort('market_cap')}>Market Cap</div>
          <div className="col-span-3 text-right">Chart</div>
        </div>

        <div className="divide-y divide-[#111]">
          {filteredAndSortedAssets.map((asset) => (
            <div
              key={`${asset.code}-${asset.issuer || asset.rank}`}
              className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-[#111] transition-colors cursor-pointer group items-center"
              onClick={() => setSelectedAsset(asset)}
            >
              <div className="col-span-3 flex items-center gap-2">
                <span className="text-[#444] text-xs w-5">{asset.rank}</span>
                <span className="text-white font-medium group-hover:text-[#BFF549] transition-colors">{asset.code}</span>
                <span className="text-[#555] text-xs truncate hidden lg:inline">{asset.name !== asset.code ? asset.name : ''}</span>
              </div>
              <div className="col-span-2 text-right text-white text-sm">{formatPrice(asset.price_usd || 0)}</div>
              <div className="col-span-1 text-right"><ChangeBadge value={asset.change_24h || 0} /></div>
              <div className="col-span-1 text-right"><ChangeBadge value={asset.change_7d || 0} /></div>
              <div className="col-span-2 text-right">
                <span className="text-white text-sm">${formatNumber(asset.market_cap || 0)}</span>
              </div>
              <div className="col-span-3 flex justify-end">
                <Sparkline data={asset.sparkline || []} positive={(asset.change_7d || 0) >= 0} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2">
        {filteredAndSortedAssets.map((asset) => (
          <div
            key={`mobile-${asset.code}-${asset.issuer || asset.rank}`}
            className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-3 active:bg-[#111] transition-colors cursor-pointer"
            onClick={() => setSelectedAsset(asset)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[#444] text-[10px] w-4">{asset.rank}</span>
                <span className="text-white font-semibold">{asset.code}</span>
                <span className="text-[#555] text-xs truncate max-w-[80px]">{asset.name !== asset.code ? asset.name : ''}</span>
              </div>
              <Sparkline data={asset.sparkline || []} positive={(asset.change_7d || 0) >= 0} onClick={() => setSelectedAsset(asset)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-white font-medium">{formatPrice(asset.price_usd || 0)}</span>
                <span className="text-[#444] text-xs ml-2">MCap ${formatNumber(asset.market_cap || 0)}</span>
              </div>
              <div className="flex gap-3">
                <div className="text-right">
                  <p className="text-[#555] text-[9px]">24h</p>
                  <ChangeBadge value={asset.change_24h || 0} compact />
                </div>
                <div className="text-right">
                  <p className="text-[#555] text-[9px]">7d</p>
                  <ChangeBadge value={asset.change_7d || 0} compact />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAndSortedAssets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[#555] text-sm">No assets found</p>
        </div>
      )}

      {/* Footer */}
      <p className="text-[10px] text-[#444] text-center">Tap any asset to view chart</p>

      {/* Modal */}
      {selectedAsset && <ChartModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />}
    </div>
  );
}
