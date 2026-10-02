'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import StatisticsView from '@/components/StatisticsView';
import Loading from '@/components/ui/Loading';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { fetchNetworkStatisticsData } from '@/services/api';
import { NetworkStatisticsRange, NetworkStatisticsResponse } from '@/lib/stellar';

// Buttons select both the historical window and an appropriate bucket size.
// Older data is loaded lazily via the `before` cursor when available.
const BUCKET_MINUTES_BY_RANGE: Record<NetworkStatisticsRange, number> = {
  '24h': 5,
  '7d': 60,
  '30d': 1440,
  '1y': 1440,
};

const BUCKET_PAGE_SIZE_BY_RANGE: Record<NetworkStatisticsRange, number> = {
  '24h': 288,
  '7d': 168,
  '30d': 31,
  '1y': 366,
};

export default function StatisticsPage() {
  const [stats, setStats] = useState<NetworkStatisticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [selectedRange, setSelectedRange] = useState<NetworkStatisticsRange>('7d');
  const [loadedRange, setLoadedRange] = useState<NetworkStatisticsRange | null>(null);
  const [revision, setRevision] = useState(0);
  const hasLoadedRef = useRef(false);
  const inflightOlderRef = useRef(false);
  const rangeGenerationRef = useRef(0);

  function changeRange(range: NetworkStatisticsRange) {
    if (range === selectedRange) return;
    rangeGenerationRef.current += 1;
    setSelectedRange(range);
  }

  useEffect(() => {
    let cancelled = false;

    const loadStatistics = async () => {
      try {
        setError(null);
        if (hasLoadedRef.current) {
          setIsRefreshing(true);
        }

        const statistics = await fetchNetworkStatisticsData({
          range: selectedRange,
          bucketMinutes: BUCKET_MINUTES_BY_RANGE[selectedRange],
          limitBuckets: BUCKET_PAGE_SIZE_BY_RANGE[selectedRange],
        }) as NetworkStatisticsResponse;

        if (cancelled) return;

        setStats(statistics);
        setLoadedRange(selectedRange);
        hasLoadedRef.current = true;
      } catch {
        if (cancelled) return;
        setError('Statistics could not be loaded. Try again.');
      } finally {
        if (cancelled) return;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };

    loadStatistics();

    return () => {
      cancelled = true;
    };
  }, [selectedRange, revision]);

  const loadOlder = useCallback(async () => {
    if (inflightOlderRef.current) return;
    const current = stats;
    if (!current || !current.coverage.hasMore) return;
    const firstBucket = current.coverage.firstBucket;
    if (!firstBucket) return;
    const requestGeneration = rangeGenerationRef.current;

    inflightOlderRef.current = true;
    setIsLoadingOlder(true);

    try {
      const older = await fetchNetworkStatisticsData({
        range: selectedRange,
        bucketMinutes: BUCKET_MINUTES_BY_RANGE[selectedRange],
        limitBuckets: BUCKET_PAGE_SIZE_BY_RANGE[selectedRange],
        before: firstBucket,
      }) as NetworkStatisticsResponse;

      if (rangeGenerationRef.current !== requestGeneration) return;

      if (!older.chart.points.length) {
        // Nothing new to merge; mark as no more so we don't loop.
        setStats((previous) => previous
          ? { ...previous, coverage: { ...previous.coverage, hasMore: false } }
          : previous);
        return;
      }

      setStats((previous) => {
        if (rangeGenerationRef.current !== requestGeneration) return previous;
        if (!previous) return older;
        const seen = new Set(previous.chart.points.map((p) => p.bucketStart));
        const merged = [
          ...older.chart.points.filter((p) => !seen.has(p.bucketStart)),
          ...previous.chart.points,
        ];
        return {
          ...previous,
          coverage: {
            ...previous.coverage,
            firstBucket: older.coverage.firstBucket ?? previous.coverage.firstBucket,
            bucketCount: merged.length,
            hasMore: older.coverage.hasMore ?? false,
          },
          chart: {
            ...previous.chart,
            points: merged,
          },
        };
      });
    } catch (err) {
      // Keep silent so user can retry by panning again; surface only if first page errored.
      console.error('Failed to load older statistics page', err);
    } finally {
      inflightOlderRef.current = false;
      setIsLoadingOlder(false);
    }
  }, [stats, selectedRange]);

  if (isLoading || (!error && loadedRange !== selectedRange)) {
    return <Loading title="Loading statistics" description="Fetching network statistics." />;
  }

  if (error) {
    return (
      <main className="mx-auto max-w-[1400px] p-4">
        <Card variant="bordered" className="p-6">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Statistics</h1>
          <p role="alert" className="mt-2 text-sm text-[var(--text-secondary)]">{error}</p>
          <Button type="button" onClick={() => setRevision((value) => value + 1)} className="mt-4">Retry</Button>
        </Card>
      </main>
    );
  }

  if (!stats) {
    return <Loading title="Loading statistics" description="Preparing network statistics." />;
  }

  return (
    <div className="mx-auto max-w-[1400px] p-4 lg:p-4">
      <StatisticsView
        stats={stats}
        selectedRange={selectedRange}
        onRangeChange={changeRange}
        isRefreshing={isRefreshing}
        onLoadOlder={loadOlder}
        isLoadingOlder={isLoadingOlder}
      />
    </div>
  );
}
