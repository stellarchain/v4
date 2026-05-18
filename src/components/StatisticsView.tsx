'use client';

import { NetworkStatisticsRange, NetworkStatisticsResponse } from '@/lib/stellar';
import StatCard from '@/components/StatCard';
import NetworkActivityChart from '@/components/NetworkActivityChart';
import Badge from '@/components/ui/Badge';

interface StatisticsViewProps {
  stats: NetworkStatisticsResponse;
  selectedRange: NetworkStatisticsRange;
  onRangeChange: (range: NetworkStatisticsRange) => void;
  isRefreshing?: boolean;
  onLoadOlder?: () => void;
  isLoadingOlder?: boolean;
}

const RANGE_OPTIONS: Array<{ label: string; value: NetworkStatisticsRange }> = [
  { label: '5m', value: '24h' },
  { label: '1h', value: '7d' },
  { label: '1d', value: '30d' },
];

function formatCoverageDate(value: string | null): string {
  if (!value) return 'No data yet';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function StatisticsView({
  stats,
  selectedRange,
  onRangeChange,
  isRefreshing = false,
  onLoadOlder,
  isLoadingOlder = false,
}: StatisticsViewProps) {
  const coverageText = stats.coverage.firstBucket && stats.coverage.lastBucket
    ? `${formatCoverageDate(stats.coverage.firstBucket)} - ${formatCoverageDate(stats.coverage.lastBucket)}`
    : 'Waiting for collected statistics';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] flex items-center justify-center">
            <svg className="w-5 h-5 text-[var(--primary-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.5l4.5-4.5 4 4L21 3.5M21 3.5h-6M21 3.5v6M3 20.5h18" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Statistics</h1>
              <Badge>{stats.network}</Badge>
              {stats.coverage.isPartial && <Badge>Partial</Badge>}
              {isRefreshing && <Badge>Updating</Badge>}
            </div>
            <p className="text-[var(--text-secondary)] text-xs mt-0.5">
              {coverageText}
            </p>
          </div>
        </div>
        <div className="inline-flex rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-0.5 self-start lg:self-auto">
          {RANGE_OPTIONS.map((option) => {
            const active = selectedRange === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onRangeChange(option.value)}
                className={`min-w-12 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[var(--primary-blue)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                aria-pressed={active}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <NetworkActivityChart
        chart={stats.chart}
        coverage={stats.coverage}
        bucketMinutes={stats.bucketMinutes}
        onLoadOlder={onLoadOlder}
        isLoadingOlder={isLoadingOlder}
      />

      {stats.sections.map((section) => (
        <section key={section.id}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-[var(--primary-blue)] rounded-full" />
                <h2 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  {section.label}
                </h2>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{section.description}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {section.cards.map((card) => (
              <StatCard key={card.metricKey} stat={card} />
            ))}
          </div>
        </section>
      ))}

      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed text-center">
        Data sourced from horizon_statistics. Range ends at the latest collected bucket; backfill progress is reflected as new chunks are written.
      </p>
    </div>
  );
}
