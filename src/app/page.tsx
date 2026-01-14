import { getLedgers, getTransactions, getOperations, getNetworkStats, formatXLM, formatStroopsToXLM, getMarketAssets, getXLMUSDPriceFromHorizon } from '@/lib/stellar';
import StatsCard from '@/components/StatsCard';
import LiveLedgerFeed from '@/components/LiveLedgerFeed';
import LiveTransactionFeed from '@/components/LiveTransactionFeed';
import LiveOperationFeed from '@/components/LiveOperationFeed';
import MobileHomePage from '@/components/mobile/MobileHomePage';
import DesktopHomePage from '@/components/desktop/DesktopHomePage';
import Link from 'next/link';

export const revalidate = 10;

export default async function HomePage() {
  const [stats, ledgersResponse, transactionsResponse, operationsResponse, marketAssets, xlmPrice] = await Promise.all([
    getNetworkStats(),
    getLedgers(8),
    getTransactions(8),
    getOperations(8),
    getMarketAssets(),
    getXLMUSDPriceFromHorizon(),
  ]);

  const ledgers = ledgersResponse._embedded.records;
  const transactions = transactionsResponse._embedded.records;
  const operations = operationsResponse._embedded.records;

  // Find XLM asset for volume
  const xlmAsset = marketAssets.find(a => a.rank === 1) || marketAssets[0];
  const xlmVolume = xlmAsset ? xlmAsset.volume_24h : 0;

  return (
    <>
      {/* Mobile Homepage */}
      <div className="md:hidden">
        <MobileHomePage
          stats={stats}
          initialTransactions={transactions}
          xlmVolume={xlmVolume}
          xlmPrice={xlmPrice}
        />
      </div>

      {/* Desktop Homepage */}
      <div className="hidden md:block w-full">
        <DesktopHomePage
          stats={stats}
          initialTransactions={transactions}
          initialLedgers={ledgers}
          initialOperations={operations}
          xlmVolume={xlmVolume}
          xlmPrice={xlmPrice}
        />
      </div>
    </>
  );
}
