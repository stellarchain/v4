'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Horizon } from '@stellar/stellar-sdk';
import { normalizeTransactions } from '@/lib/stellar';
import type { Ledger, Transaction, Operation, NetworkStats } from '@/lib/stellar';
import DesktopHomePage from '@/components/desktop/DesktopHomePage';
import StatsSection from '@/components/mobile/sections/StatsSection';
import TransactionsSection from '@/components/mobile/sections/TransactionsSection';
import { fetchMarketOverviewData, fetchStellarCoinData } from '@/services/api';
import { createHorizonServer } from '@/services/horizon';

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

interface MarketOverviewSnapshot {
  id: number;
  network: number;
  xlmPriceUsd: string;
  xlmVolume24h: string;
  totalTrades24h: string;
  activeAssets24h: number;
  trackedAssets: number;
  totalAccounts: number;
  totalContracts: number;
  recordedAt: string;
}

interface MarketOverviewResponse {
  member?: MarketOverviewSnapshot[];
}

const TRANSACTION_STREAM_LIMIT = 8;
const HOME_INTERNAL_LINKS = [
  { href: '/markets', label: 'Markets' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/ledgers', label: 'Ledgers' },
  { href: '/accounts', label: 'Accounts' },
  { href: '/contracts', label: 'Smart Contracts' },
  { href: '/liquidity-pools', label: 'Liquidity Pools' },
  { href: '/assets', label: 'Assets' },
  { href: '/projects', label: 'Projects' },
  { href: '/news', label: 'News' },
] as const;
const HOME_CHANGELOGS = [
  {
    version: 'v4.7.2',
    date: '2026-03-01',
    summary: 'Fixed contract transaction direction and amount rendering so sender/receiver flows display correctly.',
  },
  {
    version: 'v4.7.1',
    date: '2026-02-27',
    summary: 'Added installable PWA support with web manifest, service worker registration, and app icons.',
  },
  {
    version: 'v4.7.0',
    date: '2026-02-27',
    summary: 'Added cookie consent and richer social sharing metadata for better link previews on bots and messengers.',
  },
] as const;

export default function HomePage() {
  const emptyLedger: Ledger = {
    id: '',
    paging_token: '',
    hash: '',
    prev_hash: '',
    sequence: 0,
    successful_transaction_count: 0,
    failed_transaction_count: 0,
    operation_count: 0,
    tx_set_operation_count: 0,
    closed_at: new Date(0).toISOString(),
    total_coins: '0',
    fee_pool: '0',
    base_fee_in_stroops: 100,
    base_reserve_in_stroops: 5000000,
    max_tx_set_size: 1000,
    protocol_version: 0,
    header_xdr: '',
  };

  const emptyStats: NetworkStats = {
    ledger_count: 0,
    latest_ledger: emptyLedger,
    total_coins: '0',
    fee_pool: '0',
    base_fee: 100,
    base_reserve: 5000000,
    protocol_version: 0,
    ledger_capacity_usage: 0,
  };

  const emptyXlmMarketData: XLMMarketData = {
    price: 0,
    priceChange24h: 0,
    marketCap: 0,
    marketCapChange24h: 0,
    volume24h: 0,
    circulatingSupply: 0,
    totalSupply: 0,
    dominance: 0,
    rank: 0,
    sparkline: [],
    burnedLumens: 0,
    sdfMandate: 0,
    feePool: 0,
    upgradeReserve: 0,
  };

  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [xlmVolume, setXlmVolume] = useState<number>(0);
  const [xlmMarketData, setXlmMarketData] = useState<XLMMarketData | null>(null);
  const [marketOverview, setMarketOverview] = useState<MarketOverviewSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeChangelog, setActiveChangelog] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      const safeRequest = async <T,>(promise: Promise<T>, fallback: T, label: string): Promise<T> => {
        try {
          return await promise;
        } catch (requestError) {
          console.warn(`Homepage ${label} request failed, using fallback:`, requestError);
          return fallback;
        }
      };
      const emptyCollectionPage = <T extends Horizon.HorizonApi.BaseResponse,>(): Horizon.ServerApi.CollectionPage<T> => ({
        records: [],
        next: async () => emptyCollectionPage<T>(),
        prev: async () => emptyCollectionPage<T>(),
      });

      try {
        const server = createHorizonServer();
        const stellarCoinDataPromise = fetchStellarCoinData().catch((coinError) => {
          console.warn('Homepage coin data fetch failed, continuing with core network data:', coinError);
          return null;
        });
        const marketOverviewPromise = fetchMarketOverviewData({ network: 'mainnet' }).catch((overviewError) => {
          console.warn('Homepage market overview fetch failed, continuing without compare cards:', overviewError);
          return null;
        });

        // Fetch all data in parallel
        const [
          ledgersResponse,
          transactionsResponse,
          operationsResponse,
          paymentsResponse,
          stellarChainData,
          marketOverviewData
        ] = await Promise.all([
          safeRequest(server.ledgers().order('desc').limit(8).call(), emptyCollectionPage<Horizon.ServerApi.LedgerRecord>(), 'ledgers'),
          safeRequest(server.transactions().order('desc').limit(8).call(), emptyCollectionPage<Horizon.ServerApi.TransactionRecord>(), 'transactions'),
          safeRequest(server.operations().order('desc').limit(30).call(), emptyCollectionPage<Horizon.ServerApi.OperationRecord>(), 'operations'),
          safeRequest(server.payments().order('desc').limit(20).call(), emptyCollectionPage<Horizon.ServerApi.PaymentOperationRecord>(), 'payments'),
          stellarCoinDataPromise,
          marketOverviewPromise
        ]);

        const marketAssets = stellarChainData?.stellar_expert;
        const xlmMarketData = stellarChainData?.coingecko_stellar;
        const globalMarketData = stellarChainData?.coingecko_global;
        const networkSupply = stellarChainData?.stellar_dashboard;
        const overviewSnapshot = (marketOverviewData as MarketOverviewResponse | null)?.member?.[0] || null;

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
        const xlmAsset = (marketAssets?._embedded?.records || []).find((a: MarketAsset) => a.rank === 1) || (marketAssets?._embedded?.records || [])[0];
        const xlmVol = xlmAsset ? xlmAsset.volume_24h : 0;

        // Get network stats from latest ledger
        const latestLedger = ledgersData[0] || emptyLedger;

        // Calculate dominance from global market data
        const totalCryptoMarketCap = globalMarketData?.data?.total_market_cap?.usd || 0;
        const xlmMarketCap = xlmMarketData?.market_data?.market_cap?.usd || 0;
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

        const xlmData = xlmMarketData?.market_data ? {
          price: xlmMarketData.market_data.current_price?.usd || 0,
          priceChange24h: xlmMarketData.market_data.price_change_percentage_24h || 0,
          marketCap: xlmMarketData.market_data.market_cap?.usd || 0,
          marketCapChange24h: xlmMarketData.market_data.market_cap_change_percentage_24h || 0,
          volume24h: xlmMarketData.market_data.total_volume?.usd || 0,
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
        setMarketOverview(overviewSnapshot);
        setError(null);
        setIsLoading(false);
      } catch (err) {
        console.error('Homepage load failed; rendering with safe defaults:', err);
        setError(null);
        setStats(emptyStats);
        setLedgers([]);
        setTransactions([]);
        setOperations([]);
        setXlmVolume(0);
        setXlmMarketData(emptyXlmMarketData);
        setMarketOverview(null);
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const server = createHorizonServer();
    const closeStream = server
      .transactions()
      .order('desc')
      .cursor('now')
      .stream({
        onmessage: (tx: Horizon.ServerApi.TransactionRecord) => {
          setTransactions((prev) => {
            if (prev.some((item) => item.id === tx.id)) {
              return prev;
            }
            const normalized = normalizeTransactions([tx])[0];
            const updated = [normalized, ...prev];
            return updated.slice(0, TRANSACTION_STREAM_LIMIT);
          });
        },
        onerror: (err) => {
          console.error('Transaction stream error:', err);
        },
      });

    return () => {
      closeStream();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveChangelog((prev) => (prev + 1) % HOME_CHANGELOGS.length);
    }, 4500);

    return () => {
      clearInterval(timer);
    };
  }, []);

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
      {/*
        Keep the full interface visible while data loads.
        Values are skeletonized in child components.
      */}
      {(() => {
        const resolvedStats = stats ?? emptyStats;
        const resolvedXlm = xlmMarketData ?? emptyXlmMarketData;

        return (
          <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      <h1 className="sr-only">StellarChain Explorer</h1>
      <div className="flex-1">
        {/* Mobile Homepage */}
        <div className="md:hidden pb-20">
          <StatsSection
            stats={resolvedStats}
            xlmVolume={resolvedXlm.volume24h || xlmVolume}
            xlmPrice={resolvedXlm.price}
            marketOverview={marketOverview}
            loading={isLoading}
          />
          <TransactionsSection transactions={transactions} />
        </div>

        {/* Desktop Homepage */}
        <div className="hidden md:block w-full">
          <DesktopHomePage
            stats={resolvedStats}
            initialTransactions={transactions}
            initialLedgers={ledgers}
            initialOperations={operations}
            xlmVolume={xlmVolume}
            xlmMarketData={resolvedXlm}
            marketOverview={marketOverview}
            loading={isLoading}
          />
        </div>
      </div>

      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] pb-24 pt-5 md:pb-8">
        <div className="mx-auto grid w-full max-w-[1400px] gap-4 px-4 md:grid-cols-[1fr_320px] md:items-start">
          <div>
            <h2 className="mt-5 text-sm font-semibold text-[var(--text-primary)]">
              Stellar Blockchain Explorer for XLM Transactions, Ledgers, Accounts, Markets, and Assets
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-tertiary)]">
              StellarChain Explorer helps you track live Stellar blockchain activity in one place. You can inspect
              transactions, follow latest ledgers, analyze account balances, review smart contract activity, and monitor
              XLM market data with real-time updates. Use this explorer to search transaction hashes, account addresses,
              asset issuers, and network events across key sections like markets, contracts, liquidity pools, and
              projects. If you need a fast Stellar explorer focused on transparent on-chain data, this page is your
              starting point for research, monitoring, and discovery.
            </p>
            <h2 className="mt-4 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Explore</h2>
            <h3 className="mt-1 text-[11px] font-medium text-[var(--text-tertiary)]">
              Browse key sections: markets, transactions, ledgers, accounts, and ecosystem pages.
            </h3>
            <nav aria-label="Homepage quick links" className="mt-4 flex flex-wrap gap-2">
              {HOME_INTERNAL_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <aside className="mt-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 md:mt-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Changelog</h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveChangelog((prev) => (prev - 1 + HOME_CHANGELOGS.length) % HOME_CHANGELOGS.length)}
                  className="rounded-md border border-[var(--border-default)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                  aria-label="Previous changelog"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChangelog((prev) => (prev + 1) % HOME_CHANGELOGS.length)}
                  className="rounded-md border border-[var(--border-default)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                  aria-label="Next changelog"
                >
                  Next
                </button>
              </div>
            </div>
            <div className="mt-3 min-h-[132px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3">
              <p className="text-xs font-semibold text-[var(--info)]">{HOME_CHANGELOGS[activeChangelog].version}</p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">{HOME_CHANGELOGS[activeChangelog].date}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]">{HOME_CHANGELOGS[activeChangelog].summary}</p>
            </div>
            <div className="mt-3 flex items-center justify-center gap-1">
              {HOME_CHANGELOGS.map((item, idx) => (
                <button
                  key={item.version}
                  type="button"
                  onClick={() => setActiveChangelog(idx)}
                  aria-label={`Open ${item.version}`}
                  className={`h-1.5 rounded-full transition-all ${idx === activeChangelog ? 'w-5 bg-[var(--info)]' : 'w-2 bg-[var(--border-default)]'}`}
                />
              ))}
            </div>
          </aside>
        </div>
      </footer>
          </div>
        );
      })()}
    </>
  );
}
