'use client';

import { useState, useEffect, useCallback } from 'react';
import { AssetDetails } from '@/lib/stellar';

interface AssetChartProps {
  asset: AssetDetails;
}

type TimeRange = '24h' | '7d' | '30d' | '1y' | 'all';

interface PricePoint {
  timestamp: number;
  price: number;
}

function formatPrice(price: number): string {
  if (price >= 1000) return '$' + price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (price >= 1) return '$' + price.toFixed(2);
  if (price >= 0.01) return '$' + price.toFixed(4);
  if (price >= 0.0001) return '$' + price.toFixed(6);
  return '$' + price.toFixed(8);
}

export default function AssetChart({ asset }: AssetChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [priceData, setPriceData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<PricePoint | null>(null);

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
          '1y': 365 * 24 * 60 * 60 * 1000,
          'all': Infinity,
        };

        const filteredPoints = points.filter(p => p.timestamp > now - ranges[timeRange]);
        setPriceData(filteredPoints.length > 0 ? filteredPoints : points);
      } else {
        setPriceData(asset.price_history.map(p => ({ timestamp: p[0], price: p[1] })));
      }
    } catch {
      setPriceData(asset.price_history.map(p => ({ timestamp: p[0], price: p[1] })));
    }
    setLoading(false);
  }, [asset, timeRange]);

  useEffect(() => {
    fetchPriceData();
  }, [fetchPriceData]);

  const isPositive = priceData.length >= 2
    ? priceData[priceData.length - 1].price >= priceData[0].price
    : asset.change_7d >= 0;

  const width = 800;
  const height = 300;
  const paddingX = 60;
  const paddingY = 40;

  const prices = priceData.map(d => d.price);
  const min = prices.length > 0 ? Math.min(...prices) : 0;
  const max = prices.length > 0 ? Math.max(...prices) : 1;
  const range = max - min || 1;

  const getX = (index: number) => paddingX + (index / Math.max(priceData.length - 1, 1)) * (width - paddingX * 2);
  const getY = (price: number) => height - paddingY - ((price - min) / range) * (height - paddingY * 2);

  const points = priceData.map((point, index) => `${getX(index)},${getY(point.price)}`).join(' ');

  const firstPoint = `${paddingX},${height - paddingY}`;
  const lastPoint = `${width - paddingX},${height - paddingY}`;
  const areaPath = priceData.length > 0 ? `M ${firstPoint} L ${points} L ${lastPoint} Z` : '';

  const color = isPositive ? 'var(--success)' : 'var(--error)';

  // Y-axis labels
  const yLabels = [min, min + range * 0.25, min + range * 0.5, min + range * 0.75, max];

  // X-axis labels
  const getTimeLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    if (timeRange === '24h') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const xLabelIndices = priceData.length > 0
    ? [0, Math.floor(priceData.length * 0.25), Math.floor(priceData.length * 0.5), Math.floor(priceData.length * 0.75), priceData.length - 1]
    : [];

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (priceData.length === 0) return;

    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const chartWidth = width - paddingX * 2;
    const relativeX = (x - paddingX) / chartWidth;
    const index = Math.round(relativeX * (priceData.length - 1));

    if (index >= 0 && index < priceData.length) {
      setHoveredPoint(priceData[index]);
    }
  };

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-1">
          <button className="px-3 py-1.5 rounded text-[13px] font-medium bg-[var(--primary-muted)] text-[var(--primary)]">
            Price
          </button>
          <button className="px-3 py-1.5 rounded text-[13px] font-medium text-[var(--text-tertiary)] hover:text-[var(--primary)] hover:bg-[var(--bg-tertiary)] transition-colors">
            Market cap
          </button>
        </div>

        <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] p-1 rounded">
          {(['24h', '7d', '30d', '1y', 'all'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                timeRange === range
                  ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--primary)]'
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Hover Info */}
      {hoveredPoint && (
        <div className="px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]">
          <div className="flex items-center gap-4">
            <span className="text-[var(--text-primary)] font-mono font-medium text-lg">
              {formatPrice(hoveredPoint.price)}
            </span>
            <span className="text-[var(--text-tertiary)] text-[13px]">
              {new Date(hoveredPoint.timestamp).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="p-4">
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : priceData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-[var(--text-tertiary)]">No price data available</p>
          </div>
        ) : (
          <svg
            width="100%"
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid meet"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredPoint(null)}
            className="cursor-crosshair"
          >
            <defs>
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {yLabels.map((_, i) => {
              const y = height - paddingY - (i / 4) * (height - paddingY * 2);
              return (
                <line
                  key={i}
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              );
            })}

            {/* Y-axis labels */}
            {yLabels.map((val, i) => {
              const y = height - paddingY - (i / 4) * (height - paddingY * 2);
              return (
                <text
                  key={i}
                  x={paddingX - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="var(--text-tertiary)"
                  fontSize="11"
                  fontFamily="var(--font-mono)"
                >
                  {formatPrice(val)}
                </text>
              );
            })}

            {/* X-axis labels */}
            {xLabelIndices.map((idx) => {
              if (!priceData[idx]) return null;
              const x = getX(idx);
              return (
                <text
                  key={idx}
                  x={x}
                  y={height - 10}
                  textAnchor="middle"
                  fill="var(--text-tertiary)"
                  fontSize="11"
                >
                  {getTimeLabel(priceData[idx].timestamp)}
                </text>
              );
            })}

            {/* Area fill */}
            <path d={areaPath} fill="url(#chartGradient)" />

            {/* Line */}
            <polyline
              points={points}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Current price dot */}
            {priceData.length > 0 && (
              <circle
                cx={getX(priceData.length - 1)}
                cy={getY(priceData[priceData.length - 1].price)}
                r="5"
                fill={color}
              />
            )}

            {/* Hover indicator */}
            {hoveredPoint && (
              <>
                <line
                  x1={getX(priceData.findIndex(p => p.timestamp === hoveredPoint.timestamp))}
                  y1={paddingY}
                  x2={getX(priceData.findIndex(p => p.timestamp === hoveredPoint.timestamp))}
                  y2={height - paddingY}
                  stroke="var(--text-muted)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <circle
                  cx={getX(priceData.findIndex(p => p.timestamp === hoveredPoint.timestamp))}
                  cy={getY(hoveredPoint.price)}
                  r="6"
                  fill="var(--bg-secondary)"
                  stroke={color}
                  strokeWidth="2"
                />
              </>
            )}
          </svg>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
        <span>Data from StellarExpert API</span>
        <span>{priceData.length} data points</span>
      </div>
    </div>
  );
}
