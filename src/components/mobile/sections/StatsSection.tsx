import { getNetworkStats, getMarketAssets, getXLMUSDPriceFromHorizon } from '@/lib/stellar';
import StatsCards from './StatsCards';

export default async function StatsSection() {
  const [stats, marketAssets, xlmPrice] = await Promise.all([
    getNetworkStats(),
    getMarketAssets(),
    getXLMUSDPriceFromHorizon(),
  ]);

  const xlmAsset = marketAssets.find(a => a.rank === 1) || marketAssets[0];
  const xlmVolume = xlmAsset ? xlmAsset.volume_24h : 0;

  return (
    <StatsCards
      stats={stats}
      xlmVolume={xlmVolume}
      xlmPrice={xlmPrice}
    />
  );
}
