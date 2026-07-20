'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import StatisticsView from '@/components/StatisticsView';
import Loading from '@/components/ui/Loading';
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
  const hasLoadedRef = useRef(false);
  const inflightOlderRef = useRef(false);

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
        hasLoadedRef.current = true;
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load statistics');
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
  }, [selectedRange]);

  const loadOlder = useCallback(async () => {
    if (inflightOlderRef.current) return;
    const current = stats;
    if (!current || !current.coverage.hasMore) return;
    const firstBucket = current.coverage.firstBucket;
    if (!firstBucket) return;

    inflightOlderRef.current = true;
    setIsLoadingOlder(true);

    try {
      const older = await fetchNetworkStatisticsData({
        range: selectedRange,
        bucketMinutes: BUCKET_MINUTES_BY_RANGE[selectedRange],
        limitBuckets: BUCKET_PAGE_SIZE_BY_RANGE[selectedRange],
        before: firstBucket,
      }) as NetworkStatisticsResponse;

      if (!older.chart.points.length) {
        // Nothing new to merge; mark as no more so we don't loop.
        setStats((previous) => previous
          ? { ...previous, coverage: { ...previous.coverage, hasMore: false } }
          : previous);
        return;
      }

      setStats((previous) => {
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

  if (isLoading) {
    return <Loading title="Loading statistics" description="Fetching network statistics." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500">Error: {error}</p>
        </div>
      </div>
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
        onRangeChange={setSelectedRange}
        isRefreshing={isRefreshing}
        onLoadOlder={loadOlder}
        isLoadingOlder={isLoadingOlder}
      />
    </div>
  );
}
