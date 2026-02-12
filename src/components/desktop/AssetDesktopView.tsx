'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import AssetCandlestickChart from '@/components/AssetCandlestickChart';
import AssetOrderBook from '@/components/AssetOrderBook';
import GliderTabs from '@/components/ui/GliderTabs';
import { AssetDetails, AssetHolder, AssetTrade, AccountLabel, TradingPair, shortenAddress, timeAgo, getAssetHolders, getAssetTrades, getAccountLabels, getAssetTradingPairs, getLiquidityPoolByAssets, getOperation } from '@/lib/stellar';
import { getXLMHoldersAction } from '@/lib/helpers';

interface AssetDesktopViewProps {
  asset: AssetDetails;
  rank: number;
}

function formatNumber(num: number): string {
  if (num === 0 || isNaN(num)) return '0';
  const absNum = Math.abs(num);
  if (absNum >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (absNum >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (absNum >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (absNum >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatPrice(price: number): string {
  if (price >= 1000) return '$' + price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (price >= 1) return '$' + price.toFixed(2);
  if (price >= 0.01) return '$' + price.toFixed(4);
  if (price >= 0.0001) return '$' + price.toFixed(6);
  return '$' + price.toFixed(8);
}

function formatPriceShort(price: number): string {
  if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  if (price >= 0.0001) return price.toFixed(6);
  return price.toFixed(8);
}

type TabType = 'chart' | 'markets' | 'trades' | 'holders' | 'about';

export default function AssetDesktopView({ asset, rank }: AssetDesktopViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('chart');
  const [trades, setTrades] = useState<AssetTrade[]>([]);
  const [tradesCursor, setTradesCursor] = useState<string | null>(null);
  const [hasMoreTrades, setHasMoreTrades] = useState(false);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [loadingMoreTrades, setLoadingMoreTrades] = useState(false);

  const [holders, setHolders] = useState<AssetHolder[]>([]);
  const [holdersCursor, setHoldersCursor] = useState<string | null>(null);
  const [hasMoreHolders, setHasMoreHolders] = useState(false);
  const [loadingHolders, setLoadingHolders] = useState(false);
  const [loadingMoreHolders, setLoadingMoreHolders] = useState(false);
  const [holderLabels, setHolderLabels] = useState<Map<string, AccountLabel>>(new Map());

  const [tradingPairs, setTradingPairs] = useState<TradingPair[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);

  const [copied, setCopied] = useState(false);
  const [tradeTxMap, setTradeTxMap] = useState<Record<string, string>>({}); // opId → txHash

  // Converter state
  const [assetAmount, setAssetAmount] = useState<string>('1');
  const [usdAmount, setUsdAmount] = useState<string>(asset.price_usd.toFixed(asset.price_usd >= 1 ? 2 : 6));
  const [activeInput, setActiveInput] = useState<'asset' | 'usd'>('asset');

  useEffect(() => {
    if (activeInput === 'asset') {
      const amount = parseFloat(assetAmount) || 0;
      setUsdAmount((amount * asset.price_usd).toFixed(asset.price_usd >= 1 ? 2 : 6));
    }
  }, [assetAmount, asset.price_usd, activeInput]);

  useEffect(() => {
    if (activeInput === 'usd') {
      const amount = parseFloat(usdAmount) || 0;
      if (asset.price_usd > 0) {
        setAssetAmount((amount / asset.price_usd).toFixed(asset.price_usd >= 1 ? 4 : 2));
      }
    }
  }, [usdAmount, asset.price_usd, activeInput]);

  // Calculate price position in 24h range
  const priceRange = asset.price_high_24h - asset.price_low_24h;
  const pricePositionPercent = priceRange > 0
    ? ((asset.price_usd - asset.price_low_24h) / priceRange) * 100
    : 50;

  // Calculate supply percentage
  const supplyPercent = asset.total_supply > 0
    ? (asset.circulating_supply / asset.total_supply) * 100
    : 100;

  // Pre-fetch trading pairs on mount
  useEffect(() => {
    const fetchTradingPairs = async () => {
      setLoadingMarkets(true);
      try {
        const pairs = await getAssetTradingPairs(asset.code, asset.issuer);
        setTradingPairs(pairs);
      } catch (error) {
        console.error('Failed to fetch trading pairs:', error);
      }
      setLoadingMarkets(false);
    };
    fetchTradingPairs();
  }, [asset.code, asset.issuer]);

  // Fetch trades when trades tab is active
  useEffect(() => {
    if (activeTab !== 'trades' || trades.length > 0) return;

    const fetchTrades = async () => {
      setLoadingTrades(true);
      try {
        const PAGE_SIZE = 20;
        const data = await getAssetTrades(asset.code, asset.issuer || undefined, PAGE_SIZE, 'desc');
        const records = data.records || [];
        setTrades(records);
        if (records.length === PAGE_SIZE) {
          setTradesCursor(records[records.length - 1].paging_token);
          setHasMoreTrades(true);
        } else {
          setHasMoreTrades(false);
        }
      } catch (error) {
        console.error('Failed to fetch trades:', error);
      }
      setLoadingTrades(false);
    };

    fetchTrades();
  }, [activeTab, asset.code, asset.issuer, trades.length]);

  // Resolve operation IDs to transaction hashes for trade links
  useEffect(() => {
    if (trades.length === 0) return;
    const opIds = [...new Set(trades.map(t => t.id.split('-')[0]))];
    const newIds = opIds.filter(id => !tradeTxMap[id]);
    if (newIds.length === 0) return;

    const loadTradeTxMap = async () => {
      const results = await Promise.all(
        newIds.map(async (id) => {
          try {
            const op = await getOperation(id);
            return { id, hash: op.transaction_hash };
          } catch {
            return null;
          }
        })
      );
      const map: Record<string, string> = {};
      for (const r of results) {
        if (r) map[r.id] = r.hash;
      }
      setTradeTxMap(prev => ({ ...prev, ...map }));
    };

    void loadTradeTxMap();
  }, [trades]);

  const loadMoreTrades = async () => {
    if (!tradesCursor || loadingMoreTrades) return;
    setLoadingMoreTrades(true);
    try {
      const PAGE_SIZE = 20;
      const data = await getAssetTrades(asset.code, asset.issuer || undefined, PAGE_SIZE, 'desc', tradesCursor);
      const records = data.records || [];
      setTrades(prev => [...prev, ...records]);
      if (records.length === PAGE_SIZE) {
        setTradesCursor(records[records.length - 1].paging_token);
        setHasMoreTrades(true);
      } else {
        setTradesCursor(null);
        setHasMoreTrades(false);
      }
    } catch (error) {
      console.error('Failed to load more trades:', error);
    }
    setLoadingMoreTrades(false);
  };

  // Fetch holders when tab is active
  useEffect(() => {
    if (activeTab !== 'holders' || holders.length > 0) return;

    const isXLM = asset.code === 'XLM' && !asset.issuer;

    const fetchHolders = async () => {
      setLoadingHolders(true);
      try {
        let holdersData: AssetHolder[];
        let nextCursor: string | null | undefined;

        if (isXLM) {
          const result = await getXLMHoldersAction(25);
          holdersData = result.holders;
          nextCursor = result.nextCursor || null;
        } else {
          const result = await getAssetHolders(asset.code, asset.issuer!, 25);
          holdersData = result.holders;
          nextCursor = result.nextCursor;
        }

        setHolders(holdersData);
        setHoldersCursor(nextCursor ?? null);
        setHasMoreHolders(!!nextCursor);

        // Fetch account labels for holders
        if (holdersData.length > 0) {
          const addresses = holdersData.map(h => h.account_id);
          const labels = await getAccountLabels(addresses);
          setHolderLabels(labels);
        }
      } catch (error) {
        console.error('Failed to fetch holders:', error);
      }
      setLoadingHolders(false);
    };

    fetchHolders();
  }, [activeTab, asset.code, asset.issuer, holders.length]);

  const loadMoreHolders = async () => {
    if (!holdersCursor || loadingMoreHolders) return;
    setLoadingMoreHolders(true);
    try {
      const isXLM = asset.code === 'XLM' && !asset.issuer;
      let newHolders: AssetHolder[];
      let nextCursor: string | null | undefined;

      if (isXLM) {
        const result = await getXLMHoldersAction(25, holdersCursor);
        newHolders = result.holders;
        nextCursor = result.nextCursor || null;
      } else {
        const result = await getAssetHolders(asset.code, asset.issuer!, 25, holdersCursor);
        newHolders = result.holders;
        nextCursor = result.nextCursor;
      }

      setHolders(prev => [...prev, ...newHolders]);
      setHoldersCursor(nextCursor ?? null);
      setHasMoreHolders(!!nextCursor);

      // Fetch labels for new holders
      if (newHolders.length > 0) {
        const addresses = newHolders.map(h => h.account_id);
        const labels = await getAccountLabels(addresses);
        setHolderLabels(prev => {
          const merged = new Map(prev);
          labels.forEach((value, key) => merged.set(key, value));
          return merged;
        });
      }
    } catch (error) {
      console.error('Failed to load more holders:', error);
    }
    setLoadingMoreHolders(false);
  };

  const copyIssuer = () => {
    if (asset.issuer) {
      navigator.clipboard.writeText(asset.issuer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[1400px] px-4 py-4">
        {/* Main Grid: 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-4">
          {/* Left Column: all sidebar cards */}
          <div className="space-y-4 self-start">
            {/* Asset Header + Price */}
            <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-sm p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-50 rounded-full flex items-center justify-center overflow-hidden border border-sky-100">
                  {asset.image ? (
                    <Image src={asset.image} alt={asset.code} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                  ) : (
                    <span className="text-sky-600 font-bold text-sm">{asset.code.slice(0, 2)}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold text-[var(--text-primary)]">{asset.name}</h1>
                    <span className="text-[var(--text-muted)] text-sm font-medium">{asset.code}</span>
                    {rank > 0 && (
                      <span className="bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-[10px] font-bold px-1.5 py-0.5 rounded">
                        #{rank}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-[var(--text-primary)]">
                    {formatPrice(asset.price_usd)}
                  </span>
                  <span className={`text-sm font-medium ${asset.change_24h >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {asset.change_24h >= 0 ? '▲' : '▼'} {Math.abs(asset.change_24h).toFixed(2)}% (24h)
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-sm divide-y divide-[var(--border-subtle)]">
              {/* Market Cap */}
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[var(--text-tertiary)]">Market cap</span>
                  <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 16v-4m0-4h.01" />
                  </svg>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-[var(--text-primary)]">${formatNumber(asset.market_cap)}</span>
                  {asset.change_24h !== 0 && (
                    <span className={`ml-2 text-xs ${asset.change_24h >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {asset.change_24h >= 0 ? '▲' : '▼'} {Math.abs(asset.change_24h).toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Volume (24h) */}
              <div className="p-3 flex items-center justify-between">
                <span className="text-xs text-[var(--text-tertiary)]">Volume (24h)</span>
                <span className="font-semibold text-[var(--text-primary)]">${formatNumber(asset.volume_24h)}</span>
              </div>

              {/* Vol/Mkt Cap */}
              <div className="p-3 flex items-center justify-between">
                <span className="text-xs text-[var(--text-tertiary)]">Vol/Mkt Cap</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {asset.market_cap > 0 ? ((asset.volume_24h / asset.market_cap) * 100).toFixed(2) + '%' : '--'}
                </span>
              </div>

              {/* FDV */}
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[var(--text-tertiary)]">FDV</span>
                  <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 16v-4m0-4h.01" />
                  </svg>
                </div>
                <span className="font-semibold text-[var(--text-primary)]">
                  ${formatNumber(asset.total_supply * asset.price_usd)}
                </span>
              </div>

              {/* Total supply */}
              <div className="p-3 flex items-center justify-between">
                <span className="text-xs text-[var(--text-tertiary)]">Total supply</span>
                <span className="font-semibold text-[var(--text-primary)]">{formatNumber(asset.total_supply)} {asset.code}</span>
              </div>

              {/* Max. supply */}
              <div className="p-3 flex items-center justify-between">
                <span className="text-xs text-[var(--text-tertiary)]">Max. supply</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {asset.total_supply === asset.circulating_supply ? '∞' : formatNumber(asset.total_supply) + ' ' + asset.code}
                </span>
              </div>

              {/* Circulating Supply */}
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[var(--text-tertiary)]">Circulating supply</span>
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </span>
                  </div>
                  <span className="text-xs text-[var(--text-tertiary)]">{supplyPercent.toFixed(0)}%</span>
                </div>
                <div className="relative h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                  <div
                    className="absolute h-full bg-sky-500 rounded-full"
                    style={{ width: `${supplyPercent}%` }}
                  />
                </div>
                <div className="mt-1.5 font-semibold text-[var(--text-primary)]">{formatNumber(asset.circulating_supply)} {asset.code}</div>
              </div>
            </div>
            {/* Links Section */}
            {(asset.domain || asset.issuer) && (
              <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-sm p-3 space-y-3">
                {asset.domain && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--text-tertiary)]">Website</span>
                    <a
                      href={`https://${asset.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] rounded-lg text-xs font-medium text-[var(--text-secondary)] transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      {asset.domain}
                    </a>
                  </div>
                )}

                {asset.issuer && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-[var(--text-tertiary)]">Issuer</span>
                      <button
                        onClick={copyIssuer}
                        className="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors"
                        title="Copy issuer address"
                      >
                        {copied ? (
                          <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <Link
                      href={`/account/${asset.issuer}`}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] rounded-lg text-xs font-mono font-medium text-[var(--text-secondary)] transition-colors"
                    >
                      <div className="w-4 h-4 bg-sky-500 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" />
                        </svg>
                      </div>
                      {shortenAddress(asset.issuer)}
                    </Link>
                  </div>
                )}

                {/* Holders & Trades */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-xs text-[var(--text-tertiary)]">Holders</span>
                  <span className="font-semibold text-[var(--text-primary)]">{formatNumber(asset.holders)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-tertiary)]">Trades (24h)</span>
                  <span className="font-semibold text-[var(--text-primary)]">{formatNumber(asset.trades_24h)}</span>
                </div>
              </div>
            )}

            {/* Converter */}
            <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-sm p-3">
              <div className="flex items-center gap-1.5 mb-3">
                <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{asset.code} / USD Converter</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">You pay</label>
                <div className="flex items-center bg-[var(--bg-primary)] rounded-lg px-3 py-2.5 border border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 bg-sky-50 rounded-full flex items-center justify-center flex-shrink-0 border border-sky-100">
                      {asset.image ? (
                        <Image src={asset.image} alt={asset.code} width={24} height={24} className="w-full h-full object-cover rounded-full" unoptimized />
                      ) : (
                        <span className="text-sky-600 font-bold text-[9px]">{asset.code.slice(0, 2)}</span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{asset.code}</span>
                  </div>
                  <input
                    type="number"
                    value={assetAmount}
                    onChange={(e) => { setActiveInput('asset'); setAssetAmount(e.target.value); }}
                    className="text-right bg-transparent font-semibold text-[var(--text-primary)] flex-1 min-w-0 ml-2 outline-none! [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex justify-center py-1.5">
                <div className="w-6 h-6 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">You get</label>
                <div className="flex items-center bg-[var(--bg-primary)] rounded-lg px-3 py-2.5 border border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 bg-emerald-50 rounded-full flex items-center justify-center flex-shrink-0 border border-emerald-100">
                      <span className="text-emerald-600 font-bold text-[9px]">$</span>
                    </div>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">USD</span>
                  </div>
                  <input
                    type="number"
                    value={usdAmount}
                    onChange={(e) => { setActiveInput('usd'); setUsdAmount(e.target.value); }}
                    className="text-right bg-transparent font-semibold text-[var(--text-primary)] flex-1 min-w-0 ml-2 outline-none! [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="mt-2 text-center">
                <span className="text-[10px] text-[var(--text-muted)]">1 {asset.code} = {formatPrice(asset.price_usd)}</span>
              </div>
            </div>

            {/* Price Performance */}
            <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-sm p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--text-tertiary)]">Price performance</span>
                <span className="text-[10px] font-medium text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">24h</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] mb-1">
                <span>Low</span>
                <span>High</span>
              </div>
              <div className="relative h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden mb-1">
                <div className="absolute inset-0 bg-gradient-to-r from-rose-500 via-[var(--text-muted)] to-emerald-500" />
                <div
                  className="absolute w-2.5 h-2.5 bg-[var(--bg-secondary)] rounded-full top-1/2 -translate-y-1/2 shadow-md border-2 border-[var(--text-muted)]"
                  style={{ left: `${Math.min(Math.max(pricePositionPercent, 5), 95)}%`, transform: 'translate(-50%, -50%)' }}
                />
              </div>
              <div className="flex items-center justify-between text-sm font-medium text-[var(--text-secondary)]">
                <span>{formatPrice(asset.price_low_24h)}</span>
                <span>{formatPrice(asset.price_high_24h)}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Tabs + Chart/Content */}
          <div className="flex flex-col gap-4 min-w-0 overflow-hidden">
            {/* Tab Navigation */}
            <GliderTabs
              size="md"
              className="border-[var(--border-default)]"
              tabs={[
                { id: 'chart', label: 'Chart' },
                { id: 'markets', label: 'Markets' },
                { id: 'trades', label: 'Trades' },
                { id: 'holders', label: 'Holders' },
                { id: 'about', label: 'About' },
              ] as const}
              activeId={activeTab}
              onChange={setActiveTab}
            />

            {/* Tab Content */}
            {activeTab === 'chart' && (
              <div className="flex-1 min-h-0">
                <AssetCandlestickChart asset={asset} className="h-full" />
              </div>
            )}

            {activeTab === 'markets' && (
              <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-sm overflow-x-auto">
                <div className="p-4 border-b border-[var(--border-subtle)]">
                  <h3 className="font-semibold text-[var(--text-primary)]">{asset.name} Markets</h3>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">Trading pairs on Stellar DEX</p>
                </div>

                {loadingMarkets ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : tradingPairs.length === 0 ? (
                  <div className="text-center py-16 text-[var(--text-muted)]">
                    No trading pairs found
                  </div>
                ) : (
                  <table className="w-full sc-table">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                        <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-left">#</th>
                        <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-left">Pair</th>
                        <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-right">Price</th>
                        <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-right">24h Volume</th>
                        <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-right">24h Trades</th>
                        <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-right">24h Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--bg-primary)]">
                      {tradingPairs.map((pair, idx) => {
                        const handleClick = async () => {
                          const baseAsset = { code: asset.code, issuer: asset.issuer };
                          const counterAsset = { code: pair.counterAsset.code, issuer: pair.counterAsset.issuer };
                          const pool = await getLiquidityPoolByAssets(baseAsset, counterAsset);
                          if (pool) {
                            router.push(`/liquidity-pool/${pool.id}`);
                          } else {
                            const poolReversed = await getLiquidityPoolByAssets(counterAsset, baseAsset);
                            if (poolReversed) {
                              router.push(`/liquidity-pool/${poolReversed.id}`);
                            }
                          }
                        };

                        return (
                          <tr
                            key={`${pair.counterAsset.code}-${pair.counterAsset.issuer || 'native'}`}
                            className="hover:bg-sky-50/30 transition-colors cursor-pointer"
                            onClick={handleClick}
                          >
                            <td className="py-3 px-4 text-sm text-[var(--text-tertiary)]">{idx + 1}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-sky-600">{asset.code} / {pair.counterAsset.code}</span>
                                {pair.counterAsset.issuer && (
                                  <span className="text-[10px] text-[var(--text-muted)] font-mono">{shortenAddress(pair.counterAsset.issuer)}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-sm text-[var(--text-primary)]">
                              {formatPriceShort(pair.price)} {pair.counterAsset.code}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-sm text-[var(--text-secondary)]">
                              {formatNumber(pair.baseVolume24h)} {asset.code}
                            </td>
                            <td className="py-3 px-4 text-right text-sm text-[var(--text-secondary)]">
                              {pair.tradeCount24h.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={`text-sm font-medium ${pair.priceChange24h >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {pair.priceChange24h >= 0 ? '+' : ''}{pair.priceChange24h.toFixed(2)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'trades' && (
              <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-sm overflow-x-auto">
                <div className="p-4 border-b border-[var(--border-subtle)]">
                  <h3 className="font-semibold text-[var(--text-primary)]">{asset.name} Trades</h3>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">Recent trades on Stellar DEX</p>
                </div>

                {loadingTrades ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : trades.length === 0 ? (
                  <div className="text-center py-16 text-[var(--text-muted)]">
                    No recent trades found
                  </div>
                ) : (
                  <>
                    <table className="w-full sc-table">
                      <thead>
                        <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                          <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-left">Trade ID</th>
                          <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-left">Type</th>
                          <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-left">Pair</th>
                          <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-right">{asset.code} Amount</th>
                          <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-right">Counter Amount</th>
                          <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-right">Price</th>
                          <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-left">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--bg-primary)]">
                        {trades.map((trade, idx) => {
                          const baseCode = trade.base_asset_type === 'native' ? 'XLM' : (trade.base_asset_code || 'Unknown');
                          const counterCode = trade.counter_asset_type === 'native' ? 'XLM' : (trade.counter_asset_code || 'Unknown');
                          const baseAmount = parseFloat(trade.base_amount);
                          const counterAmount = parseFloat(trade.counter_amount);

                          // Determine if our asset is base or counter in this trade
                          const isBaseAsset = baseCode === asset.code;
                          const assetAmt = isBaseAsset ? baseAmount : counterAmount;
                          const counterAmt = isBaseAsset ? counterAmount : baseAmount;
                          const otherCode = isBaseAsset ? counterCode : baseCode;

                          // Price: how much of the counter asset per 1 unit of our asset
                          const pricePerUnit = assetAmt > 0 ? counterAmt / assetAmt : 0;

                          // Buy = someone bought our asset (base_is_seller means base sold, so our asset was bought if we are base)
                          const isBuy = isBaseAsset ? trade.base_is_seller : !trade.base_is_seller;

                          return (
                            <tr
                              key={trade.id}
                              className="hover:bg-sky-50/30 transition-colors"
                            >
                              <td className="py-3 px-4 text-sm">
                                {(() => {
                                  const opId = trade.id.split('-')[0];
                                  const txHash = tradeTxMap[opId];
                                  const href = txHash ? `/tx/${txHash}?op=${opId}` : `/operations/${opId}`;
                                  return (
                                    <Link href={href} className="text-sky-600 hover:text-sky-700 font-mono">
                                      {txHash ? `${txHash.slice(0, 6)}...${txHash.slice(-4)}` : `${opId.slice(0, 6)}...${opId.slice(-4)}`}
                                    </Link>
                                  );
                                })()}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  isBuy
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'bg-rose-50 text-rose-600'
                                }`}>
                                  {isBuy ? 'BUY' : 'SELL'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-sm font-medium text-sky-600">{asset.code}/{otherCode}</span>
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-sm text-[var(--text-primary)]">
                                {formatNumber(assetAmt)}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-sm text-[var(--text-secondary)]">
                                {formatNumber(counterAmt)} {otherCode}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-sm text-[var(--text-secondary)]">
                                {formatPriceShort(pricePerUnit)} {otherCode}
                              </td>
                              <td className="py-3 px-4 text-sm text-[var(--text-tertiary)]">
                                {timeAgo(trade.ledger_close_time)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {hasMoreTrades && (
                      <div className="p-4 border-t border-[var(--border-subtle)] flex justify-center">
                        <button
                          onClick={loadMoreTrades}
                          disabled={loadingMoreTrades}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-sky-600 hover:bg-sky-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {loadingMoreTrades ? (
                            <>
                              <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                              Loading...
                            </>
                          ) : (
                            'Load More Trades'
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'holders' && (
              <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-sm overflow-x-auto">
                <div className="p-4 border-b border-[var(--border-subtle)]">
                  <h3 className="font-semibold text-[var(--text-primary)]">Top {asset.code} Holders</h3>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">{formatNumber(asset.holders)} total holders</p>
                </div>

                {!asset.issuer ? (
                  <div className="text-center py-16 text-[var(--text-muted)]">
                    XLM holders are not tracked
                  </div>
                ) : loadingHolders ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : holders.length === 0 ? (
                  <div className="text-center py-16 text-[var(--text-muted)]">
                    No holders found
                  </div>
                ) : (
                  <>
                    <table className="w-full sc-table">
                      <thead>
                        <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                          <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-left w-12">#</th>
                          <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-left">Address</th>
                          <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-right">Balance</th>
                          <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-right">% of Supply</th>
                          <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-right">Value (USD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {holders.map((holder, index) => {
                          const balance = parseFloat(holder.balance);
                          const percentage = asset.total_supply > 0 ? (balance / asset.total_supply) * 100 : 0;
                          const valueUSD = balance * asset.price_usd;
                          const label = holderLabels.get(holder.account_id);

                          return (
                            <tr
                              key={holder.account_id}
                              className="hover:bg-sky-50/30 transition-colors cursor-pointer"
                              onClick={() => router.push(`/account/${holder.account_id}`)}
                            >
                              <td className="py-3 px-4 text-[var(--text-tertiary)] text-sm">{index + 1}</td>
                              <td className="py-3 px-4">
                                {label ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-medium text-sky-600 hover:underline">
                                      {label.name}
                                    </span>
                                    {label.verified && (
                                      <svg className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                    {label.org_name && (
                                      <span className="text-xs text-[var(--text-muted)]">({label.org_name})</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="font-mono text-sm text-sky-600 hover:underline">
                                    {shortenAddress(holder.account_id)}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-sm text-[var(--text-primary)]">
                                {formatNumber(balance)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-16 bg-[var(--bg-tertiary)] rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className="bg-sky-500 h-1.5 rounded-full"
                                      style={{ width: `${Math.min(percentage * 2, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-sm text-[var(--text-secondary)] w-14 text-right">{percentage.toFixed(2)}%</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right text-sm text-[var(--text-secondary)]">
                                ${formatNumber(valueUSD)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {hasMoreHolders && (
                      <div className="p-4 border-t border-[var(--border-subtle)] flex justify-center">
                        <button
                          onClick={loadMoreHolders}
                          disabled={loadingMoreHolders}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-sky-600 hover:bg-sky-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {loadingMoreHolders ? (
                            <>
                              <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                              Loading...
                            </>
                          ) : (
                            'Load More Holders'
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-4">
                {asset.description ? (
                  <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-sm p-4">
                    <h3 className="font-semibold text-[var(--text-primary)] mb-3">About {asset.name}</h3>
                    <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                      {asset.description}
                    </p>
                  </div>
                ) : (
                  <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-sm p-4">
                    <h3 className="font-semibold text-[var(--text-primary)] mb-3">About {asset.name}</h3>
                    <p className="text-[var(--text-muted)] text-sm">
                      No description available for this asset.
                    </p>
                  </div>
                )}

                {/* Price Performance Grid */}
                <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-[var(--border-subtle)]">
                    <h3 className="font-semibold text-[var(--text-primary)]">Price Performance</h3>
                  </div>
                  <div className="grid grid-cols-5 divide-x divide-[var(--border-subtle)]">
                    {[
                      { label: '1 Hour', value: asset.change_1h },
                      { label: '24 Hours', value: asset.change_24h },
                      { label: '7 Days', value: asset.change_7d },
                      { label: '30 Days', value: asset.change_30d || 0 },
                      { label: '1 Year', value: asset.change_1y || 0 },
                    ].map((item) => (
                      <div key={item.label} className="text-center py-4 px-3">
                        <p className="text-[11px] text-[var(--text-muted)] uppercase mb-1">{item.label}</p>
                        <p className={`text-sm font-bold ${item.value >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {item.value >= 0 ? '+' : ''}{item.value?.toFixed(2)}%
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Info */}
                <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-sm p-4">
                  <h3 className="font-semibold text-[var(--text-primary)] mb-3">Asset Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[var(--text-tertiary)]">Asset Code</span>
                      <p className="font-medium text-[var(--text-primary)]">{asset.code}</p>
                    </div>
                    {asset.issuer && (
                      <div>
                        <span className="text-[var(--text-tertiary)]">Issuer</span>
                        <p className="font-mono text-sky-600 text-xs">{shortenAddress(asset.issuer)}</p>
                      </div>
                    )}
                    {asset.domain && (
                      <div>
                        <span className="text-[var(--text-tertiary)]">Home Domain</span>
                        <p className="font-medium text-[var(--text-primary)]">{asset.domain}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-[var(--text-tertiary)]">Rating</span>
                      <p className="font-medium text-[var(--text-primary)]">{asset.rating}/5</p>
                    </div>
                    {asset.all_time_high && (
                      <div>
                        <span className="text-[var(--text-tertiary)]">All-Time High</span>
                        <p className="font-medium text-emerald-600">{formatPrice(asset.all_time_high)}</p>
                      </div>
                    )}
                    {asset.all_time_low && (
                      <div>
                        <span className="text-[var(--text-tertiary)]">All-Time Low</span>
                        <p className="font-medium text-rose-600">{formatPrice(asset.all_time_low)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Order Book (chart tab only) */}
            {activeTab === 'chart' && (
              <div className="min-w-0 overflow-hidden">
                <AssetOrderBook asset={asset} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
