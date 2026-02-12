'use client';

import { useEffect, useState } from 'react';
import type { LabeledAccountsAPIResponse } from '@/lib/stellar';
import KnownAccountsClient from './KnownAccountsClient';
import KnownAccountsDesktopView from '@/components/desktop/KnownAccountsDesktopView';
import Loading from '@/components/ui/Loading';

export default function KnownAccountsPage() {
  const [initialData, setInitialData] = useState<LabeledAccountsAPIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLabeledAccounts = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://api.stellarchain.dev/v1/accounts?page=1', {
          headers: { 'Accept': 'application/ld+json' }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch labeled accounts');
        }
        const data = await response.json();
        setInitialData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load known accounts');
        console.error('Error fetching labeled accounts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLabeledAccounts();
  }, []);

  if (loading) {
    return <Loading title="Loading known accounts" description="Fetching labeled accounts." />;
  }

  if (error || !initialData) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-red-400 mb-4">{error || 'Failed to load known accounts'}</div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile View */}
      <div className="block md:hidden">
        <KnownAccountsClient initialData={initialData} />
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <KnownAccountsDesktopView initialData={initialData} />
      </div>
    </>
  );
}
