'use client';

import {
  useEffect,
  useId,
  useMemo,
  useState,
  type WheelEvent,
} from 'react';
import {
  Area,
  AreaChart,
  Bar,
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { NetworkStatisticsChart, NetworkStatisticsCoverage } from '@/lib/stellar';
import Card from '@/components/ui/Card';

interface NetworkActivityChartProps {
  chart: NetworkStatisticsChart;
  coverage: NetworkStatisticsCoverage;
  bucketMinutes: number;
}

interface ChartRange {
  startIndex: number;
  endIndex: number;
}

const SERIES = {
  transactions: { label: 'Transactions', color: 'var(--info)' },
  operations: { label: 'Operations', color: 'var(--purple)' },
  tps: { label: 'TPS', color: 'var(--success)' },
} as const;

function compactNumber(value: number): string {
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatTime(value: string): string {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTimeFull(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatBucketSize(minutes: number): string {
  if (minutes >= 1440 && minutes % 1440 === 0) return `${minutes / 1440}d`;
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60}h`;
  return `${minutes}m`;
}

function getInitialRange(pointCount: number): ChartRange {
  const endIndex = Math.max(pointCount - 1, 0);
  const windowSize = pointCount <= 320 ? pointCount : pointCount <= 2200 ? 288 : 576;
  return {
    startIndex: Math.max(0, endIndex - windowSize + 1),
    endIndex,
  };
}

function shiftRange(range: ChartRange, shift: number, pointCount: number): ChartRange {
  const span = Math.max(range.endIndex - range.startIndex, 0);
  const maxStart = Math.max(pointCount - span - 1, 0);
  const startIndex = Math.max(0, Math.min(maxStart, range.startIndex + shift));

  return {
    startIndex,
    endIndex: Math.min(pointCount - 1, startIndex + span),
  };
}

interface TooltipPayloadItem {
  dataKey: string;
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;

  const colorByKey: Record<string, string> = {
    transactions: SERIES.transactions.color,
    operations: SERIES.operations.color,
    tps: SERIES.tps.color,
  };
  const ordered = ['transactions', 'operations', 'tps']
    .map((key) => payload.find((p) => p.dataKey === key))
    .filter((item): item is TooltipPayloadItem => Boolean(item));

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2.5 text-xs shadow-lg min-w-[180px]">
      <div className="text-[var(--text-tertiary)] mb-2 font-medium tracking-tight">
        {formatTimeFull(String(label))}
      </div>
      <div className="space-y-1.5">
        {ordered.map((item) => {
          const isTps = item.dataKey === 'tps';
          const display = isTps
            ? Number(item.value).toFixed(2)
            : Number(item.value).toLocaleString();
          const dotColor = colorByKey[item.dataKey] ?? item.color;
          return (
            <div key={item.dataKey} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: dotColor }}
                  aria-hidden
                />
                <span className="text-[var(--text-secondary)]">{item.name}</span>
              </div>
              <span className="font-mono font-semibold text-[var(--text-primary)] tabular-nums">
                {display}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LegendDot({ color, label, kind }: { color: string; label: string; kind: 'bar' | 'line' }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
      {kind === 'bar' ? (
        <span
          className="w-2.5 h-2.5 rounded-[3px]"
          style={{ background: color }}
          aria-hidden
        />
      ) : (
        <span
          className="w-3.5 h-[3px] rounded-full"
          style={{ background: color }}
          aria-hidden
        />
      )}
      <span className="tracking-tight">{label}</span>
    </div>
  );
}

interface ChartMouseState {
  activeLabel?: string | number;
  activeTooltipIndex?: number | string | null;
}

export default function NetworkActivityChart({ chart, coverage, bucketMinutes }: NetworkActivityChartProps) {
  const hasData = chart.points.length > 0;
  const initialRange = useMemo(() => getInitialRange(chart.points.length), [chart.points.length]);
  const [visibleRange, setVisibleRange] = useState<ChartRange>(initialRange);
  const [zoomStartLabel, setZoomStartLabel] = useState<string | null>(null);
  const [zoomEndLabel, setZoomEndLabel] = useState<string | null>(null);
  const gradientId = useId().replace(/:/g, '');
  const visibleBucketCount = hasData ? visibleRange.endIndex - visibleRange.startIndex + 1 : 0;
  const chartKey = `${bucketMinutes}-${chart.points.length}-${coverage.lastBucket ?? 'empty'}`;
  const isZoomed =
    hasData &&
    (visibleRange.startIndex !== initialRange.startIndex || visibleRange.endIndex !== initialRange.endIndex);
  const ariaLabel = hasData
    ? `Network activity chart from ${coverage.firstBucket ?? 'start'} to ${coverage.lastBucket ?? 'end'} showing transactions, operations, and TPS.`
    : 'Network activity chart with no data available yet.';

  useEffect(() => {
    setVisibleRange(initialRange);
  }, [initialRange]);

  const showOldest = () => {
    const windowSize = visibleRange.endIndex - visibleRange.startIndex;
    setVisibleRange({ startIndex: 0, endIndex: Math.min(windowSize, chart.points.length - 1) });
  };

  const resetZoom = () => {
    setVisibleRange(initialRange);
  };

  const commitZoom = () => {
    if (!zoomStartLabel || !zoomEndLabel || zoomStartLabel === zoomEndLabel) {
      setZoomStartLabel(null);
      setZoomEndLabel(null);
      return;
    }
    const startIdx = chart.points.findIndex((p) => p.bucketStart === zoomStartLabel);
    const endIdx = chart.points.findIndex((p) => p.bucketStart === zoomEndLabel);
    if (startIdx >= 0 && endIdx >= 0 && startIdx !== endIdx) {
      setVisibleRange({
        startIndex: Math.min(startIdx, endIdx),
        endIndex: Math.max(startIdx, endIdx),
      });
    }
    setZoomStartLabel(null);
    setZoomEndLabel(null);
  };

  const cancelZoom = () => {
    setZoomStartLabel(null);
    setZoomEndLabel(null);
  };

  const handleMouseDown = (state: ChartMouseState | null) => {
    if (!hasData || !state) return;
    const label = state.activeLabel != null ? String(state.activeLabel) : null;
    if (!label) return;
    setZoomStartLabel(label);
    setZoomEndLabel(label);
  };

  const handleMouseMove = (state: ChartMouseState | null) => {
    if (!zoomStartLabel || !state) return;
    const label = state.activeLabel != null ? String(state.activeLabel) : null;
    if (!label) return;
    setZoomEndLabel(label);
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!hasData) return;

    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.shiftKey ? event.deltaY : 0;
    if (delta === 0) return;

    event.preventDefault();

    const visiblePoints = Math.max(visibleRange.endIndex - visibleRange.startIndex + 1, 1);
    const shift = Math.sign(delta) * Math.max(1, Math.round((Math.abs(delta) / 80) * (visiblePoints / 24)));
    setVisibleRange((current) => shiftRange(current, shift, chart.points.length));
  };

  const showSelection =
    zoomStartLabel !== null && zoomEndLabel !== null && zoomStartLabel !== zoomEndLabel;

  return (
    <Card className="p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-5">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[var(--text-primary)] tracking-tight">
            {chart.title}
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Transactions and operations per bucket, with TPS as throughput.
          </p>
          <div className="flex items-center gap-4 mt-3" role="list" aria-label="Series legend">
            <LegendDot color={SERIES.transactions.color} label={SERIES.transactions.label} kind="bar" />
            <LegendDot color={SERIES.operations.color} label={SERIES.operations.label} kind="bar" />
            <LegendDot color={SERIES.tps.color} label={SERIES.tps.label} kind="line" />
          </div>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2">
          {hasData && (
            <div className="inline-flex items-center gap-1.5">
              {isZoomed && (
                <button
                  type="button"
                  onClick={resetZoom}
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                  aria-label="Reset zoom"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M4 10a8 8 0 0114-5M20 14a8 8 0 01-14 5" />
                  </svg>
                  Reset zoom
                </button>
              )}
              <div className="inline-flex rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-0.5">
                <button
                  type="button"
                  onClick={showOldest}
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                >
                  Oldest
                </button>
                <button
                  type="button"
                  onClick={resetZoom}
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                >
                  Latest
                </button>
              </div>
            </div>
          )}
          <div className="text-[11px] text-[var(--text-tertiary)] tabular-nums">
            <span className="font-medium text-[var(--text-secondary)]">
              {visibleBucketCount.toLocaleString()}
            </span>
            <span className="mx-1 text-[var(--text-muted)]">/</span>
            <span>{coverage.bucketCount.toLocaleString()}</span>
            <span className="ml-1.5">{formatBucketSize(bucketMinutes)} buckets</span>
          </div>
        </div>
      </div>

      <div
        className={`h-[360px] w-full select-none ${hasData ? 'cursor-crosshair' : ''}`}
        role="img"
        aria-label={ariaLabel}
        onWheel={handleWheel}
        style={{ touchAction: 'pan-y' }}
      >
        {!hasData ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.5l4.5-4.5 4 4L21 3.5M3 20.5h18" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">No activity yet</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Statistics will appear here once buckets are collected.
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer key={chartKey} width="100%" height="100%">
            <ComposedChart
              data={chart.points}
              margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={commitZoom}
              onMouseLeave={cancelZoom}
            >
              <defs>
                <linearGradient id={`tx-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SERIES.transactions.color} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={SERIES.transactions.color} stopOpacity={0.55} />
                </linearGradient>
                <linearGradient id={`ops-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SERIES.operations.color} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={SERIES.operations.color} stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id={`tps-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SERIES.tps.color} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={SERIES.tps.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="bucketStart"
                tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border-default)' }}
                tickFormatter={formatTime}
                minTickGap={42}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={compactNumber}
                width={48}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => compactNumber(Number(value))}
                width={42}
              />
              <Tooltip
                cursor={showSelection ? false : { fill: 'var(--bg-tertiary)', opacity: 0.4 }}
                content={<CustomTooltip />}
                wrapperStyle={{ outline: 'none' }}
              />
              <Bar
                yAxisId="left"
                dataKey="transactions"
                name={SERIES.transactions.label}
                fill={`url(#tx-${gradientId})`}
                radius={[3, 3, 0, 0]}
                maxBarSize={18}
                isAnimationActive={false}
              />
              <Bar
                yAxisId="left"
                dataKey="operations"
                name={SERIES.operations.label}
                fill={`url(#ops-${gradientId})`}
                radius={[3, 3, 0, 0]}
                maxBarSize={18}
                isAnimationActive={false}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="tps"
                name={SERIES.tps.label}
                stroke="none"
                fill={`url(#tps-${gradientId})`}
                isAnimationActive={false}
                legendType="none"
                activeDot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="tps"
                name={SERIES.tps.label}
                stroke={SERIES.tps.color}
                strokeWidth={2}
                strokeLinecap="round"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--bg-secondary)', fill: SERIES.tps.color }}
                isAnimationActive={false}
              />
              {showSelection && (
                <ReferenceArea
                  yAxisId="left"
                  x1={zoomStartLabel ?? undefined}
                  x2={zoomEndLabel ?? undefined}
                  stroke="var(--primary-blue)"
                  strokeOpacity={0.4}
                  fill="var(--primary-blue)"
                  fillOpacity={0.1}
                />
              )}
              <Brush
                dataKey="bucketStart"
                height={42}
                travellerWidth={12}
                startIndex={visibleRange.startIndex}
                endIndex={visibleRange.endIndex}
                stroke="var(--primary-blue)"
                fill="var(--bg-tertiary)"
                tickFormatter={formatTime}
                onChange={(range) => {
                  if (typeof range?.startIndex !== 'number' || typeof range?.endIndex !== 'number') {
                    return;
                  }
                  setVisibleRange({ startIndex: range.startIndex, endIndex: range.endIndex });
                }}
              >
                <AreaChart>
                  <defs>
                    <linearGradient id={`brush-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES.operations.color} stopOpacity={0.55} />
                      <stop offset="100%" stopColor={SERIES.operations.color} stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <Area
                    dataKey="operations"
                    type="monotone"
                    stroke={SERIES.operations.color}
                    strokeWidth={1}
                    fill={`url(#brush-${gradientId})`}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </Brush>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {hasData && (
        <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <span>Drag on the chart to zoom · Shift + wheel to scroll · Drag the brush to pan</span>
          <span className="hidden sm:inline tabular-nums">
            {coverage.firstBucket && coverage.lastBucket
              ? `${formatTimeFull(coverage.firstBucket)} – ${formatTimeFull(coverage.lastBucket)}`
              : null}
          </span>
        </div>
      )}
    </Card>
  );
}
