'use client';

import { useEffect, useState } from 'react';
import { getMarketAssets, getXLMUSDPriceFromHorizon } from '@/lib/stellar';
import MarketsMobileView from '@/components/mobile/MarketsMobileView';
import MarketsDesktopView from '@/components/desktop/MarketsDesktopView';
import Loading from '@/components/ui/Loading';

export default function MarketsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [xlmPrice, setXlmPrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [assetsData, priceData] = await Promise.all([
          getMarketAssets(),
          getXLMUSDPriceFromHorizon(),
        ]);
        setAssets(assetsData);
        setXlmPrice(priceData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load market data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return <Loading title="Loading markets" description="Fetching market assets and prices." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Error loading markets</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile View */}
      <div className="block md:hidden">
        <MarketsMobileView initialAssets={assets} xlmPrice={xlmPrice} />
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <MarketsDesktopView initialAssets={assets} xlmPrice={xlmPrice} />
      </div>
    </>
  );
}
