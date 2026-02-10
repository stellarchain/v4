'use client';

import { useEffect, useState } from 'react';
import { Horizon } from '@stellar/stellar-sdk';
import { getBaseUrl } from '@/lib/stellar';
import type { Ledger } from '@/lib/stellar';
import LedgersPageClient from '@/components/LedgersPageClient';
import Loading from '@/components/ui/Loading';

export default function LedgersPage() {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLedgers = async () => {
      try {
        const server = new Horizon.Server(getBaseUrl());
        const ledgersResponse = await server.ledgers().order('desc').limit(50).call();
        const ledgersData = (ledgersResponse.records || []) as unknown as Ledger[];

        setLedgers(ledgersData);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load ledgers');
        setIsLoading(false);
      }
    };

    loadLedgers();
  }, []);

  if (isLoading) {
    return <Loading title="Loading ledgers" description="Fetching recent ledgers." />;
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

  return <LedgersPageClient initialLedgers={ledgers} limit={50} />;
}
