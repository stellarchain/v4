'use client';

import { useEffect, useState } from 'react';
import { Horizon } from '@stellar/stellar-sdk';
import { getBaseUrl } from '@/lib/stellar';
import StatisticsView from '@/components/StatisticsView';
import Loading from '@/components/ui/Loading';

export default function StatisticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStatistics = async () => {
      try {
        const server = new Horizon.Server(getBaseUrl());

        // Fetch latest ledger to get network statistics
        const ledgerResponse = await server.ledgers().order('desc').limit(1).call();
        const latestLedger = ledgerResponse.records[0];

        // Construct statistics object
        const statistics = {
          ledgerCount: latestLedger.sequence,
          operationCount: latestLedger.operation_count,
          transactionCount: latestLedger.successful_transaction_count,
          feePoolAmount: latestLedger.fee_pool,
          baseReserve: latestLedger.base_reserve_in_stroops,
          baseFee: latestLedger.base_fee_in_stroops,
          lastLedgerTime: latestLedger.closed_at,
        };

        setStats(statistics);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load statistics');
        setIsLoading(false);
      }
    };

    loadStatistics();
  }, []);

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

  return <StatisticsView stats={stats} />;
}
