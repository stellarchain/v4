'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { CHART_METRICS, chartMetric } from '@/lib/shared/chartCatalog';
import { chartPageCsv } from '@/lib/shared/chartExport';
import { chartSeries } from '@/lib/shared/chartSeries';
import { fetchNetworkMetricCollectionData } from '@/services/api';
import { useNetwork } from '@/contexts/NetworkContext';

interface MetricPoint {
  metricKey: string;
  source: string;
  bucketStart: string;
  bucketEnd: string;
  valueDecimal: string;
}

interface MetricCollection {
  totalItems: number;
  member: MetricPoint[];
  view: { next?: string; previous?: string };
  window: {
    start: string;
    end: string;
    olderBefore: string | null;
    newerBefore: string | null;
    isLatest: boolean;
  } | null;
}

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

export default function ChartMetricClient() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const metric = chartMetric(params.slug);
  const page = positivePage(searchParams.get('page'));
  const bucketMinutes = metric?.key === 'active-addresses' ? 5 : bucketSize(searchParams.get('bucketMinutes'));
  const before = searchParams.get('before');
  const [dataset, setDataset] = useState<MetricCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const { network } = useNetwork();
  const requestKey = JSON.stringify([metric?.key ?? null, network, bucketMinutes, page, before, revision]);
  const activeDataset = resolvedKey === requestKey ? dataset : null;
  const activeLoading = loading || resolvedKey !== requestKey;
  const activeError = resolvedKey === requestKey ? error : null;
  const sources = [...new Set(activeDataset?.member.map((point) => point.source) ?? [])];
  const selectedSource = source && sources.includes(source) ? source : sources[0];
  const rows = activeDataset?.member.filter((point) => point.source === selectedSource) ?? [];

  useEffect(() => { document.title = `${metric?.label ?? 'Historical chart'} — StellarChain`; }, [metric?.label]);

  useEffect(() => {
    if (!metric) return;
    const controller = new AbortController();
    setDataset(null);
    setSource(null);
    setLoading(true);
    setError(null);
    setResolvedKey(requestKey);
    async function load() {
      try {
        const result = await fetchNetworkMetricCollectionData({ metricKey: metric?.key, bucketMinutes, page, itemsPerPage: 100, network, windowDays: 30, ...(before ? { before } : {}) }, { signal: controller.signal }) as MetricCollection;
        if (!controller.signal.aborted) setDataset(result);
      } catch {
        if (!controller.signal.aborted) setError('Historical metric data could not be loaded. Retry this page.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [metric, bucketMinutes, page, network, before, revision, requestKey]);

  function navigate(nextPage: number, nextBucket = bucketMinutes, nextBefore: string | null = before) {
    const query = new URLSearchParams();
    query.set('bucketMinutes', String(nextBucket));
    query.set('page', String(nextPage));
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

  const { points: chartRows, gaps: visibleGaps } = chartSeries(rows, bucketMinutes);

  return (
    <main className="mx-auto max-w-[1400px] space-y-5 p-4">
      <div>
        <Link href="/chart" className="text-xs text-[var(--primary-blue)] hover:underline">← All historical charts</Link>
        <h1 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{metric.label}</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{metric.description}</p>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">{network} · {metric.group} · indexed buckets only. Missing buckets are not filled or interpolated.</p>
      </div>
      {metric.note && <Card className="p-4 text-sm text-[var(--text-secondary)]"><p role="note">{metric.note}</p></Card>}
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <label htmlFor="chart-bucket-size" className="text-xs text-[var(--text-secondary)]">Bucket size</label>
        <select id="chart-bucket-size" value={bucketMinutes} onChange={(event) => navigate(1, Number(event.target.value), null)}
          className="h-10 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)]">
          <option value={5}>5 minutes</option>
          {metric.key !== 'active-addresses' && <><option value={60}>1 hour</option><option value={1440}>1 day</option></>}
        </select>
        {sources.length > 1 && <>
          <label htmlFor="chart-source" className="text-xs text-[var(--text-secondary)]">Source</label>
          <select id="chart-source" value={selectedSource} onChange={(event) => setSource(event.target.value)}
            className="h-10 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)]">
            {sources.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </>}
        <Button type="button" onClick={exportPage} disabled={activeLoading || rows.length === 0} className="text-xs">Export shown page CSV</Button>
      </Card>
      {activeLoading && <Card className="p-8 text-sm text-[var(--text-secondary)]"><span role="status">Loading metric buckets…</span></Card>}
      {activeError && <Card className="flex flex-wrap items-center gap-3 p-4 text-sm text-[var(--error)]"><span role="alert">{activeError}</span><Button type="button" onClick={() => setRevision((value) => value + 1)}>Retry</Button><Button type="button" onClick={() => navigate(1, bucketMinutes, null)}>Latest window</Button></Card>}
      {activeDataset && !activeLoading && <>
        <Card className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{metric.label} over time</h2>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Value unit: {metric.valueLabel}</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{activeDataset.window ? `${utcLabel(activeDataset.window.start)} to ${utcLabel(activeDataset.window.end)} (exclusive)` : 'No indexed window'} · Page {page} · {rows.length} shown rows · {activeDataset.totalItems.toLocaleString()} grouped rows in this 30-day window. Chart values use floating-point for display; table and export retain exact decimals.</p>
              {visibleGaps > 0 && <p className="mt-1 text-xs text-[var(--text-secondary)]">{visibleGaps} {visibleGaps === 1 ? 'gap' : 'gaps'} between shown buckets; the trend line stops at each gap. Other pages may contain additional gaps.</p>}
            </div>
          </div>
          {metric.showTrend !== false && chartRows.length ? <figure className="mt-4 h-72" aria-label={`${metric.label} historical trend for the selected page`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartRows} margin={{ top: 12, right: 10, left: 10, bottom: 4 }}>
                <CartesianGrid stroke="var(--border-default)" strokeDasharray="3 3" />
                <XAxis dataKey="bucketStart" tickFormatter={(value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} minTickGap={24} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={55} />
                <Area type="monotone" dataKey="value" stroke="var(--primary-blue)" fill="var(--info-muted)" strokeWidth={2} isAnimationActive={false} connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          </figure> : <p className="mt-4 text-sm text-[var(--text-secondary)]">{metric.showTrend === false ? 'Trend not shown because these values combine different asset units.' : 'No indexed buckets on this page.'}</p>}
        </Card>
        <Card className="overflow-hidden">
          <div className="border-b border-[var(--border-default)] p-4"><h2 className="text-sm font-semibold text-[var(--text-primary)]">Exact bucket values</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"><tr><th scope="col" className="p-3">Bucket start (UTC)</th><th scope="col" className="p-3">Bucket end (UTC)</th><th scope="col" className="p-3">Source</th><th scope="col" className="p-3 text-right">{metric.valueLabel} (exact)</th></tr></thead>
              <tbody className="divide-y divide-[var(--border-default)]">{rows.map((point) => <tr key={`${point.bucketStart}:${point.source}`}><td className="p-3 font-mono">{utcLabel(point.bucketStart)}</td><td className="p-3 font-mono">{utcLabel(point.bucketEnd)}</td><td className="p-3">{point.source}</td><td className="p-3 text-right font-mono tabular-nums">{point.valueDecimal}</td></tr>)}</tbody>
            </table>
          </div>
        </Card>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
          <span>Pagination covers this indexed UTC window, not a verified gap-free chain interval.</span>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => navigate(1, bucketMinutes, activeDataset.window?.newerBefore ?? null)} disabled={!activeDataset.window || activeDataset.window.isLatest}>Newer 30 days</Button>
            <Button type="button" onClick={() => navigate(1, bucketMinutes, activeDataset.window?.olderBefore ?? null)} disabled={!activeDataset.window?.olderBefore}>Older 30 days</Button>
            <Button type="button" onClick={() => navigate(page - 1)} disabled={page <= 1}>Previous page</Button>
            <Button type="button" onClick={() => navigate(page + 1)} disabled={!activeDataset.view.next}>Next page</Button>
          </div>
        </div>
      </>}
      <nav aria-label="Related historical charts" className="border-t border-[var(--border-default)] pt-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">More {metric.group.toLowerCase()} charts</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {CHART_METRICS.filter((candidate) => candidate.group === metric.group && candidate.key !== metric.key).map((candidate) => (
            <Link key={candidate.key} href={`/chart/${candidate.key}`} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--primary-blue)] hover:border-[var(--primary-blue)] focus-visible:outline-2 focus-visible:outline-[var(--primary-blue)]">{candidate.label}</Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
