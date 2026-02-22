'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getMarketAssetsFromMarketV1 } from '@/lib/stellar';
import type { MarketAsset } from '@/lib/shared/interfaces';
import MarketsMobileView from '@/components/mobile/MarketsMobileView';
import MarketsDesktopView from '@/components/desktop/MarketsDesktopView';

const PAGE_SIZE = 30;

export default function MarketsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = (searchParams.get('q') || '').trim();

  const [pageAssets, setPageAssets] = useState<MarketAsset[]>([]);
  const [xlmPrice, setXlmPrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(urlQuery);

  useEffect(() => {
    if (urlQuery !== searchQuery) {
      setSearchQuery(urlQuery);
      setDebouncedSearchQuery(urlQuery);
    }
  }, [urlQuery]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 350);
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

  const searchFilters = useMemo(() => {
    const query = debouncedSearchQuery.trim();
    if (!query) return {};
    return { search: query };
  }, [debouncedSearchQuery]);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const result = await getMarketAssetsFromMarketV1(currentPage, PAGE_SIZE, searchFilters);
        if (cancelled) return;
        setPageAssets(result.assets);
        setTotalPages(result.totalPages);
        setTotalItems(result.totalItems);
        setHasNextPage(result.hasNext);
        setXlmPrice(result.xlmPrice);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load market data.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [currentPage, searchFilters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  if (!isLoading && error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Error loading markets</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Mobile View */}
      <div className="block md:hidden">
        <MarketsMobileView
          initialAssets={pageAssets}
          xlmPrice={xlmPrice}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          loading={isLoading}
          currentPage={currentPage}
          hasNextPage={hasNextPage}
          onPageChange={handlePageChange}
          totalPages={totalPages}
          totalItems={totalItems}
        />
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <MarketsDesktopView
          initialAssets={pageAssets}
          xlmPrice={xlmPrice}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          loading={isLoading}
          currentPage={currentPage}
          hasNextPage={hasNextPage}
          onPageChange={handlePageChange}
          totalPages={totalPages}
          totalItems={totalItems}
        />
      </div>
    </>
  );
}
