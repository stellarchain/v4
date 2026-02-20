'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { LabeledAccountsAPIResponse } from '@/lib/stellar';
import KnownAccountsClient from './KnownAccountsClient';
import KnownAccountsDesktopView from '@/components/desktop/KnownAccountsDesktopView';
import Loading from '@/components/ui/Loading';
import { apiEndpoints, getApiData, getApiV1Data } from '@/services/api';

export default function KnownAccountsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = (searchParams.get('q') || '').trim();

  const [initialData, setInitialData] = useState<LabeledAccountsAPIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [xlmPriceUsd, setXlmPriceUsd] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(urlQuery);

  useEffect(() => {
    if (urlQuery !== searchQuery) {
      setSearchQuery(urlQuery);
      setDebouncedSearchQuery(urlQuery);
    }
  }, [urlQuery]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const currentQ = (searchParams.get('q') || '').trim();
    if (currentQ === debouncedSearchQuery) return;

    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearchQuery) {
      params.set('q', debouncedSearchQuery);
    } else {
      params.delete('q');
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [debouncedSearchQuery, router, pathname, searchParams]);

  useEffect(() => {
    const fetchLabeledAccounts = async () => {
      try {
        setLoading(true);
        const query = debouncedSearchQuery;
        const isAddressQuery = /^(G|C)[A-Z0-9]{10,}$/.test(query.toUpperCase());
        const params: Record<string, string | number> = {
          page: 1,
          itemsPerPage: 30,
          'order[accountMetric.rankPosition]': 'asc',
        };
        if (query) {
          if (isAddressQuery) {
            params.address = query;
          } else {
            params.label = query;
          }
        }

        const data = await getApiV1Data(apiEndpoints.v1.accounts(params));
        setInitialData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load known accounts');
        console.error('Error fetching labeled accounts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLabeledAccounts();
  }, [debouncedSearchQuery]);

  useEffect(() => {
    let active = true;
    getApiData('/api/coins/stellar')
      .then((data: any) => {
        const price = Number(data?.coingecko_stellar?.market_data?.current_price?.usd || 0);
        if (active) setXlmPriceUsd(price > 0 ? price : null);
      })
      .catch(() => {
        if (active) setXlmPriceUsd(null);
      });
    return () => {
      active = false;
    };
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
        <KnownAccountsClient
          initialData={initialData}
          xlmPriceUsd={xlmPriceUsd}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
        />
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <KnownAccountsDesktopView
          initialData={initialData}
          xlmPriceUsd={xlmPriceUsd}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
        />
      </div>
    </>
  );
}
