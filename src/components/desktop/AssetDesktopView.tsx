'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import AssetCandlestickChart from '@/components/AssetCandlestickChart';
import AssetOrderBook from '@/components/AssetOrderBook';
import { AssetDetails, shortenAddress, getBaseUrl, timeAgo } from '@/lib/stellar';

interface AssetDesktopViewProps {
  asset: AssetDetails;
  rank: number;
}

interface Trade {
  id: string;
  paging_token: string;
  ledger_close_time: string;
  base_account: string;
  base_amount: string;
  base_asset_type: string;
  base_asset_code?: string;
  base_asset_issuer?: string;
  counter_account: string;
  counter_amount: string;
  counter_asset_type: string;
  counter_asset_code?: string;
  counter_asset_issuer?: string;
  base_is_seller: boolean;
  price: { n: number; d: number };
}

interface Holder {
  account_id: string;
  balance: string;
  label?: { name: string; verified: boolean };
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

type TabType = 'chart' | 'markets' | 'holders' | 'about';

export default function AssetDesktopView({ asset, rank }: AssetDesktopViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('chart');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [holders, setHolders] = useState<Holder[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [loadingHolders, setLoadingHolders] = useState(false);
  const [copied, setCopied] = useState(false);

  // Converter state
  const [assetAmount, setAssetAmount] = useState<string>('1');
  const [usdAmount, setUsdAmount] = useState<string>(asset.price_usd.toFixed(asset.price_usd >= 1 ? 2 : 6));

  useEffect(() => {
    const amount = parseFloat(assetAmount) || 0;
    setUsdAmount((amount * asset.price_usd).toFixed(asset.price_usd >= 1 ? 2 : 6));
  }, [assetAmount, asset.price_usd]);

  // Calculate price position in 24h range
  const priceRange = asset.price_high_24h - asset.price_low_24h;
  const pricePositionPercent = priceRange > 0
    ? ((asset.price_usd - asset.price_low_24h) / priceRange) * 100
    : 50;

  // Calculate supply percentage
  const supplyPercent = asset.total_supply > 0
    ? (asset.circulating_supply / asset.total_supply) * 100
    : 100;

  // Fetch trades when markets tab is active
  useEffect(() => {
    if (activeTab !== 'markets' || trades.length > 0) return;

    const fetchTrades = async () => {
      setLoadingTrades(true);
      try {
        const isXLM = asset.code === 'XLM' && !asset.issuer;
        let url: string;

        if (isXLM) {
          url = `${getBaseUrl()}/trades?base_asset_type=native&limit=50&order=desc`;
        } else {
          const assetType = asset.code.length <= 4 ? 'credit_alphanum4' : 'credit_alphanum12';
          url = `${getBaseUrl()}/trades?base_asset_type=${assetType}&base_asset_code=${asset.code}&base_asset_issuer=${asset.issuer}&limit=50&order=desc`;
        }

        const res = await fetch(url);
        const data = await res.json();
        setTrades(data._embedded?.records || []);
      } catch (error) {
        console.error('Failed to fetch trades:', error);
      }
      setLoadingTrades(false);
    };

    fetchTrades();
  }, [activeTab, asset.code, asset.issuer, trades.length]);

  // Fetch holders when tab is active
  useEffect(() => {
    if (activeTab !== 'holders' || holders.length > 0 || !asset.issuer) return;

    const fetchHolders = async () => {
      setLoadingHolders(true);
      try {
        const url = `${getBaseUrl()}/accounts?asset=${asset.code}:${asset.issuer}&limit=25&order=desc`;

        const res = await fetch(url);
        const data = await res.json();
        const accounts = data._embedded?.records || [];

        const holdersData: Holder[] = accounts.map((acc: any) => {
          const balance = acc.balances.find((b: any) =>
            b.asset_code === asset.code && b.asset_issuer === asset.issuer
          );
          return {
            account_id: acc.id,
            balance: balance?.balance || '0',
          };
        }).filter((h: Holder) => parseFloat(h.balance) > 0);

        holdersData.sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));

        setHolders(holdersData);
      } catch (error) {
        console.error('Failed to fetch holders:', error);
      }
      setLoadingHolders(false);
    };

    fetchHolders();
  }, [activeTab, asset.code, asset.issuer, holders.length]);

