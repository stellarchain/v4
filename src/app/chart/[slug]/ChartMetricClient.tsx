'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SegmentedControl, { type SegmentedControlOption } from '@/components/ui/SegmentedControl';
import InfoTooltip from '@/components/InfoTooltip';
import { CHART_METRICS, chartMetric } from '@/lib/shared/chartCatalog';
import { chartAxisValue, chartTimeTick } from '@/lib/shared/chartDisplay';
import { chartPageCsv } from '@/lib/shared/chartExport';
import { chartSeries } from '@/lib/shared/chartSeries';
import { CHART_PAGE_SIZE, CHART_YEAR_DAYS, loadChartYearHistory, type ChartMetricPoint as MetricPoint, type ChartMetricCollection as MetricCollection, type OlderHistoryCursor } from '@/lib/shared/chartHistory';
import { fetchNetworkMetricCollectionData } from '@/services/api';
import { useNetwork } from '@/contexts/NetworkContext';

interface ChartDragState {
  pointerId: number;
  startX: number;
  startIndex: number;
  currentIndex: number;
  movedTowardOlder: boolean;
}

interface HistoricalChartTooltipItem {
  value?: number | string;
}

const CHART_POINT_WIDTH = 32;
const CHART_MIN_VISIBLE_POINTS = 12;
const CHART_EDGE_LOAD_THRESHOLD = 3;
const CHART_BUCKET_OPTIONS: Array<SegmentedControlOption<number>> = [
  { label: '5m', value: 5 },
  { label: '1h', value: 60 },
  { label: '1D', value: 1440 },
];
const CHART_RANGE_OPTIONS: Array<SegmentedControlOption<'30d' | '1y'>> = [
  { label: '1M', value: '30d' },
  { label: '1Y', value: '1y' },
];

function positivePage(value: string | null): number {
  const parsed = Number(value);
  return value && /^\d+$/.test(value) && Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function bucketSize(value: string | null): number {
  return value === '5' || value === '60' || value === '1440' ? Number(value) : 1440;
}

function utcLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().replace('T', ' ').replace('.000Z', ' UTC');
}

function bucketLabel(minutes: number): string {
  if (minutes === 1440) return '1 day';
  if (minutes === 60) return '1 hour';
  return '5 minutes';
}

function tooltipTimeLabel(value: string | number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const day = date.toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const time = date.toLocaleTimeString('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return `${day} · ${time} UTC`;
}

function HistoricalChartTooltip({
  active,
  payload,
  label,
  valueLabel,
}: {
  active?: boolean;
  payload?: HistoricalChartTooltipItem[];
  label?: string | number;
  valueLabel: string;
}) {
  const value = Number(payload?.[0]?.value);
  if (!active || label === undefined || !Number.isFinite(value)) return null;

  return (
    <div className="min-w-[210px] overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-[0_16px_40px_rgba(15,23,42,0.16)]">
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/55 px-3.5 py-2.5">
        <svg className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <span className="text-[11px] font-medium tabular-nums text-[var(--text-secondary)]">{tooltipTimeLabel(label)}</span>
      </div>
      <div className="flex items-end justify-between gap-5 px-3.5 py-3">
        <div className="flex min-w-0 items-center gap-2 pb-0.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--info)] ring-4 ring-[var(--info-muted)]" aria-hidden="true" />
          <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{valueLabel}</span>
        </div>
        <span className="shrink-0 font-mono text-lg font-semibold leading-none tabular-nums text-[var(--text-primary)]">{chartAxisValue(value)}</span>
      </div>
    </div>
  );
}

function mergeMetricPoints(current: MetricPoint[], incoming: MetricPoint[]): MetricPoint[] {
  const points = new Map<string, MetricPoint>();
  for (const point of [...current, ...incoming]) {
    points.set(`${point.metricKey}\u0000${point.source}\u0000${point.bucketStart}`, point);
  }
  return [...points.values()];
}

function pointsForSource(points: MetricPoint[], source: string | undefined): MetricPoint[] {
  if (!source) return [];
  return points
    .filter((point) => point.source === source)
    .sort((left, right) => left.bucketStart.localeCompare(right.bucketStart));
}

function clampViewportStart(value: number, rowCount: number, visiblePointCount: number): number {
  return Math.max(0, Math.min(value, Math.max(0, rowCount - visiblePointCount)));
}

function ChartLoadingOverlay({ label }: { label: string }) {
  return <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-secondary)]/70 backdrop-blur-[1px]" role="status" aria-live="polite">
    <svg className="h-8 w-8 animate-spin text-[var(--primary-blue)] motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
    <span className="sr-only">{label}</span>
  </div>;
}

function RelatedChartIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 18V9m5 9V5m5 13v-6m5 6V3M2 21h20" />
    </svg>
  );
}

export default function ChartMetricClient() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const metric = chartMetric(params.slug);
  const range = metric?.key !== 'active-addresses' && searchParams.get('range') === '1y' ? '1y' : '30d';
  const page = range === '1y' ? 1 : positivePage(searchParams.get('page'));
  const bucketMinutes = metric?.key === 'active-addresses' ? 5 : range === '1y' ? 1440 : bucketSize(searchParams.get('bucketMinutes'));
  const before = searchParams.get('before');
  const [dataset, setDataset] = useState<MetricCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [chartPoints, setChartPoints] = useState<MetricPoint[]>([]);
  const [olderCursor, setOlderCursor] = useState<OlderHistoryCursor | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [visiblePointCount, setVisiblePointCount] = useState(CHART_PAGE_SIZE);
  const [viewportStart, setViewportStart] = useState(Number.MAX_SAFE_INTEGER);
  const [dragging, setDragging] = useState(false);
  const chartViewportRef = useRef<HTMLDivElement>(null);
  const chartPointsRef = useRef<MetricPoint[]>([]);
  const historyAbortRef = useRef<AbortController | null>(null);
  const historyLoadingRef = useRef(false);
  const dragStateRef = useRef<ChartDragState | null>(null);
  const { network } = useNetwork();
  const requestKey = JSON.stringify([metric?.key ?? null, network, bucketMinutes, range, page, before, revision]);
  const requestKeyRef = useRef(requestKey);
  requestKeyRef.current = requestKey;
  const activeDataset = resolvedKey === requestKey ? dataset : null;
  const activeLoading = loading || resolvedKey !== requestKey;
  const activeError = resolvedKey === requestKey ? error : null;
  const sources = [...new Set(activeDataset?.member.map((point) => point.source) ?? [])];
  const selectedSource = source && sources.includes(source) ? source : sources[0];
  const rows = activeDataset?.member.filter((point) => point.source === selectedSource) ?? [];
  const loadedChartRows = useMemo(() => pointsForSource(chartPoints, selectedSource), [chartPoints, selectedSource]);
  const maximumViewportStart = Math.max(0, loadedChartRows.length - visiblePointCount);
  const effectiveViewportStart = clampViewportStart(viewportStart, loadedChartRows.length, visiblePointCount);
  const visibleChartRows = loadedChartRows.slice(effectiveViewportStart, effectiveViewportStart + visiblePointCount);

  useEffect(() => { document.title = `${metric?.label ?? 'Historical chart'} — StellarChain`; }, [metric?.label]);

  useEffect(() => {
    if (!metric) return;
    const metricKey = metric.key;
    const controller = new AbortController();
    historyAbortRef.current?.abort();
    historyAbortRef.current = null;
    historyLoadingRef.current = false;
    setDataset(null);
    setChartPoints([]);
    chartPointsRef.current = [];
    setOlderCursor(null);
    setHistoryLoading(false);
    setHistoryError(null);
    setViewportStart(Number.MAX_SAFE_INTEGER);
    setSource(null);
    setLoading(true);
    setError(null);
    setResolvedKey(requestKey);
    async function load() {
      try {
        const result = await fetchNetworkMetricCollectionData({ metricKey, bucketMinutes, page, itemsPerPage: CHART_PAGE_SIZE, network, windowDays: 30, ...(before ? { before } : {}) }, { signal: controller.signal }) as MetricCollection;
        const history = range === '1y'
          ? await loadChartYearHistory(result, before, controller.signal, async (request) => (
            await fetchNetworkMetricCollectionData({ metricKey, bucketMinutes, itemsPerPage: CHART_PAGE_SIZE, network, ...request }, { signal: controller.signal }) as MetricCollection
          ))
          : { points: result.member, cursor: { page, before, hasNextPage: Boolean(result.view.next), olderBefore: result.window?.olderBefore ?? null } };
        if (!controller.signal.aborted) {
          setDataset(result);
          setChartPoints(history.points);
          chartPointsRef.current = history.points;
          setOlderCursor(history.cursor);
        }
      } catch {
        if (!controller.signal.aborted) setError('Historical metric data could not be loaded. Retry this page.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [metric, bucketMinutes, range, page, network, before, revision, requestKey]);

  useEffect(() => {
    const viewport = chartViewportRef.current;
    if (!viewport || !activeDataset || metric?.showTrend === false) return;
    function updateVisiblePointCount() {
      if (!viewport) return;
      const nextCount = range === '1y' ? CHART_YEAR_DAYS : Math.max(CHART_MIN_VISIBLE_POINTS, Math.min(CHART_PAGE_SIZE, Math.floor(viewport.clientWidth / CHART_POINT_WIDTH)));
      setVisiblePointCount(nextCount);
    }
    updateVisiblePointCount();
    const observer = new ResizeObserver(updateVisiblePointCount);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [activeDataset, metric?.showTrend, range]);

  useEffect(() => {
    setViewportStart(Number.MAX_SAFE_INTEGER);
  }, [selectedSource, requestKey]);

  useEffect(() => () => historyAbortRef.current?.abort(), []);

  async function loadOlderChartData() {
    if (!metric || !olderCursor || historyLoadingRef.current) return;
    const nextBefore = olderCursor.hasNextPage ? olderCursor.before : olderCursor.olderBefore;
    if (!olderCursor.hasNextPage && !nextBefore) return;
    const nextPage = olderCursor.hasNextPage ? olderCursor.page + 1 : 1;
    const controller = new AbortController();
    historyAbortRef.current?.abort();
    historyAbortRef.current = controller;
    historyLoadingRef.current = true;
    setHistoryLoading(true);
    setHistoryError(null);
    const requestContext = requestKey;
    const anchorBucket = loadedChartRows[effectiveViewportStart]?.bucketStart ?? null;
    try {
      const result = await fetchNetworkMetricCollectionData({ metricKey: metric.key, bucketMinutes, page: nextPage, itemsPerPage: CHART_PAGE_SIZE, network, windowDays: 30, ...(nextBefore ? { before: nextBefore } : {}) }, { signal: controller.signal }) as MetricCollection;
      if (controller.signal.aborted || requestContext !== requestKeyRef.current) return;
      const mergedPoints = mergeMetricPoints(chartPointsRef.current, result.member);
      chartPointsRef.current = mergedPoints;
      setChartPoints(mergedPoints);
      setOlderCursor({
        page: nextPage,
        before: nextBefore,
        hasNextPage: Boolean(result.view.next),
        olderBefore: result.window?.olderBefore ?? null,
      });
      if (anchorBucket) {
        const mergedRows = pointsForSource(mergedPoints, selectedSource);
        const anchorIndex = mergedRows.findIndex((point) => point.bucketStart === anchorBucket);
        if (anchorIndex >= 0) setViewportStart(anchorIndex);
      }
    } catch {
      if (!controller.signal.aborted) setHistoryError('Older chart history could not be loaded.');
    } finally {
      if (!controller.signal.aborted) {
        historyLoadingRef.current = false;
        setHistoryLoading(false);
      }
    }
  }

  function setChartPosition(nextStart: number): number {
    const clamped = clampViewportStart(nextStart, loadedChartRows.length, visiblePointCount);
    setViewportStart(clamped);
    return clamped;
  }

  function panChartBy(pointDelta: number) {
    const nextStart = setChartPosition(effectiveViewportStart + pointDelta);
    if (pointDelta < 0 && nextStart <= CHART_EDGE_LOAD_THRESHOLD) void loadOlderChartData();
  }

  function handleChartPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startIndex: effectiveViewportStart,
      currentIndex: effectiveViewportStart,
      movedTowardOlder: false,
    };
    setDragging(true);
  }

  function handleChartPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - dragState.startX;
    const pointDelta = Math.round(deltaX / CHART_POINT_WIDTH);
    dragState.currentIndex = setChartPosition(dragState.startIndex - pointDelta);
    dragState.movedTowardOlder = dragState.movedTowardOlder || deltaX > CHART_POINT_WIDTH;
  }

  function finishChartDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragStateRef.current = null;
    setDragging(false);
    if (dragState.movedTowardOlder && dragState.currentIndex <= CHART_EDGE_LOAD_THRESHOLD) void loadOlderChartData();
  }

  function cancelChartDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    dragStateRef.current = null;
    setDragging(false);
  }

  function handleChartWheel(event: ReactWheelEvent<HTMLDivElement>) {
    const horizontalDelta = Math.abs(event.deltaX) >= Math.abs(event.deltaY) ? event.deltaX : event.shiftKey ? event.deltaY : 0;
    if (horizontalDelta === 0) return;
    event.preventDefault();
    panChartBy(Math.sign(horizontalDelta) * Math.max(1, Math.round(Math.abs(horizontalDelta) / CHART_POINT_WIDTH)));
  }

  function handleChartKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      panChartBy(-5);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      panChartBy(5);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setChartPosition(0);
      void loadOlderChartData();
    } else if (event.key === 'End') {
      event.preventDefault();
      setChartPosition(maximumViewportStart);
    }
  }

  function navigate(nextPage: number, nextBucket = bucketMinutes, nextBefore: string | null = before, nextRange = range) {
    const query = new URLSearchParams();
    query.set('bucketMinutes', String(nextBucket));
    query.set('page', String(nextPage));
    if (nextRange === '1y') query.set('range', nextRange);
    if (nextBefore) query.set('before', nextBefore);
    router.push(`${pathname}?${query}`, { scroll: false });
  }

  function exportPage() {
    if (!metric || !activeDataset || rows.length === 0) return;
    const csv = chartPageCsv({
      metricKey: metric.key,
      network,
      bucketMinutes,
      page,
      windowStart: activeDataset.window?.start ?? null,
      windowEnd: activeDataset.window?.end ?? null,
      description: metric.description,
      valueLabel: metric.valueLabel,
      note: metric.note ?? null,
      member: rows,
    });
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `stellarchain-${metric.key}-page-${page}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (!metric) return <main className="mx-auto max-w-[1400px] p-4 text-sm text-[var(--text-secondary)]">Unknown chart. <Link href="/chart" className="underline">Browse charts</Link></main>;

  const { points: chartRows, gaps: visibleGaps } = chartSeries(visibleChartRows, bucketMinutes);
  const loadedStart = loadedChartRows[0]?.bucketStart;
  const loadedEnd = loadedChartRows[loadedChartRows.length - 1]?.bucketEnd;
  const chartLineGradientId = `chart-line-${metric.key}`;
  const chartAreaGradientId = `chart-area-${metric.key}`;
  const bucketOptions = metric.key === 'active-addresses'
    ? CHART_BUCKET_OPTIONS.slice(0, 1)
    : CHART_BUCKET_OPTIONS.map((option) => ({ ...option, disabled: range === '1y' && option.value !== 1440 }));
  const relatedMetrics = CHART_METRICS.filter((candidate) => candidate.group === metric.group && candidate.key !== metric.key);

  return (
    <main className="mx-auto max-w-[1400px] space-y-5 p-4">
      <Card variant="bordered" className="p-5 shadow-sm">
        <div className="flex min-w-0 items-start gap-4">
          <Link href="/statistics" aria-label="Back to statistics" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--info-muted)] text-[var(--primary-blue)] transition-colors hover:bg-[var(--bg-tertiary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-blue)]">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Historical chart</span>
            </div>
            <div className="flex items-center gap-1">
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">{metric.label}</h1>
              {metric.note && <InfoTooltip ariaLabel={`About ${metric.label}`} content={metric.note} direction="bottom" align="start" />}
            </div>
            <p className="mt-1 max-w-3xl text-sm text-[var(--text-secondary)]">{metric.description}</p>
          </div>
        </div>
      </Card>
      <Card variant="bordered" className="overflow-hidden p-0 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/35 p-4 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" onClick={exportPage} disabled={activeLoading || rows.length === 0} className="h-10 self-start text-xs focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)]">Export current page CSV</Button>
          <div className="flex flex-wrap items-center gap-3 sm:ml-auto sm:justify-end">
            {sources.length > 1 && <>
              <label htmlFor="chart-source" className="text-xs font-medium text-[var(--text-secondary)]">Dataset</label>
              <select id="chart-source" value={selectedSource} onChange={(event) => setSource(event.target.value)}
                className="h-10 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)]">
                {sources.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </>}
            {metric.key !== 'active-addresses' && <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Historical range</span>
              <SegmentedControl ariaLabel="Historical range" options={CHART_RANGE_OPTIONS} value={range} onChange={(value) => navigate(1, value === '1y' ? 1440 : bucketMinutes, null, value)} />
            </div>}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Bucket size</span>
              <SegmentedControl ariaLabel="Bucket size" options={bucketOptions} value={bucketMinutes} onChange={(value) => navigate(1, value, null)} />
            </div>
          </div>
        </div>
        {activeLoading && <div className="relative h-64 sm:h-80"><ChartLoadingOverlay label={range === '1y' ? 'Loading one year of daily metric buckets…' : 'Loading metric buckets…'} /></div>}
        {activeError && <div className="flex flex-wrap items-center gap-3 p-4 text-sm text-[var(--error)]"><span role="alert">{activeError}</span><Button type="button" onClick={() => setRevision((value) => value + 1)}>Retry</Button><Button type="button" onClick={() => navigate(1, bucketMinutes, null)}>Latest window</Button></div>}
        {activeDataset && !activeLoading && <div className="p-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">{metric.label} over time</h2>
            <div className="mt-1 flex items-center gap-1 text-xs text-[var(--text-secondary)]">
              <span>{loadedStart && loadedEnd ? `${utcLabel(loadedStart)} – ${utcLabel(loadedEnd)}` : 'No indexed chart history'}</span>
              <InfoTooltip
                ariaLabel="About loaded chart history"
                direction="bottom"
                align="start"
                content={range === '1y' ? `The chart loads up to ${CHART_YEAR_DAYS} days ending at the latest indexed bucket or the selected historical boundary, using daily buckets and bounded API windows. The dates show available data, which may cover less than a year. CSV export remains the current API page only.` : `The chart starts with the current API page and appends older buckets as you pan left. Each request contains up to ${CHART_PAGE_SIZE} grouped rows across all datasets; the selected dataset may therefore add fewer buckets.`}
              />
            </div>
            {visibleGaps > 0 && <p className="mt-2 text-xs text-[var(--text-secondary)]">{visibleGaps} {visibleGaps === 1 ? 'gap' : 'gaps'} between shown buckets. The line stops at each gap; other pages may contain more.</p>}
          </div>
          {metric.showTrend !== false && chartRows.length ? <figure className="mt-4" aria-label={`${metric.label} interactive historical trend`}>
            <div
              id="chart-pan-region"
              ref={chartViewportRef}
              role="region"
              tabIndex={0}
              aria-label={`${metric.label} chart. Drag, swipe, use Shift and the mouse wheel, or use the arrow keys to move through time.`}
              aria-describedby="chart-pan-instructions"
              onPointerDown={handleChartPointerDown}
              onPointerMove={handleChartPointerMove}
              onPointerUp={finishChartDrag}
              onPointerCancel={cancelChartDrag}
              onLostPointerCapture={cancelChartDrag}
              onWheel={handleChartWheel}
              onKeyDown={handleChartKeyDown}
              className={`interactive-chart relative h-64 touch-pan-y select-none overflow-hidden overscroll-contain rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-blue)] sm:h-80 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            >
              <div className="h-full w-full" role="img" aria-label={`${metric.label} trend. Exact values for the current CSV page are available from the export.`}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={chartRows} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
                    <defs>
                      <linearGradient id={chartLineGradientId} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="var(--primary-blue)" />
                        <stop offset="52%" stopColor="var(--info)" />
                        <stop offset="100%" stopColor="var(--success)" />
                      </linearGradient>
                      <linearGradient id={chartAreaGradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--info)" stopOpacity={0.28} />
                        <stop offset="48%" stopColor="var(--primary-blue)" stopOpacity={0.11} />
                        <stop offset="100%" stopColor="var(--success)" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="2 6" vertical />
                    <XAxis dataKey="bucketStart" tickFormatter={(value: string) => chartTimeTick(value, bucketMinutes)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'var(--border-default)' }} minTickGap={48} />
                    <YAxis tickFormatter={(value: number) => chartAxisValue(value)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickLine={false} axisLine={false} width={64} domain={[0, 'auto']} />
                    <Tooltip
                      cursor={{ stroke: 'var(--info)', strokeDasharray: '4 4', strokeOpacity: 0.6 }}
                      content={<HistoricalChartTooltip valueLabel={metric.valueLabel} />}
                      wrapperStyle={{ outline: 'none', zIndex: 30 }}
                    />
                    <Area type="linear" dataKey="value" tooltipType="none" stroke="none" fill={`url(#${chartAreaGradientId})`} fillOpacity={1} isAnimationActive={false} connectNulls={false} dot={false} activeDot={false} />
                    <Area type="linear" dataKey="value" tooltipType="none" stroke={`url(#${chartLineGradientId})`} strokeWidth={5} strokeOpacity={0.08} fill="none" isAnimationActive={false} connectNulls={false} dot={false} activeDot={false} />
                    <Area type="linear" dataKey="value" name={metric.valueLabel} stroke={`url(#${chartLineGradientId})`} strokeWidth={2} fill="none" isAnimationActive={false} connectNulls={false} dot={false} activeDot={{ r: 4, fill: 'var(--bg-secondary)', stroke: 'var(--info)', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {historyLoading && <ChartLoadingOverlay label="Loading older chart history…" />}
            </div>
            {historyError && <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--error)]"><span role="alert">{historyError}</span><Button type="button" variant="ghost" onClick={() => void loadOlderChartData()} className="min-h-8 px-2">Retry history</Button></div>}
            <figcaption className="mt-3 grid gap-3 border-t border-[var(--border-subtle)] pt-3 text-[11px] text-[var(--text-tertiary)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--info-muted)] text-[var(--primary-blue)]" aria-hidden="true">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16m-4-4 4 4-4 4M8 8l-4 4 4 4" />
                  </svg>
                </span>
                <span id="chart-pan-instructions">Drag or swipe to explore · Arrow keys supported · Older history loads at the left edge</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
                <span><strong className="font-semibold text-[var(--text-secondary)]">Bucket</strong> {bucketLabel(bucketMinutes)}</span>
                {metric.key !== 'active-addresses' && <span><strong className="font-semibold text-[var(--text-secondary)]">Range</strong> {range === '1y' ? '1Y' : '1M'}</span>}
                <span><strong className="font-semibold text-[var(--text-secondary)]">Loaded</strong> {loadedChartRows.length.toLocaleString()}</span>
                <span><strong className="font-semibold text-[var(--text-secondary)]">Visible</strong> {visibleChartRows.length.toLocaleString()}</span>
                <span><strong className="font-semibold text-[var(--text-secondary)]">CSV</strong> page {page} · {rows.length.toLocaleString()} rows</span>
                <span>UTC</span>
                <InfoTooltip
                  ariaLabel="About chart scope and precision"
                  content="The chart loads older API pages on demand and converts exact decimal strings to floating-point values for visual orientation. The current-page CSV retains exact decimals and source provenance. Missing buckets remain gaps and are not filled."
                  align="end"
                />
              </div>
            </figcaption>
          </figure> : <p className="mt-4 text-sm text-[var(--text-secondary)]">{metric.showTrend === false ? 'Trend not shown because these values combine different asset units.' : 'No indexed buckets on this page.'}</p>}
        </div>}
      </Card>
      {relatedMetrics.length > 0 && <nav aria-label="Related historical charts">
        <Card variant="bordered" className="overflow-hidden p-0 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--info-muted)] text-[var(--primary-blue)]" aria-hidden="true">
                <RelatedChartIcon />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">More {metric.group.toLowerCase()} charts</h2>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Explore related network metrics in the same historical range.</p>
              </div>
            </div>
            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{relatedMetrics.length} charts</span>
          </div>
          <div className="grid gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]/35 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedMetrics.map((candidate) => (
              <Link key={candidate.key} href={`/chart/${candidate.key}${range === '1y' ? '?range=1y' : ''}`} className="group flex min-h-16 items-center gap-3 rounded-xl border border-transparent bg-[var(--bg-secondary)] p-3 transition-colors hover:border-[var(--border-default)] hover:bg-[var(--bg-tertiary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-blue)]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--info-muted)] text-[var(--primary-blue)] transition-colors group-hover:bg-[var(--bg-secondary)]" aria-hidden="true">
                  <RelatedChartIcon />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-[var(--text-primary)]">{candidate.label}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-[var(--text-tertiary)]">{candidate.valueLabel}</span>
                </span>
                <svg className="h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--primary-blue)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            ))}
          </div>
        </Card>
      </nav>}
    </main>
  );
}
