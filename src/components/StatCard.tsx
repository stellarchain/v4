'use client';

import { useId } from 'react';
import { NetworkStatisticsCard } from '@/lib/stellar';

interface StatCardProps {
  stat: NetworkStatisticsCard;
  onClick?: () => void;
}


function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const reactId = useId().replace(/:/g, '');
  if (!data || data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const width = 84;
  const height = 32;
  const padding = 2;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const points = data.map((value, index) => {
    const x = padding + (data.length === 1 ? innerWidth / 2 : (index / (data.length - 1)) * innerWidth);
    const y = height - padding - ((value - min) / range) * innerHeight;
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const firstX = points[0].x;
  const lastX = points[points.length - 1].x;
  const baseY = height - padding;
  const areaPath = `${linePath} L${lastX},${baseY} L${firstX},${baseY} Z`;

  const strokeColor = positive ? 'var(--success)' : 'var(--error)';
  const gradientId = `spark-${reactId}`;

  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function compactNumber(num: number, decimals = 1): string {
  if (Math.abs(num) >= 1e12) return (num / 1e12).toFixed(decimals) + 'T';
  if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(decimals) + 'B';
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(decimals) + 'M';
  if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(decimals) + 'K';
  return Number.isInteger(num) ? num.toLocaleString() : num.toFixed(2);
}

function formatValue(stat: NetworkStatisticsCard): string {
  const num = Number(stat.value || 0);
  let formatted: string;

  if (stat.format === 'xlm') {
    if (num >= 1e12) {
      formatted = (num / 1e12).toFixed(2) + 'T';
    } else if (num >= 1e9) {
      formatted = (num / 1e9).toFixed(2) + 'B';
    } else if (num >= 1e6) {
      formatted = (num / 1e6).toFixed(2) + 'M';
    } else {
      formatted = num.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
  } else if (stat.format === 'seconds') {
    formatted = num.toFixed(2);
  } else if (stat.format === 'integer') {
    formatted = compactNumber(num, 1);
  } else if (Math.abs(num) < 100 && !Number.isInteger(num)) {
    formatted = num.toFixed(2);
  } else if (Math.abs(num) < 1000) {
    formatted = num.toLocaleString();
  } else {
    formatted = compactNumber(num, 1);
  }

  return `${formatted}${stat.suffix ? ' ' + stat.suffix : ''}`;
}

export default function StatCard({ stat, onClick }: StatCardProps) {
  const change = stat.changePercent;
  const isPositive = (change ?? 0) >= 0;
  const aggregationLabel = stat.aggregation === 'sum'
    ? 'range total'
    : stat.aggregation === 'avg'
      ? 'range average'
      : 'latest bucket';

  return (
    <div
      onClick={onClick}
      className={`bg-[var(--bg-secondary)] rounded-2xl p-4 transition-[box-shadow,transform] shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
        }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[var(--text-muted)] text-[10px] font-medium uppercase tracking-wider mb-1.5">{stat.label}</p>
          <p className="text-[var(--text-primary)] text-lg font-semibold font-mono">
            {formatValue(stat)}
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-1">{aggregationLabel}</p>
          {change !== undefined && change !== null && (
            <div className="flex items-center gap-1 mt-1.5">
              <span
                className={`inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded ${
                  isPositive
                    ? 'text-[var(--success)] bg-[var(--success-muted)]'
                    : 'text-[var(--error)] bg-[var(--error-muted)]'
                }`}
              >
                <svg
                  className={`w-2.5 h-2.5 ${isPositive ? '' : 'rotate-180'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {isPositive ? '+' : ''}{change.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 ml-3">
          <Sparkline data={stat.sparkline} positive={isPositive} />
        </div>
      </div>
    </div>
  );
}
