'use client';

import { useId } from 'react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { NetworkStatisticsCard } from '@/lib/stellar';

interface StatCardProps {
  stat: NetworkStatisticsCard;
  href?: string;
}

interface StatChartPoint {
  sample: number;
  value: number;
}

interface StatChartTooltipPayload {
  value: number;
  payload: StatChartPoint;
}

type TrendTone = 'increase' | 'decrease' | 'neutral';

function formatExactValue(value: number, suffix?: string | null): string {
  const formatted = value.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });

  return `${formatted}${suffix ? ` ${suffix}` : ''}`;
}

function StatChartTooltip({
  active,
  payload,
  totalSamples,
  suffix,
}: {
  active?: boolean;
  payload?: StatChartTooltipPayload[];
  totalSamples: number;
  suffix?: string | null;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="min-w-36 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 shadow-lg">
      <p className="text-[10px] font-medium text-[var(--text-tertiary)]">
        Indexed sample {point.sample} of {totalSamples}
      </p>
      <p className="mt-1 font-mono text-xs font-semibold tabular-nums text-[var(--text-primary)]">
        {formatExactValue(point.value, suffix)}
      </p>
    </div>
  );
}

function StatChart({ data, suffix, label, tone }: { data: number[]; suffix?: string | null; label: string; tone: TrendTone }) {
  const reactId = useId().replace(/:/g, '');

  if (!data || data.length === 0) {
    return (
      <div className="relative flex h-32 w-full items-center justify-center" aria-hidden="true">
        <span className="absolute inset-x-2 top-1/4 border-t border-dashed border-[var(--border-subtle)]" />
        <span className="absolute inset-x-2 top-1/2 border-t border-dashed border-[var(--border-subtle)]" />
        <span className="absolute inset-x-2 top-3/4 border-t border-dashed border-[var(--border-subtle)]" />
        <span className="relative text-[11px] font-medium text-[var(--text-tertiary)]">No trend available</span>
      </div>
    );
  }

  const points: StatChartPoint[] = data.map((value, index) => ({
    sample: index + 1,
    value,
  }));
  const areaGradientId = `spark-area-${reactId}`;
  const trendColor = tone === 'increase'
    ? 'var(--success)'
    : tone === 'decrease'
      ? 'var(--error)'
      : 'var(--text-tertiary)';

  return (
    <div className="h-32 w-full" role="img" aria-label={`${label} trend across ${points.length} indexed samples`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 10, right: 3, bottom: 4, left: 3 }} accessibilityLayer>
          <defs>
            <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={trendColor} stopOpacity={0.12} />
              <stop offset="100%" stopColor={trendColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="2 6" vertical={false} />
          <Tooltip
            cursor={{ stroke: 'var(--text-tertiary)', strokeOpacity: 0.35, strokeWidth: 1 }}
            content={<StatChartTooltip totalSamples={points.length} suffix={suffix} />}
            wrapperStyle={{ outline: 'none', zIndex: 20 }}
          />
          <Area
            type="linear"
            dataKey="value"
            stroke={trendColor}
            strokeWidth={1.6}
            fill={`url(#${areaGradientId})`}
            dot={false}
            activeDot={{ r: 3, fill: trendColor, stroke: 'var(--bg-secondary)', strokeWidth: 1.5 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
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
  if (stat.value === null) return '—';

  const num = stat.value;
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

export default function StatCard({ stat, href }: StatCardProps) {
  const change = stat.changePercent;
  const trendTone: TrendTone = change === undefined || change === null || change === 0
    ? 'neutral'
    : change > 0
      ? 'increase'
      : 'decrease';
  const aggregationLabel = stat.aggregation === 'sum'
    ? 'range total'
    : stat.aggregation === 'avg'
      ? 'range average'
      : stat.aggregation === 'max'
        ? 'range peak'
        : 'latest bucket';

  const content = (
    <>
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/45 px-3 pt-2">
        <StatChart data={stat.sparkline} suffix={stat.suffix} label={stat.label} tone={trendTone} />
      </div>
      <div className="flex flex-1 flex-col p-4 pt-3.5">
        <p className="min-h-7 text-[9px] font-bold uppercase leading-relaxed tracking-widest text-[var(--text-tertiary)]">{stat.label}</p>
        <p className="font-mono text-xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-2xl">
          {formatValue(stat)}
        </p>
        <div className="mt-1.5 flex min-h-9 flex-wrap items-start justify-between gap-2">
          {stat.unavailableReason ? (
            <p className="max-w-[75%] text-[10px] leading-relaxed text-[var(--text-secondary)]">{stat.unavailableReason}</p>
          ) : (
            <p className="text-[10px] text-[var(--text-secondary)]">{aggregationLabel}</p>
          )}
          {change !== undefined && change !== null && (
            <span
              className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                trendTone === 'increase'
                  ? 'bg-[var(--success-muted)] text-[#047857] dark:text-[var(--success)]'
                  : trendTone === 'decrease'
                    ? 'bg-[var(--error-muted)] text-[#b91c1c] dark:text-[var(--error)]'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
              }`}
            >
              {trendTone === 'neutral' ? (
                <span aria-hidden="true">—</span>
              ) : (
                <svg className={`h-2.5 w-2.5 ${trendTone === 'decrease' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {trendTone === 'increase' ? '+' : ''}{change.toFixed(2)}%
            </span>
          )}
        </div>
        {href && (
          <span className="mt-auto inline-flex items-center gap-1 pt-2 text-[11px] font-semibold text-[var(--primary-blue)]">
            View chart
            <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 18 6-6-6-6" />
            </svg>
          </span>
        )}
      </div>
    </>
  );

  const cardClass = 'group flex h-full min-h-[286px] flex-col overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-sm';
  if (!href) return <div className={cardClass}>{content}</div>;

  return (
    <Link
      href={href}
      className={`${cardClass} cursor-pointer transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--primary-blue)]/35 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-blue)] active:translate-y-0`}
    >
      {content}
    </Link>
  );
}
