'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);

  // Read initial tab from URL params
  const initialTab = (searchParams.get('tab') as 'assets' | 'activity' | 'details') || 'assets';
  const [activeTab, setActiveTab] = useState<'assets' | 'activity' | 'details'>(initialTab);
  const [activityType, setActivityType] = useState<'all' | 'payments' | 'swaps' | 'contracts'>('all');

  // Update URL when tab changes
  const handleTabChange = (tab: 'assets' | 'activity' | 'details') => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'assets') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  };
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

    // Get all credits and debits for this account
    const credits = effects.filter(e => e.type === 'account_credited' && e.account === account.id && (e as any).amount);
    const debits = effects.filter(e => e.type === 'account_debited' && e.account === account.id && (e as any).amount);

    // Find the largest credit and debit by amount
    let largestCredit = credits.reduce((max, e) => {
      const amount = parseFloat((e as any).amount) || 0;
      const maxAmount = max ? parseFloat((max as any).amount) || 0 : 0;
      return amount > maxAmount ? e : max;
    }, null as Effect | null);

    let largestDebit = debits.reduce((max, e) => {
      const amount = parseFloat((e as any).amount) || 0;
      const maxAmount = max ? parseFloat((max as any).amount) || 0 : 0;
      return amount > maxAmount ? e : max;
    }, null as Effect | null);

    // Fallback to any account's effects if none for this account
    if (!largestCredit && !largestDebit) {
      const anyCredits = effects.filter(e => e.type === 'account_credited' && (e as any).amount);
      const anyDebits = effects.filter(e => e.type === 'account_debited' && (e as any).amount);

      largestCredit = anyCredits.reduce((max, e) => {
        const amount = parseFloat((e as any).amount) || 0;
        const maxAmount = max ? parseFloat((max as any).amount) || 0 : 0;
        return amount > maxAmount ? e : max;
      }, null as Effect | null);

      largestDebit = anyDebits.reduce((max, e) => {
        const amount = parseFloat((e as any).amount) || 0;
        const maxAmount = max ? parseFloat((max as any).amount) || 0 : 0;
        return amount > maxAmount ? e : max;
      }, null as Effect | null);
    }

    // Return the larger of credit or debit (most significant effect)
    const creditAmount = largestCredit ? parseFloat((largestCredit as any).amount) || 0 : 0;
    const debitAmount = largestDebit ? parseFloat((largestDebit as any).amount) || 0 : 0;

    if (creditAmount >= debitAmount && largestCredit) {
      return {
        type: 'received' as const,
        amount: (largestCredit as any).amount,
        asset: (largestCredit as any).asset_code || ((largestCredit as any).asset_type === 'native' ? 'XLM' : 'Unknown'),
      };
    }

    if (largestDebit) {
      return {
        type: 'sent' as const,
        amount: (largestDebit as any).amount,
        asset: (largestDebit as any).asset_code || ((largestDebit as any).asset_type === 'native' ? 'XLM' : 'Unknown'),
      };
    }

    return null;
  };

  // Filter operations
  // Payments: all value transfers including path payments (swaps)
  const allPaymentOps = allOperations.filter(op =>
    op.type === 'payment' || op.type === 'create_account' ||
    op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive'
  );

  // Swaps: all DEX activity (path payments + offers)
  const allSwapOps = allOperations.filter(op =>
    op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive' ||
    op.type === 'manage_sell_offer' || op.type === 'manage_buy_offer' ||
    op.type === 'create_passive_sell_offer'
  );

  const allContractOps = allOperations.filter(op =>
    op.type === 'invoke_host_function' || op.type === 'extend_footprint_ttl' || op.type === 'restore_footprint'
  );

  const getCurrentDataSource = () => {
    if (activityType === 'payments') return allPaymentOps;
    if (activityType === 'swaps') return allSwapOps;
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Account</h1>
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
              onClick={() => handleTabChange('assets')}
              className={`text-sm font-semibold relative ${activeTab === 'assets' ? 'text-slate-900 after:absolute after:-bottom-4 after:left-0 after:right-0 after:h-0.5 after:bg-slate-900' : 'text-slate-400 hover:text-slate-600'} transition-colors`}
            >
              Assets
            </button>
            <button
              onClick={() => handleTabChange('activity')}
              className={`text-sm font-semibold relative ${activeTab === 'activity' ? 'text-slate-900 after:absolute after:-bottom-4 after:left-0 after:right-0 after:h-0.5 after:bg-slate-900' : 'text-slate-400 hover:text-slate-600'} transition-colors`}
            >
              Activity
            </button>
            <button
              onClick={() => handleTabChange('details')}
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
          <div className="space-y-3">
            {/* XLM Card */}
            <div
              className="bg-slate-50 rounded-2xl p-4 active:bg-slate-100 transition-colors cursor-pointer"
              onClick={() => router.push('/asset/XLM')}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">XLM</div>
                    <div className="text-xs text-slate-500">Stellar Lumens</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-slate-900" title={formatExactNumber(xlmAmount)}>
                    {formatCompactNumber(xlmAmount)}
                  </div>
                  <div className="text-xs text-slate-500">
                    ${(xlmAmount * xlmPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/50">
                <div className="text-xs">
                  <span className="text-slate-400">PNL </span>
                  <span className={`font-semibold ${xlmChange24h >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {xlmChange24h >= 0 ? '+' : ''}${((xlmAmount * xlmPrice) * (xlmChange24h / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    {' '}({xlmChange24h >= 0 ? '+' : ''}{xlmChange24h.toFixed(2)}%)
                  </span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-400">Price </span>
                  <span className="font-semibold text-slate-700">${xlmPrice.toFixed(4)}</span>
                </div>
              </div>
            </div>

            {/* Other Assets */}
            {otherBalances.map((balance, idx) => {
              const amount = parseFloat(balance.balance);
              const key = `${balance.asset_code}:${balance.asset_issuer}`;
              const priceData = assetPrices[key];
              const valueUSD = priceData ? amount * priceData.price : 0;
              const pnl = priceData ? valueUSD * (priceData.change24h / 100) : 0;
              const pnlPercent = priceData?.change24h || 0;

              const bgColors = ['bg-blue-100', 'bg-purple-100', 'bg-emerald-100', 'bg-orange-100', 'bg-pink-100', 'bg-indigo-100', 'bg-violet-100'];
              const textColors = ['text-blue-600', 'text-purple-600', 'text-emerald-600', 'text-orange-600', 'text-pink-600', 'text-indigo-600', 'text-violet-600'];
              const colorIdx = (balance.asset_code || '').length % bgColors.length;

              return (
                <div
                  key={idx}
                  className="bg-slate-50 rounded-2xl p-4 active:bg-slate-100 transition-colors cursor-pointer"
                  onClick={() => router.push(getAssetUrl(balance.asset_code, balance.asset_issuer))}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${bgColors[colorIdx]} flex items-center justify-center ${textColors[colorIdx]}`}>
                        <span className="font-bold text-base">{(balance.asset_code || 'LP')[0]}</span>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{balance.asset_code || 'LP'}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[120px]">
                          {balance.asset_issuer ? shortenAddress(balance.asset_issuer, 6) : 'Liquidity Pool'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-slate-900" title={formatExactNumber(amount)}>
                        {formatCompactNumber(amount)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {valueUSD > 0 ? `$${valueUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '--'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/50">
                    <div className="text-xs">
                      <span className="text-slate-400">PNL </span>
                      {priceData ? (
                        <span className={`font-semibold ${pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          {' '}({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                        </span>
                      ) : (
                        <span className="text-slate-300">--</span>
                      )}
                    </div>
                    <div className="text-xs">
                      <span className="text-slate-400">Price </span>
                      {priceData ? (
                        <span className="font-semibold text-slate-700">${priceData.price.toFixed(priceData.price >= 1 ? 2 : 6)}</span>
                      ) : (
                        <span className="text-slate-300">--</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-3">
            {/* Activity Filters */}
            <div className="flex gap-5 border-b border-slate-100 pb-3 mb-2">
              {['all', 'payments', 'swaps', 'contracts'].map((type) => (
                <button
                  key={type}
                  onClick={() => setActivityType(type as any)}
                  className={`text-xs font-semibold relative ${activityType === type
                      ? 'text-slate-900 after:absolute after:-bottom-3 after:left-0 after:right-0 after:h-0.5 after:bg-slate-900'
                      : 'text-slate-400 hover:text-slate-600'
                    } transition-colors`}
                >
                  {type === 'all' ? 'All' : type === 'payments' ? 'Payments' : type === 'swaps' ? 'Swaps' : 'Contracts'}
                </button>
              ))}
            </div>

            {currentDataSource.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-xs font-medium">No activity found</p>
              </div>
            ) : (
              <div className="w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                      <th className="pb-3 font-bold">Activity</th>
                      <th className="pb-3 text-right font-bold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginatedOps.map(op => {
                      const isSwap = op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive';
                      const isOffer = op.type === 'manage_sell_offer' || op.type === 'manage_buy_offer' || op.type === 'create_passive_sell_offer';
                      const isPayment = op.type === 'payment' || op.type === 'create_account';
                      const isContract = op.type === 'invoke_host_function' || op.type === 'extend_footprint_ttl' || op.type === 'restore_footprint';

                      const effects = opEffects[op.id];
                      const effectInfo = getAmountFromEffects(effects);

                      let typeDisplay = op.type.replace(/_/g, ' ');
                      let amount = '';
                      let asset = '';

                      if (isContract) {
                        typeDisplay = decodeContractFunctionName(op);
                        // For contracts, get amounts from effects
                        if (effectInfo) {
                          amount = formatXLM(effectInfo.amount || '0');
                          asset = effectInfo.asset;
                        }
                      } else if (isPayment) {
                        // For payments, always use op.amount directly - it's the accurate value
                        const isReceive = op.to === account.id;
                        typeDisplay = isReceive ? 'Received' : 'Sent';
                        amount = formatXLM(op.amount || (op as any).starting_balance || '0');
                        asset = op.asset_type === 'native' ? 'XLM' : op.asset_code || 'XLM';
                      } else if (isSwap) {
                        typeDisplay = 'Swap';
                        // For path payments: show source amount with source asset (what was sent)
                        const sourceAssetType = (op as any).source_asset_type;
                        const sourceAssetCode = (op as any).source_asset_code;
                        amount = formatXLM(op.amount || '0');
                        asset = sourceAssetType === 'native' ? 'XLM' : sourceAssetCode || '';
                      } else if (isOffer) {
                        typeDisplay = op.type === 'manage_sell_offer' ? 'Sell Offer' : op.type === 'manage_buy_offer' ? 'Buy Offer' : 'Passive Offer';
                        amount = formatXLM(op.amount || '0');
                        asset = (op as any).selling_asset_type === 'native' ? 'XLM' : (op as any).selling_asset_code || '';
                      } else if (effectInfo) {
                        // For other operations, use effects data
                        amount = formatXLM(effectInfo.amount || '0');
                        asset = effectInfo.asset;
                        typeDisplay = effectInfo.type === 'received' ? 'Received' : 'Sent';
                      }

                      const isReceive = effectInfo?.type === 'received' || op.to === account.id;
                      const isSwapOrOffer = isSwap || isOffer;

                      // Color coding: green=receive, red=sent, blue=swap, purple=contract
                      const colorIdx = isSwapOrOffer ? 2 : (isContract ? 3 : (isReceive ? 0 : 1));
                      const bgColors = ['bg-emerald-50', 'bg-red-50', 'bg-blue-50', 'bg-purple-50', 'bg-orange-50'];
                      const textColors = ['text-emerald-600', 'text-red-600', 'text-blue-600', 'text-purple-600', 'text-orange-600'];

                      const dateStr = new Date(op.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                      return (
                        <tr
                          key={op.id}
                          className="group active:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => router.push(`/transaction/${op.transaction_hash}`)}
                        >
                          <td className="py-3 pr-2">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full ${bgColors[colorIdx]} flex items-center justify-center ${textColors[colorIdx]}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  {isSwapOrOffer ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                  ) : isReceive ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                  ) : isContract ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                  ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                  )}
                                </svg>
                              </div>
                              <div>
                                <div className="text-sm font-bold text-slate-900 capitalize">{typeDisplay}</div>
                                <div className="text-[10px] text-slate-400 font-medium">{dateStr}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-right">
                            {amount ? (
                              <>
                                <div className={`text-sm font-bold ${isReceive ? 'text-emerald-500' : 'text-slate-900'}`}>
                                  {isReceive ? '+' : '-'}{amount}
                                </div>
                                <div className="text-[10px] text-slate-400 font-medium">{asset}</div>
                              </>
                            ) : (
                              <div className="text-sm font-bold text-slate-300">--</div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination */}
                {currentTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <button
                      onClick={() => goToPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-slate-600 disabled:opacity-40"
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
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-slate-600 disabled:opacity-40"
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
          <div className="space-y-4">
            {/* Account Info Section */}
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold pb-2 border-b border-slate-100 mb-3">
                Account Info
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-slate-400 font-medium">Account ID</div>
                    <div className="text-sm font-mono text-slate-900 truncate">{shortenAddress(account.id, 10)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] text-slate-400 font-medium">Sequence Number</div>
                    <div className="text-sm font-mono text-slate-900">{account.sequence}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] text-slate-400 font-medium">Subentries</div>
                    <div className="text-sm font-bold text-slate-900">{account.subentry_count}</div>
                  </div>
                </div>
                {account.home_domain && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] text-slate-400 font-medium">Home Domain</div>
                      <a href={`https://${account.home_domain}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline">
                        {account.home_domain}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Thresholds Section */}
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold pb-2 border-b border-slate-100 mb-3">
                Thresholds
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="text-[10px] text-slate-400 font-medium mb-1">Low</div>
                  <div className="text-lg font-bold text-slate-900">{account.thresholds.low_threshold}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="text-[10px] text-slate-400 font-medium mb-1">Medium</div>
                  <div className="text-lg font-bold text-slate-900">{account.thresholds.med_threshold}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="text-[10px] text-slate-400 font-medium mb-1">High</div>
                  <div className="text-lg font-bold text-slate-900">{account.thresholds.high_threshold}</div>
                </div>
              </div>
            </div>

            {/* Signers Section */}
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold pb-2 border-b border-slate-100 mb-3">
                Signers ({account.signers.length})
              </div>
              <div className="space-y-2">
                {account.signers.map((signer, idx) => (
                  <div key={idx} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/account/${signer.key}`} className="text-sm font-mono text-slate-900 hover:text-blue-600 truncate block">
                        {shortenAddress(signer.key, 8)}
                      </Link>
                      <div className="text-[10px] text-slate-400 capitalize">{signer.type.replace(/_/g, ' ')}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">{signer.weight}</div>
                      <div className="text-[10px] text-slate-400">weight</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Flags Section */}
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold pb-2 border-b border-slate-100 mb-3">
                Account Flags
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className={`rounded-xl p-3 ${account.flags.auth_required ? 'bg-amber-50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${account.flags.auth_required ? 'bg-amber-500' : 'bg-slate-300'}`} />
                    <span className={`text-xs font-semibold ${account.flags.auth_required ? 'text-amber-700' : 'text-slate-400'}`}>Auth Required</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Requires authorization for trustlines</p>
                </div>
                <div className={`rounded-xl p-3 ${account.flags.auth_revocable ? 'bg-orange-50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${account.flags.auth_revocable ? 'bg-orange-500' : 'bg-slate-300'}`} />
                    <span className={`text-xs font-semibold ${account.flags.auth_revocable ? 'text-orange-700' : 'text-slate-400'}`}>Auth Revocable</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Can revoke trustlines</p>
                </div>
                <div className={`rounded-xl p-3 ${account.flags.auth_immutable ? 'bg-red-50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${account.flags.auth_immutable ? 'bg-red-500' : 'bg-slate-300'}`} />
                    <span className={`text-xs font-semibold ${account.flags.auth_immutable ? 'text-red-700' : 'text-slate-400'}`}>Auth Immutable</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Flags cannot be changed</p>
                </div>
                <div className={`rounded-xl p-3 ${account.flags.auth_clawback_enabled ? 'bg-purple-50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${account.flags.auth_clawback_enabled ? 'bg-purple-500' : 'bg-slate-300'}`} />
                    <span className={`text-xs font-semibold ${account.flags.auth_clawback_enabled ? 'text-purple-700' : 'text-slate-400'}`}>Clawback</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Can clawback assets</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
