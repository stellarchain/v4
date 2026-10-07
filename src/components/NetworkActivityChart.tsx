'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type WheelEvent,
} from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { NetworkStatisticsChart, NetworkStatisticsCoverage, NetworkStatisticsRange } from '@/lib/stellar';
import Card from '@/components/ui/Card';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { chartAxisValue, chartTimeTick } from '@/lib/shared/chartDisplay';

interface NetworkActivityChartProps {
  chart: NetworkStatisticsChart;
  coverage: NetworkStatisticsCoverage;
  range: NetworkStatisticsRange;
  bucketMinutes: number;
  onRangeChange: (range: NetworkStatisticsRange) => void;
  isRefreshing?: boolean;
  refreshError?: string | null;
  onRefreshRetry?: () => void;
  onLoadOlder?: () => void;
  isLoadingOlder?: boolean;
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

const RANGE_OPTIONS: Array<{ label: string; value: NetworkStatisticsRange }> = [
  { label: '24H', value: '24h' },
  { label: '7D', value: '7d' },
  { label: '1M', value: '30d' },
  { label: '1Y', value: '1y' },
];

const CHART_HEIGHT = 284;

function formatTimeFull(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatBucketSize(minutes: number): string {
  if (minutes >= 1440 && minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  }
  if (minutes >= 60 && minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}

function getInitialRange(pointCount: number, bucketMinutes: number, range: NetworkStatisticsRange): ChartRange {
  const endIndex = Math.max(pointCount - 1, 0);
  if (pointCount <= 40) {
    return { startIndex: 0, endIndex };
  }
  // Default visible window: ~1 day for 5min, ~7 days for 1h, full 1M/1Y for daily buckets.
  // The remainder of the loaded history is reachable by panning / dragging the brush.
  const targetMinutes =
    bucketMinutes <= 5 ? 1440 :
    bucketMinutes <= 60 ? 1440 * 7 :
    range === '1y' ? 1440 * 366 :
    1440 * 30;
  const windowSize = Math.max(40, Math.min(pointCount, Math.round(targetMinutes / bucketMinutes)));
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

function getOlderPrefetchThreshold(range: ChartRange): number {
  const visibleBuckets = Math.max(range.endIndex - range.startIndex + 1, 1);

  return Math.max(8, Math.ceil(visibleBuckets * 0.25));
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
    <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]" role="listitem">
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

interface DragState {
  pointerId: number;
  startX: number;
  startRange: ChartRange;
}

export default function NetworkActivityChart({
  chart,
  coverage,
  range,
  bucketMinutes,
  onRangeChange,
  isRefreshing = false,
  refreshError = null,
  onRefreshRetry,
  onLoadOlder,
  isLoadingOlder = false,
}: NetworkActivityChartProps) {
  const hasData = chart.points.length > 0;
  const initialRange = useMemo(
    () => getInitialRange(chart.points.length, bucketMinutes, range),
    [chart.points.length, bucketMinutes, range]
  );
  const [visibleRange, setVisibleRange] = useState<ChartRange>(initialRange);
  const [isDragging, setIsDragging] = useState(false);
  const [chartWidth, setChartWidth] = useState(0);
  const chartShellRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const pendingRangeRef = useRef<ChartRange | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastBucketMinutesRef = useRef<number>(bucketMinutes);
  const lastRangeRef = useRef<NetworkStatisticsRange>(range);
  const lastFirstBucketRef = useRef<string | null>(chart.points[0]?.bucketStart ?? null);
  const gradientId = useId().replace(/:/g, '');
  const visibleBucketCount = hasData ? visibleRange.endIndex - visibleRange.startIndex + 1 : 0;
  const visiblePoints = useMemo(
    () => chart.points.slice(visibleRange.startIndex, visibleRange.endIndex + 1),
    [chart.points, visibleRange.startIndex, visibleRange.endIndex]
  );
  const chartKey = `${range}-${bucketMinutes}-${coverage.lastBucket ?? 'empty'}`;
  const isZoomed =
    hasData &&
    (visibleRange.startIndex !== initialRange.startIndex || visibleRange.endIndex !== initialRange.endIndex);
  const ariaLabel = hasData
    ? `Network activity chart from ${coverage.firstBucket ?? 'start'} to ${coverage.lastBucket ?? 'end'} showing transactions, operations, and TPS.`
    : 'Network activity chart with no data available yet.';

  // Reset on granularity change; otherwise preserve the user's position when
  // older pages are prepended by shifting indices forward by the added count.
  useEffect(() => {
    if (lastBucketMinutesRef.current !== bucketMinutes || lastRangeRef.current !== range) {
      lastBucketMinutesRef.current = bucketMinutes;
      lastRangeRef.current = range;
      lastFirstBucketRef.current = chart.points[0]?.bucketStart ?? null;
      setVisibleRange(initialRange);
      return;
    }
    const currentFirst = chart.points[0]?.bucketStart ?? null;
    const previousFirst = lastFirstBucketRef.current;
    if (previousFirst && currentFirst && previousFirst !== currentFirst) {
      const offset = chart.points.findIndex((p) => p.bucketStart === previousFirst);
      if (offset > 0) {
        setVisibleRange((current) => ({
          startIndex: Math.min(chart.points.length - 1, current.startIndex + offset),
          endIndex: Math.min(chart.points.length - 1, current.endIndex + offset),
        }));
      }
    }
    lastFirstBucketRef.current = currentFirst;
  }, [bucketMinutes, range, chart.points, initialRange]);

  // Cancel any queued drag-frame update when the chart unmounts.
  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const element = chartShellRef.current;
    if (!element) return;

    const updateWidth = () => {
      const nextWidth = Math.floor(element.clientWidth);
      setChartWidth((current) => current === nextWidth ? current : nextWidth);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const requestOlderIfNeeded = (range: ChartRange) => {
    if (!hasData || !onLoadOlder || isLoadingOlder || !coverage.hasMore) return;
    if (range.startIndex <= getOlderPrefetchThreshold(range)) {
      onLoadOlder();
    }
  };

  const scheduleVisibleRange = (range: ChartRange) => {
    pendingRangeRef.current = range;
    if (frameRef.current !== null) return;

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const next = pendingRangeRef.current;
      pendingRangeRef.current = null;
      if (next) {
        setVisibleRange(next);
      }
    });
  };

  const showOldest = () => {
    const windowSize = visibleRange.endIndex - visibleRange.startIndex;
    const next = { startIndex: 0, endIndex: Math.min(windowSize, chart.points.length - 1) };
    setVisibleRange(next);
    requestOlderIfNeeded(next);
  };

  const resetZoom = () => {
    setVisibleRange(initialRange);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!hasData || event.button !== 0) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startRange: visibleRange,
    };

    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const width = Math.max(chartShellRef.current?.getBoundingClientRect().width ?? 1, 1);
    const visiblePoints = Math.max(drag.startRange.endIndex - drag.startRange.startIndex + 1, 1);
    const pointsPerPixel = visiblePoints / width;
    const shift = Math.round((drag.startX - event.clientX) * pointsPerPixel);

    if (shift === 0) return;

    const next = shiftRange(drag.startRange, shift, chart.points.length);
    scheduleVisibleRange(next);
    if (shift < 0) {
      requestOlderIfNeeded(next);
    }
  };

  const stopDragging = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    dragRef.current = null;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!hasData) return;

    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.shiftKey ? event.deltaY : 0;
    if (delta === 0) return;

