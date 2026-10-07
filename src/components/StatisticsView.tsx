'use client';

import { NetworkStatisticsRange, NetworkStatisticsResponse } from '@/lib/stellar';
import StatCard from '@/components/StatCard';
import NetworkActivityChart from '@/components/NetworkActivityChart';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { chartMetric } from '@/lib/shared/chartCatalog';

interface StatisticsViewProps {
  stats: NetworkStatisticsResponse;
  selectedRange: NetworkStatisticsRange;
  onRangeChange: (range: NetworkStatisticsRange) => void;
  isRefreshing?: boolean;
  refreshError?: string | null;
  onRefreshRetry?: () => void;
  onLoadOlder?: () => void;
  isLoadingOlder?: boolean;
}

function formatCoverageDate(value: string | null): string {
  if (!value) return 'No data yet';
  return new Date(value).toLocaleString(undefined, {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatisticsSectionIcon({ sectionId }: { sectionId: string }) {
  if (sectionId === 'dex-payments') {
    return (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h11m0 0-3-3m3 3-3 3M17 17H6m0 0 3 3m-3-3 3-3" />
      </svg>
    );
  }

  if (sectionId === 'accounts-contracts') {
    return (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-3h5m-2.5-2.5v5" />
      </svg>
    );
  }

  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 19V9m5 10V5m5 14v-7m5 7V3M2 21h20" />
    </svg>
  );
}

export default function StatisticsView({
  stats,
  selectedRange,
  onRangeChange,
  isRefreshing = false,
  refreshError = null,
  onRefreshRetry,
  onLoadOlder,
  isLoadingOlder = false,
}: StatisticsViewProps) {
  const coverageText = stats.coverage.firstBucket && stats.coverage.lastBucket
    ? `${formatCoverageDate(stats.coverage.firstBucket)} – ${formatCoverageDate(stats.coverage.lastBucket)} UTC`
    : 'Waiting for collected statistics';

  return (
    <div className="space-y-8">
      <Card variant="bordered" className="shadow-sm">
        <div className="p-5">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--info-muted)] text-[var(--primary-blue)]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.5l4.5-4.5 4 4L21 3.5M21 3.5h-6M21 3.5v6M3 20.5h18" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Network statistics</span>
                {stats.coverage.isPartial && <Badge variant="warning">Partial coverage</Badge>}
                {isRefreshing && <Badge variant="info">Updating</Badge>}
              </div>
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Statistics</h1>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{coverageText}</p>
            </div>
          </div>
        </div>
      </Card>

      <NetworkActivityChart
        chart={stats.chart}
        coverage={stats.coverage}
        range={selectedRange}
        bucketMinutes={stats.bucketMinutes}
        onRangeChange={onRangeChange}
        isRefreshing={isRefreshing}
        refreshError={refreshError}
        onRefreshRetry={onRefreshRetry}
        onLoadOlder={onLoadOlder}
        isLoadingOlder={isLoadingOlder}
      />

      <div className="space-y-10">
        {stats.sections.map((section) => (
          <section key={section.id} aria-labelledby={`stats-${section.id}`} className="scroll-mt-20">
            <div className="mb-4 flex items-end justify-between gap-4 border-b border-[var(--border-default)] pb-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--info-muted)] text-[var(--primary-blue)]">
                  <StatisticsSectionIcon sectionId={section.id} />
                </div>
                <div className="min-w-0">
                  <h2 id={`stats-${section.id}`} className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    {section.label}
                  </h2>
                  <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--text-secondary)]">{section.description}</p>
                </div>
              </div>
              <Badge className="shrink-0 font-mono tabular-nums">{section.cards.length} metrics</Badge>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {section.cards.map((card) => {
                const metric = chartMetric(card.metricKey);
                const chartBucketMinutes = card.metricKey === 'active-addresses' ? 5 : stats.bucketMinutes;
                const chartRange = selectedRange === '1y' && card.metricKey !== 'active-addresses' ? '&range=1y' : '';
                const href = metric ? `/chart/${metric.key}?bucketMinutes=${chartBucketMinutes}${chartRange}` : undefined;
                return <StatCard key={card.metricKey} stat={card} href={href} />;
              })}
            </div>
          </section>
        ))}
      </div>

      <Card variant="bordered" className="flex items-start gap-3 bg-[var(--bg-primary)]/45 p-4 shadow-none">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--info-muted)] text-[var(--primary-blue)]">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v4m0 4h.01M10.3 3.7 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xs font-semibold text-[var(--text-primary)]">Indexed coverage</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
            Historical data reflects indexed buckets only. The range ends at the latest collected bucket and expands as backfill writes new chunks. Active transaction sources are five-minute bucket counts, not unique accounts across the selected range.
          </p>
        </div>
      </Card>
    </div>
  );
}
