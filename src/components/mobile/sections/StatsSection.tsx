'use client';

import type { NetworkStats } from '@/lib/stellar';
import StatsCards from './StatsCards';

interface StatsSectionProps {
  stats: NetworkStats;
  xlmVolume: number;
  xlmPrice: number;
  loading?: boolean;
}

export default function StatsSection({ stats, xlmVolume, xlmPrice, loading = false }: StatsSectionProps) {
  return (
    <StatsCards
      stats={stats}
      xlmVolume={xlmVolume}
      xlmPrice={xlmPrice}
      loading={loading}
    />
  );
}
