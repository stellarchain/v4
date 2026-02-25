'use client';

import type { NetworkStats } from '@/lib/stellar';
import StatsCards from './StatsCards';

interface StatsSectionProps {
  stats: NetworkStats;
  xlmVolume: number;
  xlmPrice: number;
  marketOverview?: {
    xlmPriceUsd: string;
    xlmVolume24h: string;
    totalTrades24h: string;
    activeAssets24h: number;
    trackedAssets: number;
    totalAccounts: number;
    totalContracts: number;
    recordedAt: string;
  } | null;
  loading?: boolean;
}

export default function StatsSection({ stats, xlmVolume, xlmPrice, marketOverview, loading = false }: StatsSectionProps) {
  return (
    <StatsCards
      stats={stats}
      xlmVolume={xlmVolume}
      xlmPrice={xlmPrice}
      marketOverview={marketOverview}
      loading={loading}
    />
  );
}
