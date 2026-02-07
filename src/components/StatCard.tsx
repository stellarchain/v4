'use client';

import { StatItem } from '@/lib/stellar';

interface StatCardProps {
  stat: StatItem;
  onClick?: () => void;
}


function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const width = 80;
  const height = 32;
  const padding = 2;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const strokeColor = positive ? 'var(--primary)' : '#ef4444';

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`sparkGradient-${positive ? 'pos' : 'neg'}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatValue(value: string | number, prefix?: string, suffix?: string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  let formatted: string;

  if (prefix === '$') {
    if (num >= 1e12) {
      formatted = (num / 1e12).toFixed(2) + 'T';
    } else if (num >= 1e9) {
      formatted = (num / 1e9).toFixed(2) + 'B';
    } else if (num >= 1e6) {
      formatted = (num / 1e6).toFixed(2) + 'M';
    } else if (num >= 1e3) {
      formatted = (num / 1e3).toFixed(2) + 'K';
    } else if (num < 1) {
      formatted = num.toFixed(4);
    } else {
      formatted = num.toFixed(2);
    }
  } else if (suffix === 'XLM') {
    if (num >= 1e12) {
      formatted = (num / 1e12).toFixed(2) + 'T';
    } else if (num >= 1e9) {
      formatted = (num / 1e9).toFixed(2) + 'B';
    } else if (num >= 1e6) {
      formatted = (num / 1e6).toFixed(2) + 'M';
    } else {
      formatted = num.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
  } else if (num >= 1e9) {
    formatted = (num / 1e9).toFixed(2) + 'B';
  } else if (num >= 1e6) {
    formatted = (num / 1e6).toFixed(2) + 'M';
  } else if (num >= 1e3) {
    formatted = (num / 1e3).toFixed(1) + 'K';
  } else if (Number.isInteger(num)) {
    formatted = num.toLocaleString();
  } else {
    formatted = num.toFixed(2);
  }

  return `${prefix || ''}${formatted}${suffix ? ' ' + suffix : ''}`;
}

export default function StatCard({ stat, onClick }: StatCardProps) {
  const isPositive = (stat.change ?? 0) >= 0;

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
            {formatValue(stat.value, stat.prefix, stat.suffix)}
          </p>
          {stat.change !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              <span className={`text-xs font-medium ${isPositive ? 'text-[var(--primary)]' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}{stat.change.toFixed(2)}%
              </span>
              <svg
                className={`w-3 h-3 ${isPositive ? 'text-[var(--primary)]' : 'text-red-400 rotate-180'}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
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
