'use client';

import { useEffect, useState } from 'react';
import { getMarketAssetsFromMarketV1 } from '@/lib/stellar';
import type { MarketAsset } from '@/lib/shared/interfaces';
import MarketsMobileView from '@/components/mobile/MarketsMobileView';
import MarketsDesktopView from '@/components/desktop/MarketsDesktopView';

const PAGE_SIZE = 50;

export default function MarketsPage() {
  const [pageAssets, setPageAssets] = useState<MarketAsset[]>([]);
  const [xlmPrice, setXlmPrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const result = await getMarketAssetsFromMarketV1(currentPage, PAGE_SIZE);
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
  }, [currentPage]);

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