  const copyIssuer = () => {
    if (asset.issuer) {
      navigator.clipboard.writeText(asset.issuer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[1600px] px-6 py-6">
        {/* Main Grid: Left Sidebar + Right Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-6">
          {/* Left Sidebar */}
          <div className="space-y-4">
            {/* Asset Header */}
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

            {/* Price */}
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-[var(--text-primary)]">
                  {formatPrice(asset.price_usd)}
                </span>
                <span className={`text-sm font-medium ${asset.change_24h >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {asset.change_24h >= 0 ? '▲' : '▼'} {Math.abs(asset.change_24h).toFixed(2)}% (24h)
                </span>
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

              {/* Volume & Vol/Mkt Cap */}
              <div className="p-3 grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs text-[var(--text-tertiary)]">Volume (24h)</span>
                  </div>
                  <div className="font-semibold text-[var(--text-primary)]">${formatNumber(asset.volume_24h)}</div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs text-[var(--text-tertiary)]">Vol/Mkt Cap</span>
                  </div>
                  <div className="font-semibold text-[var(--text-primary)]">
                    {asset.market_cap > 0 ? ((asset.volume_24h / asset.market_cap) * 100).toFixed(2) + '%' : '--'}
                  </div>
                </div>
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

              {/* Supply Info */}
              <div className="p-3 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-[var(--text-tertiary)] mb-0.5">Total supply</div>
                  <div className="font-semibold text-[var(--text-primary)]">{formatNumber(asset.total_supply)} {asset.code}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-tertiary)] mb-0.5">Max. supply</div>
                  <div className="font-semibold text-[var(--text-primary)]">
                    {asset.total_supply === asset.circulating_supply ? '∞' : formatNumber(asset.total_supply) + ' ' + asset.code}
                  </div>
                </div>
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
                    <span className="text-xs text-[var(--text-tertiary)]">Issuer</span>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/account/${asset.issuer}`}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] rounded-lg text-xs font-mono font-medium text-[var(--text-secondary)] transition-colors"
                      >
                        <div className="w-4 h-4 bg-sky-500 rounded-full flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" />
                          </svg>
                        </div>
                        {shortenAddress(asset.issuer, 4)}
                      </Link>
                      <button
                        onClick={copyIssuer}
                        className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded transition-colors"
                        title="Copy issuer address"
                      >
                        {copied ? (
                          <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
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
              <div className="text-xs text-[var(--text-tertiary)] mb-2">{asset.code} to USD converter</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border-subtle)]">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">{asset.code}</span>
                  <input
                    type="number"
                    value={assetAmount}
                    onChange={(e) => setAssetAmount(e.target.value)}
                    className="text-right bg-transparent font-semibold text-[var(--text-primary)] focus:outline-none w-24"
                    placeholder="1"
                  />
                </div>
                <div className="flex items-center justify-between bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border-subtle)]">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">USD</span>
                  <span className="font-semibold text-[var(--text-primary)]">{usdAmount}</span>
                </div>
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

          {/* Right Content Area */}
          <div className="space-y-5 min-w-0 overflow-hidden">
            {/* Tab Navigation */}
            <div className="flex items-center justify-between border-b border-[var(--border-default)]">
              <div className="flex gap-6">
                {[
                  { id: 'chart', label: 'Chart' },
                  { id: 'markets', label: 'Markets' },
                  { id: 'holders', label: 'Holders' },
                  { id: 'about', label: 'About' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      activeTab === tab.id
                        ? 'text-sky-600 border-sky-500'
                        : 'text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'chart' && (
              <div className="space-y-4">
                <AssetCandlestickChart asset={asset} />

                {/* Order Book below chart */}
                <AssetOrderBook asset={asset} />
              </div>
            )}

            {activeTab === 'markets' && (
              <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-sm overflow-x-auto">
                <div className="p-4 border-b border-[var(--border-subtle)]">
                  <h3 className="font-semibold text-[var(--text-primary)]">{asset.name} Markets</h3>
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
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                        <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-left">#</th>
                        <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-left">Pair</th>
                        <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-right">Price</th>
                        <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-right">Amount</th>
                        <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-right">Total</th>
                        <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-left">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--bg-primary)]">
                      {trades.slice(0, 20).map((trade, idx) => {
                        const isBuy = trade.base_is_seller;
                        const price = trade.price.d > 0 ? trade.price.n / trade.price.d : 0;
                        const amount = parseFloat(trade.base_amount);
                        const total = price * amount;
                        const counterCode = trade.counter_asset_code || 'XLM';

                        return (
                          <tr
                            key={trade.id}
                            className="hover:bg-sky-50/30 transition-colors"
                          >
                            <td className="py-3 px-4 text-sm text-[var(--text-tertiary)]">{idx + 1}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  isBuy
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'bg-rose-50 text-rose-600'
                                }`}>
                                  {isBuy ? 'BUY' : 'SELL'}
                                </span>
                                <span className="text-sm font-medium text-sky-600">{asset.code}/{counterCode}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-sm text-[var(--text-primary)]">
                              ${formatPriceShort(price * asset.price_xlm)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-sm text-[var(--text-secondary)]">
                              {formatNumber(amount)}
                            </td>
                            <td className="py-3 px-4 text-right text-sm text-[var(--text-secondary)]">
                              ${formatNumber(total * asset.price_xlm)}
                            </td>
                            <td className="py-3 px-4 text-sm text-[var(--text-tertiary)]">
                              {timeAgo(trade.ledger_close_time)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
                  <table className="w-full">
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

                        return (
                          <tr
                            key={holder.account_id}
                            className="hover:bg-sky-50/30 transition-colors cursor-pointer"
                            onClick={() => router.push(`/account/${holder.account_id}`)}
                          >
                            <td className="py-3 px-4 text-[var(--text-tertiary)] text-sm">{index + 1}</td>
                            <td className="py-3 px-4">
                              <span className="font-mono text-sm text-sky-600 hover:underline">
                                {shortenAddress(holder.account_id, 8)}
                              </span>
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
                )}
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-4">
                {asset.description ? (
                  <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-sm p-5">
                    <h3 className="font-semibold text-[var(--text-primary)] mb-3">About {asset.name}</h3>
                    <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                      {asset.description}
                    </p>
                  </div>
                ) : (
                  <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-sm p-5">
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
                <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-sm p-5">
                  <h3 className="font-semibold text-[var(--text-primary)] mb-3">Asset Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[var(--text-tertiary)]">Asset Code</span>
                      <p className="font-medium text-[var(--text-primary)]">{asset.code}</p>
                    </div>
                    {asset.issuer && (
                      <div>
                        <span className="text-[var(--text-tertiary)]">Issuer</span>
                        <p className="font-mono text-sky-600 text-xs">{shortenAddress(asset.issuer, 12)}</p>
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
          </div>
        </div>
      </div>
    </div>
  );
}
