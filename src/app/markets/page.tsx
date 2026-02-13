'use client';

import { useEffect, useState } from 'react';
import { getMarketAssetsFromV1, getXLMUSDPriceFromHorizon } from '@/lib/stellar';
import MarketsMobileView from '@/components/mobile/MarketsMobileView';
import MarketsDesktopView from '@/components/desktop/MarketsDesktopView';

export default function MarketsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [xlmPrice, setXlmPrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchData = async (page: number) => {
    try {
      setIsLoading(true);
      // Fetch XLM price first (or use cached), then fetch assets with it
      const priceData = await getXLMUSDPriceFromHorizon();
      setXlmPrice(priceData);

      const result = await getMarketAssetsFromV1(page, priceData);

      // For page 1, override XLM with CoinGecko data if we want more accurate stats
      // The v1 API already provides good data so we use it as-is

      setAssets(result.assets);
      setTotalPages(result.totalPages);
      setTotalItems(result.totalItems);
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
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasNextPage = currentPage < totalPages;

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
          totalPages={totalPages}
          totalItems={totalItems}
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
          totalPages={totalPages}
          totalItems={totalItems}
        />
      </div>
    </>
  );
}
