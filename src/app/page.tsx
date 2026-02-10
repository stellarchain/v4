'use client';

import { useEffect, useState } from 'react';
import { Horizon } from '@stellar/stellar-sdk';
import { getBaseUrl, normalizeTransactions } from '@/lib/stellar';
import type { Ledger, Transaction, Operation, NetworkStats } from '@/lib/stellar';
import DesktopHomePage from '@/components/desktop/DesktopHomePage';
import StatsSection from '@/components/mobile/sections/StatsSection';
import TransactionsSection from '@/components/mobile/sections/TransactionsSection';
import Loading from '@/components/ui/Loading';
import { fetchStellarCoinData } from '@/services/api';

interface MarketAsset {
  rank: number;
  volume_24h: number;
}

interface XLMMarketData {
  price: number;
  priceChange24h: number;
  marketCap: number;
  marketCapChange24h: number;
  volume24h: number;
  circulatingSupply: number;
  totalSupply: number;
  dominance: number;
  rank: number;
  sparkline: number[];
  burnedLumens: number;
  sdfMandate: number;
  feePool: number;
  upgradeReserve: number;
}

export default function HomePage() {
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [xlmVolume, setXlmVolume] = useState<number>(0);
  const [xlmMarketData, setXlmMarketData] = useState<XLMMarketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const server = new Horizon.Server(getBaseUrl());

        // Fetch all data in parallel
        const [
          ledgersResponse,
          transactionsResponse,
          operationsResponse,
          paymentsResponse,
          stellarChainData
        ] = await Promise.all([
          server.ledgers().order('desc').limit(8).call(),
          server.transactions().order('desc').limit(8).call(),
          server.operations().order('desc').limit(30).call(),
          server.payments().order('desc').limit(20).call(),
          fetchStellarCoinData()
        ]);

        const marketAssets = stellarChainData.stellar_expert;
        const xlmMarketData = stellarChainData.coingecko_stellar;
        const globalMarketData = stellarChainData.coingecko_global;
        const networkSupply = stellarChainData.stellar_dashboard;

        const ledgersData = (ledgersResponse.records || []) as unknown as Ledger[];
        const transactionsData = normalizeTransactions(transactionsResponse.records || []);
        const rawOperations = (operationsResponse.records || []) as unknown as Operation[];
        const payments = (paymentsResponse.records || []) as unknown as Operation[];

        // Merge operations and payments, dedupe by id, sort by time
        const operationIds = new Set(rawOperations.map(op => op.id));
        const uniquePayments = payments.filter(p => !operationIds.has(p.id));
        const operationsData = [...rawOperations, ...uniquePayments]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Extract market data
        const xlmAsset = (marketAssets._embedded?.records || []).find((a: MarketAsset) => a.rank === 1) || (marketAssets._embedded?.records || [])[0];
        const xlmVol = xlmAsset ? xlmAsset.volume_24h : 0;

        // Get network stats from latest ledger
        const latestLedger = ledgersData[0];

        // Calculate dominance from global market data
        const totalCryptoMarketCap = globalMarketData?.data?.total_market_cap?.usd || 0;
        const xlmMarketCap = xlmMarketData.market_data?.market_cap?.usd || 0;
        const dominance = totalCryptoMarketCap > 0 ? (xlmMarketCap / totalCryptoMarketCap) * 100 : 0;

        // Extract supply data
        const totalCoins = networkSupply ? parseFloat(networkSupply.totalSupply) : 0;
        const availableCoins = networkSupply ? parseFloat(networkSupply.circulatingSupply) : 0;
        const burnedLumens = networkSupply ? parseFloat(networkSupply.burnedLumens) : 0;
        const sdfMandate = networkSupply ? parseFloat(networkSupply.sdfMandate) : 0;

        // Calculate network load from recent ledgers
        const totalTx = ledgersData.reduce((sum, l) => sum + l.successful_transaction_count + l.failed_transaction_count, 0);
        const avgTxPerLedger = ledgersData.length > 0 ? totalTx / ledgersData.length : 0;
        const ledgerCapacity = latestLedger.max_tx_set_size || 1000;
        const capacityUsage = ledgerCapacity > 0 ? avgTxPerLedger / ledgerCapacity : 0;

        const xlmData = xlmMarketData.market_data ? {
          price: xlmMarketData.market_data.current_price.usd,
          priceChange24h: xlmMarketData.market_data.price_change_percentage_24h,
          marketCap: xlmMarketData.market_data.market_cap.usd,
          marketCapChange24h: xlmMarketData.market_data.market_cap_change_percentage_24h || 0,
          volume24h: xlmMarketData.market_data.total_volume.usd,
          circulatingSupply: xlmMarketData.market_data.circulating_supply || 0,
          totalSupply: xlmMarketData.market_data.total_supply || 0,
          dominance,
          rank: xlmMarketData.market_cap_rank || 0,
          sparkline: xlmMarketData.market_data.sparkline_7d?.price || [],
          burnedLumens: burnedLumens,
          sdfMandate: sdfMandate,
          feePool: parseFloat(latestLedger.fee_pool) || 0,
          upgradeReserve: 0,
        } : null;
        const networkStats: NetworkStats = {
          ledger_count: latestLedger.sequence,
          latest_ledger: latestLedger,
          total_coins: latestLedger.total_coins,
          fee_pool: latestLedger.fee_pool,
          base_reserve: latestLedger.base_reserve_in_stroops,
          base_fee: latestLedger.base_fee_in_stroops,
          protocol_version: latestLedger.protocol_version,
          ledger_capacity_usage: capacityUsage,
        };

        setStats(networkStats);
        setLedgers(ledgersData);
        setTransactions(transactionsData);
        setOperations(operationsData);
        setXlmVolume(xlmVol);
        setXlmMarketData(xlmData);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return <Loading title="Loading homepage" description="Fetching network data and activity." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Homepage */}
      <div className="md:hidden min-h-screen bg-[var(--bg-primary)] pb-20">
        {stats && xlmMarketData && (
          <>
            <StatsSection
              stats={stats}
              xlmVolume={xlmVolume}
              xlmPrice={xlmMarketData.price}
            />
            <TransactionsSection transactions={transactions} />
          </>
        )}
      </div>

      {/* Desktop Homepage */}
      <div className="hidden md:block w-full">
        {stats && xlmMarketData && (
          <DesktopHomePage
            stats={stats}
            initialTransactions={transactions}
            initialLedgers={ledgers}
            initialOperations={operations}
            xlmVolume={xlmVolume}
            xlmMarketData={xlmMarketData}
          />
        )}
      </div>
    </>
  );
}
