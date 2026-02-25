'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { LabeledAccountsAPIResponse } from '@/lib/stellar';
import KnownAccountsClient from './KnownAccountsClient';
import KnownAccountsDesktopView from '@/components/desktop/KnownAccountsDesktopView';
import Loading from '@/components/ui/Loading';
import { apiEndpoints, getApiData, getApiV1Data } from '@/services/api';

const ITEMS_PER_PAGE = 30;

export default function KnownAccountsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = (searchParams.get('q') || '').trim();
  const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const [initialData, setInitialData] = useState<LabeledAccountsAPIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [xlmPriceUsd, setXlmPriceUsd] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(urlQuery);
  const [currentPage, setCurrentPage] = useState(urlPage);

  // Sync from URL on back/forward navigation
  useEffect(() => {
    if (urlQuery !== searchQuery) {
      setSearchQuery(urlQuery);
      setDebouncedSearchQuery(urlQuery);
    }
    if (urlPage !== currentPage) {
      setCurrentPage(urlPage);
    }
  }, [urlQuery, urlPage]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when search changes (skip initial mount)
  const searchMountedRef = useRef(false);
  useEffect(() => {
    if (!searchMountedRef.current) {
      searchMountedRef.current = true;
      return;
    }
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  // Sync search + page to URL
  useEffect(() => {
    const currentQ = (searchParams.get('q') || '').trim();
    const currentP = parseInt(searchParams.get('page') || '1', 10) || 1;
    if (currentQ === debouncedSearchQuery && currentP === currentPage) return;

    const params = new URLSearchParams();
    if (debouncedSearchQuery) {
      params.set('q', debouncedSearchQuery);
    }
    if (currentPage > 1) {
      params.set('page', String(currentPage));
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [debouncedSearchQuery, currentPage, router, pathname, searchParams]);

  // Fetch data when page or search changes
  useEffect(() => {
    const fetchLabeledAccounts = async () => {
      try {
        setLoading(true);
        const query = debouncedSearchQuery;
        const isAddressQuery = /^(G|C)[A-Z0-9]{10,}$/.test(query.toUpperCase());
        const params: Record<string, string | number> = {
          page: currentPage,
          itemsPerPage: ITEMS_PER_PAGE,
          'order[label]': 'asc',
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
  }, [debouncedSearchQuery, currentPage]);

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

  const totalItems = initialData?.totalItems || 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading && !initialData) {
    return <Loading title="Loading known accounts" description="Fetching labeled accounts." />;
  }

  if (error && !initialData) {
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
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <KnownAccountsDesktopView
          initialData={initialData}
          xlmPriceUsd={xlmPriceUsd}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={handlePageChange}
        />
      </div>
    </>
  );
}
