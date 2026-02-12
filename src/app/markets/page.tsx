'use client';

import { useEffect, useState } from 'react';
import { getMarketAssets, getXLMUSDPriceFromHorizon } from '@/lib/stellar';
import MarketsMobileView from '@/components/mobile/MarketsMobileView';
import MarketsDesktopView from '@/components/desktop/MarketsDesktopView';

export default function MarketsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [xlmPrice, setXlmPrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  const fetchData = async (page: number) => {
    try {
      setIsLoading(true);
      const cursor = (page - 1) * 50; // 50 items per page
      const [assetsResult, priceData] = await Promise.all([
        getMarketAssets(cursor),
        getXLMUSDPriceFromHorizon(),
      ]);
      setAssets(assetsResult.assets);
      setHasNextPage(assetsResult.hasNext);
      setXlmPrice(priceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load market data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(currentPage);
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
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Mobile View */}
      <div className="block md:hidden">
        <MarketsMobileView
          initialAssets={assets}
          xlmPrice={xlmPrice}
          loading={isLoading}
          currentPage={currentPage}
          hasNextPage={hasNextPage}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <MarketsDesktopView
          initialAssets={assets}
          xlmPrice={xlmPrice}
          loading={isLoading}
          currentPage={currentPage}
          hasNextPage={hasNextPage}
          onPageChange={handlePageChange}
        />
      </div>
    </>
  );
}
