'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Horizon } from '@stellar/stellar-sdk';
import type { Ledger } from '@/lib/stellar';
import LedgersPageClient from '@/components/LedgersPageClient';
import LedgerDetailsClientPage from '@/app/ledger/[sequence]/client-page';
import Loading from '@/components/ui/Loading';
import { getDetailRouteValue } from '@/lib/shared/routeDetail';
import { createHorizonServer } from '@/services/horizon';

export default function LedgersPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const detailsSequence = getDetailRouteValue({
    pathname,
    searchParams,
    queryKey: 'sequence',
    aliases: ['/ledgers'],
  });
  const hasDetailsRoute = Boolean(detailsSequence);

  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (hasDetailsRoute) return;

    const loadLedgers = async () => {
      try {
        const server = createHorizonServer();
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
  }, [hasDetailsRoute]);

  if (hasDetailsRoute) {
    return <LedgerDetailsClientPage />;
  }

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
