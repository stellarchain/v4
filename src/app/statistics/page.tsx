'use client';

import { useEffect, useRef, useState } from 'react';
import StatisticsView from '@/components/StatisticsView';
import Loading from '@/components/ui/Loading';
import { fetchNetworkStatisticsData } from '@/services/api';
import { NetworkStatisticsRange, NetworkStatisticsResponse } from '@/lib/stellar';

const BUCKET_MINUTES_BY_RANGE: Record<NetworkStatisticsRange, number> = {
  '24h': 5,
  '7d': 60,
  '30d': 1440,
};

export default function StatisticsPage() {
  const [stats, setStats] = useState<NetworkStatisticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedRange, setSelectedRange] = useState<NetworkStatisticsRange>('7d');
  const hasLoadedRef = useRef(false);

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
      />
    </div>
  );
}
