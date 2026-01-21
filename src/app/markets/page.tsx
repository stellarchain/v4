import { getMarketAssets } from '@/lib/stellar';
import MarketsMobileView from '@/components/mobile/MarketsMobileView';
import MarketsDesktopView from '@/components/desktop/MarketsDesktopView';

export const revalidate = 60;

export default async function MarketsPage() {
  const assets = await getMarketAssets();

  return (
    <>
      {/* Mobile View */}
      <div className="block md:hidden">
        <MarketsMobileView initialAssets={assets} />
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <MarketsDesktopView initialAssets={assets} />
      </div>
    </>
  );
}