    event.preventDefault();

    const visiblePoints = Math.max(visibleRange.endIndex - visibleRange.startIndex + 1, 1);
    const shift = Math.sign(delta) * Math.max(1, Math.round((Math.abs(delta) / 80) * (visiblePoints / 24)));
    const next = shiftRange(visibleRange, shift, chart.points.length);
    setVisibleRange(next);
    if (shift < 0) {
      requestOlderIfNeeded(next);
    }
  };

  return (
    <Card className="min-w-0 overflow-hidden p-0 shadow-sm">
      <div className="flex flex-col gap-4 p-5 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--info-muted)] text-[var(--primary-blue)]">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 19V9m5 10V5m5 14v-7m5 7V3M2 21h20" />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
              {chart.title}
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">
              Transactions and operations per bucket, with TPS as throughput.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
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
                  disabled={visibleRange.startIndex === 0 && !coverage.hasMore}
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Oldest
                </button>
                <button
                  type="button"
                  onClick={resetZoom}
                  disabled={!isZoomed}
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Latest
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end border-y border-[var(--border-subtle)] bg-[var(--bg-primary)]/35 px-5 py-3.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Historical range</span>
          <SegmentedControl ariaLabel="Historical range" options={RANGE_OPTIONS} value={range} onChange={onRangeChange} />
        </div>
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {isRefreshing
          ? 'Updating network activity chart.'
          : isLoadingOlder
            ? 'Loading earlier network activity history.'
            : ''}
      </span>
      {!isRefreshing && refreshError && (
        <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-lg border border-[var(--warning)]/25 bg-[var(--warning-muted)] px-3 py-2 text-xs text-[var(--text-primary)] shadow-sm sm:mx-5" role="alert">
          <span>{refreshError}</span>
          {onRefreshRetry && (
            <button
              type="button"
              onClick={onRefreshRetry}
              className="shrink-0 rounded-md px-2 py-1 font-semibold text-[var(--primary-blue)] hover:bg-[var(--bg-secondary)] focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)]"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <div
        ref={chartShellRef}
        className={`interactive-chart relative mx-4 h-[300px] min-w-0 w-[calc(100%-2rem)] select-none overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]/35 px-1 pt-2 sm:mx-5 sm:w-[calc(100%-2.5rem)] ${hasData ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
        role="img"
        aria-label={ariaLabel}
        aria-busy={isRefreshing || isLoadingOlder}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onWheel={handleWheel}
        style={{ touchAction: 'pan-y' }}
      >
        {isRefreshing && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--bg-primary)]/80 backdrop-blur-[1px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] shadow-sm">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--primary-blue)] border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
              Updating chart
            </div>
          </div>
        )}
        {!isRefreshing && isLoadingOlder && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[var(--bg-primary)]/55 backdrop-blur-[1px]">
            <div className="inline-flex max-w-[calc(100%-2rem)] items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 shadow-lg">
              <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[var(--primary-blue)] border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)]">Loading earlier history</p>
                <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">Keeping your current chart position.</p>
              </div>
            </div>
          </div>
        )}
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
          chartWidth > 0 && (
            <ComposedChart
              key={chartKey}
              width={chartWidth}
              height={CHART_HEIGHT}
              data={visiblePoints}
              margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
            >
              <defs>
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
                tickFormatter={(value) => chartTimeTick(String(value), bucketMinutes)}
                minTickGap={48}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => chartAxisValue(Number(value))}
                width={62}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => chartAxisValue(Number(value))}
                width={54}
              />
              <Tooltip
                cursor={isDragging ? false : { fill: 'var(--bg-tertiary)', opacity: 0.4 }}
                content={<CustomTooltip />}
                wrapperStyle={{ outline: 'none' }}
              />
              <Bar
                yAxisId="left"
                dataKey="transactions"
                name={SERIES.transactions.label}
                fill={SERIES.transactions.color}
                fillOpacity={0.72}
                radius={[3, 3, 0, 0]}
                maxBarSize={18}
                isAnimationActive={false}
              />
              <Bar
                yAxisId="left"
                dataKey="operations"
                name={SERIES.operations.label}
                fill={SERIES.operations.color}
                fillOpacity={0.62}
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
                strokeWidth={1.75}
                strokeLinecap="round"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--bg-secondary)', fill: SERIES.tps.color }}
                isAnimationActive={false}
              />
            </ComposedChart>
          )
        )}
      </div>

      {hasData && (
        <div className="mt-4 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]/35 px-5 py-3">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2" role="list" aria-label="Series legend">
            <LegendDot color={SERIES.transactions.color} label={SERIES.transactions.label} kind="bar" />
            <LegendDot color={SERIES.operations.color} label={SERIES.operations.label} kind="bar" />
            <LegendDot color={SERIES.tps.color} label={SERIES.tps.label} kind="line" />
          </div>
          <div className="mt-3 grid gap-2 border-t border-[var(--border-subtle)] pt-3 text-[11px] text-[var(--text-secondary)] sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <span className="inline-flex items-center gap-2">
              <svg className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 11h10M7 7h6m-6 8h8m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Times in UTC · Drag to pan · Shift + wheel to scroll
            </span>
            <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[var(--text-tertiary)] sm:justify-center">
              <div className="inline-flex items-center gap-1.5">
                <dt>Bucket</dt>
                <dd className="font-semibold text-[var(--text-secondary)]">{formatBucketSize(bucketMinutes)}</dd>
              </div>
              <div className="inline-flex items-center gap-1.5">
                <dt>Indexed</dt>
                <dd className="font-mono font-semibold tabular-nums text-[var(--text-secondary)]">{coverage.bucketCount.toLocaleString()}</dd>
              </div>
              {visibleBucketCount !== coverage.bucketCount && (
                <div className="inline-flex items-center gap-1.5">
                  <dt>Visible</dt>
                  <dd className="font-mono font-semibold tabular-nums text-[var(--text-secondary)]">{visibleBucketCount.toLocaleString()}</dd>
                </div>
              )}
            </dl>
            <span className="hidden text-right tabular-nums sm:inline">
              {coverage.firstBucket && coverage.lastBucket
                ? `${formatTimeFull(coverage.firstBucket)} – ${formatTimeFull(coverage.lastBucket)} UTC`
                : null}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
