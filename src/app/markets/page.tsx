'use client';

import { useEffect, useState } from 'react';
import { getMarketAssets } from '@/lib/stellar';
import MarketsMobileView from '@/components/mobile/MarketsMobileView';
import MarketsDesktopView from '@/components/desktop/MarketsDesktopView';

const PAGE_SIZE = 30;

export default function MarketsPage() {
  const [allAssets, setAllAssets] = useState<any[]>([]);
  const [xlmPrice, setXlmPrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const result = await getMarketAssets();
        if (cancelled) return;

        const xlmAsset = result.assets.find(a => a.code === 'XLM' && !a.issuer);
        if (xlmAsset) {
          setXlmPrice(xlmAsset.price_usd);
        }

        // Re-rank assets sequentially
        result.assets.forEach((a, i) => { a.rank = i + 1; });
        setAllAssets(result.assets);
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
  }, []);

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

  const totalPages = Math.max(1, Math.ceil(allAssets.length / PAGE_SIZE));
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageAssets = allAssets.slice(start, start + PAGE_SIZE);
  const hasNextPage = currentPage < totalPages;

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
          totalItems={allAssets.length}
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
          totalItems={allAssets.length}
        />
      </div>
    </>
  );
}
