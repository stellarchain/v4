import { Suspense } from 'react';
import { getLedgers, getTransactions, getOperations, getNetworkStats, getMarketAssets, getXLMUSDPriceFromHorizon } from '@/lib/stellar';
import DesktopHomePage from '@/components/desktop/DesktopHomePage';
import StatsSection from '@/components/mobile/sections/StatsSection';
import TransactionsSection from '@/components/mobile/sections/TransactionsSection';
import StatsCardsSkeleton from '@/components/mobile/skeletons/StatsCardsSkeleton';
import TransactionsSkeleton from '@/components/mobile/skeletons/TransactionsSkeleton';

export const revalidate = 10;

// Desktop data fetching (still uses Promise.all for now)
async function DesktopData() {
  const [stats, ledgersResponse, transactionsResponse, operationsResponse, marketAssets, xlmPrice] = await Promise.all([
    getNetworkStats(),
    getLedgers(8),
    getTransactions(8),
    getOperations(50),
    getMarketAssets(),
    getXLMUSDPriceFromHorizon(),
  ]);

  const ledgers = ledgersResponse._embedded.records;
  const transactions = transactionsResponse._embedded.records;
  const operations = operationsResponse._embedded.records;
  const xlmAsset = marketAssets.find(a => a.rank === 1) || marketAssets[0];
  const xlmVolume = xlmAsset ? xlmAsset.volume_24h : 0;

  return (
    <DesktopHomePage
      stats={stats}
      initialTransactions={transactions}
      initialLedgers={ledgers}
      initialOperations={operations}
      xlmVolume={xlmVolume}
      xlmPrice={xlmPrice}
    />
  );
}

export default function HomePage() {
  return (
    <>
      {/* Mobile Homepage - Progressive Loading */}
      <div className="md:hidden min-h-screen bg-[var(--bg-primary)] pb-20">
        {/* Stats Cards - loads independently */}
        <Suspense fallback={<StatsCardsSkeleton />}>
          <StatsSection />
        </Suspense>

        {/* Transactions - loads independently */}
        <Suspense fallback={<TransactionsSkeleton />}>
          <TransactionsSection />
        </Suspense>
      </div>

      {/* Desktop Homepage */}
      <div className="hidden md:block w-full">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-blue)]" />
          </div>
        }>
          <DesktopData />
        </Suspense>
      </div>
    </>
  );
}
