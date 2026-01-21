import { getMarketAssets, getXLMUSDPriceFromHorizon } from '@/lib/stellar';
import MarketsMobileView from '@/components/mobile/MarketsMobileView';
import MarketsDesktopView from '@/components/desktop/MarketsDesktopView';

export const revalidate = 60;

export default async function MarketsPage() {
  const [assets, xlmPrice] = await Promise.all([
    getMarketAssets(),
    getXLMUSDPriceFromHorizon(),
  ]);

  return (
    <>
      {/* Mobile View */}
      <div className="block md:hidden">
        <MarketsMobileView initialAssets={assets} xlmPrice={xlmPrice} />
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <MarketsDesktopView initialAssets={assets} />
      </div>
    </>
  );
}
