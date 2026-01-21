'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Transaction, Operation, Effect, shortenAddress, formatXLM } from '@/lib/stellar';

function formatCompactNumber(value: number): string {
  if (value === 0) return '0';
  const absValue = Math.abs(value);
  if (absValue >= 1_000_000_000_000) return (value / 1_000_000_000_000).toFixed(2) + 'T';
  if (absValue >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + 'B';
  if (absValue >= 1_000_000) return (value / 1_000_000).toFixed(2) + 'M';
  if (absValue >= 10_000) return (value / 1_000).toFixed(1) + 'K';
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatExactNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 7 });
}

function formatBalanceDisplay(value: number): string {
  if (value >= 1000) {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (value >= 1) {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

interface Balance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
}

interface AccountData {
  id: string;
  balances: Balance[];
  subentry_count: number;
  sequence: string;
  last_modified_time: string;
  last_modified_ledger: number;
  signers: Array<{ key: string; weight: number; type: string }>;
  num_sponsoring: number;
  num_sponsored: number;
  thresholds: { low_threshold: number; med_threshold: number; high_threshold: number };
  flags: { auth_required: boolean; auth_revocable: boolean; auth_immutable: boolean; auth_clawback_enabled: boolean };
  home_domain?: string;
}

interface AssetPriceData {
  price: number;
  priceInXlm: number;
  change24h: number;
}

interface AccountMobileViewProps {
  account: AccountData;
  transactions: Transaction[];
  operations: Operation[];
  xlmPrice: number;
}

function getAssetUrl(code: string | undefined, issuer: string | undefined): string {
  if (!code || code === 'native') return '/asset/XLM';
  if (code === 'XLM' && !issuer) return '/asset/XLM';
  return `/asset/${encodeURIComponent(code)}${issuer ? `?issuer=${encodeURIComponent(issuer)}` : ''}`;
}

export default function AccountMobileView({ account, transactions, operations: initialOperations, xlmPrice }: AccountMobileViewProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'assets' | 'activity' | 'details'>('assets');
  const [activityType, setActivityType] = useState<'all' | 'payments' | 'contracts'>('all');
  const [assetPrices, setAssetPrices] = useState<Record<string, AssetPriceData>>({});
  const [opEffects, setOpEffects] = useState<Record<string, Effect[]>>({});
  const [xlmChange24h, setXlmChange24h] = useState(0);

  // Operations pagination
  const [allOperations, setAllOperations] = useState<Operation[]>(initialOperations);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingPage, setLoadingPage] = useState(false);
  const [totalLoaded, setTotalLoaded] = useState(initialOperations.length);
  const [hasMoreToFetch, setHasMoreToFetch] = useState(initialOperations.length >= 100);
  const [lastCursor, setLastCursor] = useState<string | null>(
    initialOperations.length > 0 ? initialOperations[initialOperations.length - 1].paging_token : null
  );

  const ITEMS_PER_PAGE = 20;

  // Balances
  const xlmBalance = account.balances.find(b => b.asset_type === 'native');
  const otherBalances = account.balances.filter(b => b.asset_type !== 'native');
  const xlmAmount = parseFloat(xlmBalance?.balance || '0');

  // Calculate total balance in XLM
  const totalBalanceXLM = useMemo(() => {
    let total = xlmAmount;
    otherBalances.forEach(b => {
      const key = `${b.asset_code}:${b.asset_issuer}`;
      const priceData = assetPrices[key];
      if (priceData && priceData.priceInXlm > 0) {
        total += parseFloat(b.balance) * priceData.priceInXlm;
      }
    });
    return total;
  }, [xlmAmount, otherBalances, assetPrices]);

  // Calculate total USD value
  const totalValueUSD = totalBalanceXLM * xlmPrice;

  // Calculate 24h PNL
  const pnlData = useMemo(() => {
    let totalPnlUSD = 0;

    // XLM PNL
    const xlmValue = xlmAmount * xlmPrice;
    const xlmPnl = xlmValue * (xlmChange24h / 100);
    totalPnlUSD += xlmPnl;

    // Other assets PNL
    otherBalances.forEach(b => {
      const key = `${b.asset_code}:${b.asset_issuer}`;
      const priceData = assetPrices[key];
      if (priceData && priceData.price > 0) {
        const value = parseFloat(b.balance) * priceData.price;
        const pnl = value * (priceData.change24h / 100);
        totalPnlUSD += pnl;
      }
    });

    const pnlPercent = totalValueUSD > 0 ? (totalPnlUSD / (totalValueUSD - totalPnlUSD)) * 100 : 0;
    return { amount: totalPnlUSD, percent: pnlPercent };
  }, [xlmAmount, xlmPrice, xlmChange24h, otherBalances, assetPrices, totalValueUSD]);

  // Fetch XLM 24h change
  useEffect(() => {
    const fetchXlmChange = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd&include_24hr_change=true');
        const data = await res.json();
        if (data.stellar?.usd_24h_change) {
          setXlmChange24h(data.stellar.usd_24h_change);
        }
      } catch {
        // Ignore
      }
    };
    fetchXlmChange();
  }, []);

  // Fetch asset prices with 24h change
  useEffect(() => {
    const fetchPrices = async () => {
      const newPrices: Record<string, AssetPriceData> = {};

      await Promise.all(account.balances.filter(b => b.asset_type !== 'native').map(async (b) => {
        if (!b.asset_code || !b.asset_issuer) return;
        const key = `${b.asset_code}:${b.asset_issuer}`;

        if (b.asset_code === 'USDC' || b.asset_code === 'yUSDC') {
          newPrices[key] = { price: 1.0, priceInXlm: 1 / xlmPrice, change24h: 0 };
          return;
        }

        try {
          // Get current price in XLM
          const res = await fetch(
            `https://horizon.stellar.org/order_book?selling_asset_type=${b.asset_type}&selling_asset_code=${b.asset_code}&selling_asset_issuer=${b.asset_issuer}&buying_asset_type=native&limit=1`
          );
          const data = await res.json();

          if (data.bids && data.bids.length > 0) {
            const priceInXlm = parseFloat(data.bids[0].price);
            const priceUSD = priceInXlm * xlmPrice;

            // Get 24h ago price from trade aggregations (use 1h resolution for better data availability)
            const endTime = Date.now();
            const startTime = endTime - 86400000;
            const aggRes = await fetch(
              `https://horizon.stellar.org/trade_aggregations?base_asset_type=${b.asset_type}&base_asset_code=${b.asset_code}&base_asset_issuer=${b.asset_issuer}&counter_asset_type=native&resolution=3600000&start_time=${startTime}&end_time=${endTime}&limit=24&order=asc`
            );
            const aggData = await aggRes.json();

            let change24h = 0;
            const records = aggData._embedded?.records || [];
            if (records.length > 0) {
              // Get the oldest record's open price as our 24h ago reference
              const oldestRecord = records[0];
              const openPriceXlm = parseFloat(oldestRecord.open);
              if (openPriceXlm > 0) {
                // Calculate change in XLM terms
                const xlmPriceChange = ((priceInXlm - openPriceXlm) / openPriceXlm) * 100;
                // Add XLM's own USD change to get total USD change
                change24h = xlmPriceChange + xlmChange24h;
              }
            } else {
              // No trade data, but still affected by XLM price change
              change24h = xlmChange24h;
            }

            newPrices[key] = { price: priceUSD, priceInXlm, change24h };
          }
        } catch {
          // Ignore
        }
      }));

      setAssetPrices(prev => ({ ...prev, ...newPrices }));
    };

    fetchPrices();
  }, [account.balances, xlmPrice, xlmChange24h]);

  // Fetch more operations
  const fetchMoreIfNeeded = async (targetPage: number) => {
    const neededItems = targetPage * ITEMS_PER_PAGE;
    if (neededItems <= allOperations.length || !hasMoreToFetch || loadingPage) return;

    setLoadingPage(true);
    try {
      const res = await fetch(
        `https://horizon.stellar.org/accounts/${account.id}/operations?limit=100&order=desc&cursor=${lastCursor}`
      );
      const data = await res.json();
      const newOps = data._embedded?.records || [];

      if (newOps.length > 0) {
        setAllOperations(prev => [...prev, ...newOps]);
        setLastCursor(newOps[newOps.length - 1].paging_token);
        setTotalLoaded(prev => prev + newOps.length);
        setHasMoreToFetch(newOps.length >= 100);
      } else {
        setHasMoreToFetch(false);
      }
    } catch (error) {
      console.error('Failed to load more operations:', error);
    } finally {
      setLoadingPage(false);
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    fetchMoreIfNeeded(page);
  };

  // Reset page when switching activity type
  useEffect(() => {
    setCurrentPage(1);
  }, [activityType]);

  // Fetch effects for visible operations
  useEffect(() => {
    const fetchEffects = async () => {
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      let visibleOps: Operation[] = [];

      if (activityType === 'all') {
        visibleOps = allOperations.slice(start, start + ITEMS_PER_PAGE);
      } else if (activityType === 'payments') {
        const filtered = allOperations.filter(op =>
          op.type === 'payment' || op.type === 'create_account' ||
          op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive' ||
          op.type === 'invoke_host_function'
        );
        visibleOps = filtered.slice(start, start + ITEMS_PER_PAGE);
      } else if (activityType === 'contracts') {
        const filtered = allOperations.filter(op =>
          op.type === 'invoke_host_function' || op.type === 'extend_footprint_ttl' || op.type === 'restore_footprint'
        );
        visibleOps = filtered.slice(start, start + ITEMS_PER_PAGE);
      }

      const newEffects: Record<string, Effect[]> = {};
      await Promise.all(visibleOps.map(async (op) => {
        if (opEffects[op.id]) return;
        try {
          const res = await fetch(`https://horizon.stellar.org/operations/${op.id}/effects`);
          const data = await res.json();
          if (data._embedded?.records) {
            newEffects[op.id] = data._embedded.records;
          }
        } catch { /* ignore */ }
      }));

      if (Object.keys(newEffects).length > 0) {
        setOpEffects(prev => ({ ...prev, ...newEffects }));
      }
    };

    fetchEffects();
  }, [allOperations, activityType, currentPage, account.id, opEffects]);

  const handleCopy = () => {
    navigator.clipboard.writeText(account.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const decodeContractFunctionName = (op: Operation): string => {
    try {
      const parameters = op.parameters as Array<{ type: string; value: string }> | undefined;
      if (!parameters) return 'Contract Call';
      const symParam = parameters.find(p => p.type === 'Sym');
      if (!symParam) return 'Contract Call';
      const decoded = atob(symParam.value);
      const cleaned = decoded.replace(/[^\x20-\x7E]/g, '').replace(/^[^a-zA-Z]+/, '');
      return cleaned || 'Contract Call';
    } catch {
      return 'Contract Call';
    }
  };

  const getAmountFromEffects = (effects: Effect[] | undefined) => {
    if (!effects || effects.length === 0) return null;

    let credit = effects.find(e => e.type === 'account_credited' && e.account === account.id && (e as any).amount);
    let debit = effects.find(e => e.type === 'account_debited' && e.account === account.id && (e as any).amount);

    if (!credit && !debit) {
      credit = effects.find(e => e.type === 'account_credited' && (e as any).amount);
      debit = effects.find(e => e.type === 'account_debited' && (e as any).amount);
    }

    if (credit) {
      return {
        type: 'received' as const,
        amount: (credit as any).amount,
        asset: (credit as any).asset_code || ((credit as any).asset_type === 'native' ? 'XLM' : 'Unknown'),
      };
    }

    if (debit) {
      return {
        type: 'sent' as const,
        amount: (debit as any).amount,
        asset: (debit as any).asset_code || ((debit as any).asset_type === 'native' ? 'XLM' : 'Unknown'),
      };
    }

    return null;
  };

  // Filter operations
  const allPaymentOps = allOperations.filter(op =>
    op.type === 'payment' || op.type === 'create_account' ||
    op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive' ||
    op.type === 'invoke_host_function'
  );

  const allContractOps = allOperations.filter(op =>
    op.type === 'invoke_host_function' || op.type === 'extend_footprint_ttl' || op.type === 'restore_footprint'
  );

  const getCurrentDataSource = () => {
    if (activityType === 'payments') return allPaymentOps;
    if (activityType === 'contracts') return allContractOps;
    return allOperations;
  };

  const currentDataSource = getCurrentDataSource();
  const currentTotalPages = Math.ceil(currentDataSource.length / ITEMS_PER_PAGE) + (activityType === 'all' && hasMoreToFetch ? 1 : 0);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedOps = currentDataSource.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const isPositivePnl = pnlData.amount >= 0;

  return (
    <div className="w-full bg-[#f0f4f3] min-h-screen pb-24 font-sans">
      {/* Header */}
      <header className="pt-8 px-6 pb-2 sticky top-0 z-20 bg-[#f0f4f3]/90 backdrop-blur-md">
        {/* Title Row */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Portfolio</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-500 font-mono">
              {shortenAddress(account.id, 4)}
            </span>
            <button
              onClick={handleCopy}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/80 text-slate-500 hover:bg-white transition-colors"
            >
              {copied ? (
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Est. Total Value Section */}
        <div className="mb-6">
          <div className="text-sm text-slate-500 mb-2">
            Est. Total Value
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight text-slate-900">
              {formatBalanceDisplay(totalBalanceXLM)}
            </span>
            <span className="text-lg font-semibold text-slate-400">XLM</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-base text-slate-500">
              ≈ ${totalValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`text-xs font-semibold ${isPositivePnl ? 'text-emerald-600' : 'text-red-600'}`}>
              {isPositivePnl ? '+' : ''}${Math.abs(pnlData.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({isPositivePnl ? '+' : ''}{pnlData.percent.toFixed(2)}%) 24h Change
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between px-2 mb-4 border-b border-slate-100 pb-4">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('assets')}
              className={`text-sm font-semibold relative ${activeTab === 'assets' ? 'text-slate-900 after:absolute after:-bottom-4 after:left-0 after:right-0 after:h-0.5 after:bg-slate-900' : 'text-slate-400 hover:text-slate-600'} transition-colors`}
            >
              Assets
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`text-sm font-semibold relative ${activeTab === 'activity' ? 'text-slate-900 after:absolute after:-bottom-4 after:left-0 after:right-0 after:h-0.5 after:bg-slate-900' : 'text-slate-400 hover:text-slate-600'} transition-colors`}
            >
              Activity
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`text-sm font-semibold relative ${activeTab === 'details' ? 'text-slate-900 after:absolute after:-bottom-4 after:left-0 after:right-0 after:h-0.5 after:bg-slate-900' : 'text-slate-400 hover:text-slate-600'} transition-colors`}
            >
              Details
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6">
        {activeTab === 'assets' && (
          <div className="w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                  <th className="pb-3 font-bold">Asset</th>
                  <th className="pb-3 text-right font-bold">Balance</th>
                  <th className="pb-3 text-right font-bold">PNL / Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {/* XLM Row */}
                <tr
                  className="group active:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => router.push('/asset/XLM')}
                >
                  <td className="py-3 pr-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">XLM</div>
                        <div className="text-[10px] text-slate-400 font-medium">Stellar Lumens</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    <div className="text-sm font-bold text-slate-900 tracking-tight" title={formatExactNumber(xlmAmount)}>
                      {formatCompactNumber(xlmAmount)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      ${(xlmAmount * xlmPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    <div className={`text-[11px] font-bold ${xlmChange24h >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {xlmChange24h >= 0 ? '+' : ''}${((xlmAmount * xlmPrice) * (xlmChange24h / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">${xlmPrice.toFixed(4)}</div>
                  </td>
                </tr>

                {/* Other Assets */}
                {otherBalances.map((balance, idx) => {
                  const amount = parseFloat(balance.balance);
                  const key = `${balance.asset_code}:${balance.asset_issuer}`;
                  const priceData = assetPrices[key];
                  const valueUSD = priceData ? amount * priceData.price : 0;
                  const pnl = priceData ? valueUSD * (priceData.change24h / 100) : 0;
                  const xlmEquiv = priceData ? amount * priceData.priceInXlm : 0;

                  const bgColors = ['bg-blue-50', 'bg-purple-50', 'bg-emerald-50', 'bg-orange-50', 'bg-pink-50', 'bg-indigo-50', 'bg-violet-50'];
                  const textColors = ['text-blue-600', 'text-purple-600', 'text-emerald-600', 'text-orange-600', 'text-pink-600', 'text-indigo-600', 'text-violet-600'];
                  const colorIdx = (balance.asset_code || '').length % bgColors.length;

                  return (
                    <tr
                      key={idx}
                      className="group active:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => router.push(getAssetUrl(balance.asset_code, balance.asset_issuer))}
                    >
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${bgColors[colorIdx]} flex items-center justify-center ${textColors[colorIdx]}`}>
                            <span className="font-bold text-sm">{(balance.asset_code || 'LP')[0]}</span>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">{balance.asset_code || 'LP'}</div>
                            <div className="text-[10px] text-slate-400 font-medium truncate max-w-[80px]">
                              {balance.asset_issuer ? shortenAddress(balance.asset_issuer, 4) : 'Pool'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <div className="text-sm font-bold text-slate-900 tracking-tight" title={formatExactNumber(amount)}>
                          {formatCompactNumber(amount)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {valueUSD > 0 ? `$${formatCompactNumber(valueUSD)}` : '--'}
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        {priceData ? (
                          <>
                            <div className={`text-[11px] font-bold ${pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">${priceData.price.toFixed(priceData.price >= 1 ? 2 : 6)}</div>
                          </>
                        ) : (
                          <>
                            <div className="text-[11px] font-bold text-slate-300">--</div>
                            <div className="text-[10px] text-slate-400 font-medium">--</div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-3">
            {/* Activity Filters */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {['all', 'payments', 'contracts'].map((type) => (
                <button
                  key={type}
                  onClick={() => setActivityType(type as any)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${
                    activityType === type
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {type === 'all' ? 'All' : type === 'payments' ? 'Payments' : 'Smart Contracts'}
                </button>
              ))}
            </div>

            {currentDataSource.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-xs font-medium">No activity found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {paginatedOps.map(op => {
                  const isSwap = op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive';
                  const isPayment = op.type === 'payment' || op.type === 'create_account';
                  const isContract = op.type === 'invoke_host_function';

                  const effects = opEffects[op.id];
                  const effectInfo = getAmountFromEffects(effects);

                  let typeDisplay = op.type.replace(/_/g, ' ');
                  let amount = '';
                  let asset = '';

                  if (isContract) {
                    typeDisplay = decodeContractFunctionName(op);
                  }

                  if (effectInfo) {
                    amount = formatXLM(effectInfo.amount || '0');
                    asset = effectInfo.asset;
                    if (!isContract) {
                      typeDisplay = effectInfo.type === 'received' ? 'Received' : 'Sent';
                    }
                  } else if (isSwap) {
                    typeDisplay = 'Swap';
                    amount = formatXLM(op.amount || '0');
                    asset = op.asset_type === 'native' ? 'XLM' : op.asset_code || '';
                  } else if (isPayment) {
                    const isReceive = op.to === account.id;
                    typeDisplay = isReceive ? 'Received' : 'Sent';
                    amount = formatXLM(op.amount || (op as any).starting_balance || '0');
                    asset = op.asset_type === 'native' ? 'XLM' : op.asset_code || 'XLM';
                  }

                  const isReceive = effectInfo?.type === 'received' || op.to === account.id;

                  return (
                    <Link
                      key={op.id}
                      href={`/transaction/${op.transaction_hash}`}
                      className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isReceive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isReceive ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            )}
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900 capitalize">{typeDisplay}</div>
                          <div className="text-[10px] text-slate-400">{new Date(op.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                      {amount && (
                        <div className="text-right">
                          <div className={`text-sm font-bold ${isReceive ? 'text-emerald-500' : 'text-slate-900'}`}>
                            {isReceive ? '+' : '-'}{amount} {asset}
                          </div>
                        </div>
                      )}
                    </Link>
                  );
                })}

                {/* Pagination */}
                {currentTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <button
                      onClick={() => goToPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-40"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-xs font-medium text-slate-500">
                      Page {currentPage} of {currentTotalPages}
                    </span>
                    <button
                      onClick={() => goToPage(Math.min(currentTotalPages, currentPage + 1))}
                      disabled={currentPage === currentTotalPages && !hasMoreToFetch}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-40"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'details' && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl p-4 border border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Account Info</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Account ID</span>
                  <span className="text-xs font-mono text-slate-900">{shortenAddress(account.id, 8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Sequence</span>
                  <span className="text-xs font-mono text-slate-900">{account.sequence}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Subentries</span>
                  <span className="text-xs font-mono text-slate-900">{account.subentry_count}</span>
                </div>
                {account.home_domain && (
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Home Domain</span>
                    <a href={`https://${account.home_domain}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                      {account.home_domain}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Thresholds</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Low</span>
                  <span className="text-xs font-mono text-slate-900">{account.thresholds.low_threshold}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Medium</span>
                  <span className="text-xs font-mono text-slate-900">{account.thresholds.med_threshold}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">High</span>
                  <span className="text-xs font-mono text-slate-900">{account.thresholds.high_threshold}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Signers ({account.signers.length})</h3>
              <div className="space-y-2">
                {account.signers.map((signer, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-xs font-mono text-slate-600">{shortenAddress(signer.key, 6)}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                      Weight: {signer.weight}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Flags</h3>
              <div className="flex flex-wrap gap-2">
                {account.flags.auth_required && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold">Auth Required</span>
                )}
                {account.flags.auth_revocable && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-orange-50 text-orange-700 font-semibold">Auth Revocable</span>
                )}
                {account.flags.auth_immutable && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-red-50 text-red-700 font-semibold">Auth Immutable</span>
                )}
                {account.flags.auth_clawback_enabled && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-purple-50 text-purple-700 font-semibold">Clawback Enabled</span>
                )}
                {!account.flags.auth_required && !account.flags.auth_revocable && !account.flags.auth_immutable && !account.flags.auth_clawback_enabled && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-slate-100 text-slate-500 font-semibold">No flags set</span>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
