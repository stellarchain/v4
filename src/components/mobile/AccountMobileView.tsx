'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Transaction, Operation, Effect, shortenAddress, timeAgo, formatXLM } from '@/lib/stellar';

// Format large numbers with abbreviations (K, M, B, T)
function formatCompactNumber(value: number): string {
  if (value === 0) return '0';

  const absValue = Math.abs(value);

  if (absValue >= 1_000_000_000_000) {
    return (value / 1_000_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'T';
  }
  if (absValue >= 1_000_000_000) {
    return (value / 1_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'B';
  }
  if (absValue >= 1_000_000) {
    return (value / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'M';
  }
  if (absValue >= 10_000) {
    return (value / 1_000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + 'K';
  }
  // For smaller numbers, show with appropriate decimal places
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

// Format exact number for tooltips
function formatExactNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 7 });
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
  const [activeTab, setActiveTab] = useState<'balances' | 'activity' | 'details'>('balances');
  const [activityType, setActivityType] = useState<'all' | 'payments' | 'contracts'>('all');
  const [assetPrices, setAssetPrices] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [opEffects, setOpEffects] = useState<Record<string, Effect[]>>({});

  // Pagination state for operations
  const [allOperations, setAllOperations] = useState<Operation[]>(initialOperations);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingPage, setLoadingPage] = useState(false);
  const [totalLoaded, setTotalLoaded] = useState(initialOperations.length);
  const [hasMoreToFetch, setHasMoreToFetch] = useState(initialOperations.length >= 100);
  const [lastCursor, setLastCursor] = useState<string | null>(
    initialOperations.length > 0 ? initialOperations[initialOperations.length - 1].paging_token : null
  );

  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.ceil(totalLoaded / ITEMS_PER_PAGE) + (hasMoreToFetch ? 1 : 0);

  // Fetch more operations when navigating to a page that needs more data
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

  // Get operations for current page
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

  // Reset page when switching activity type
  useEffect(() => {
    setCurrentPage(1);
  }, [activityType]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    if (query.length === 56 && query.startsWith('G')) {
      router.push(`/account/${query}`);
    } else if (query.length === 64) {
      router.push(`/transaction/${query}`);
    } else if (/^\d+$/.test(query)) {
      router.push(`/ledger/${query}`);
    } else {
      router.push(`/account/${query}`);
    }
    setSearchQuery('');
  };

  // Fetch effects for visible operations
  useEffect(() => {
    const fetchEffects = async () => {
      // Compute visible ops based on current activity type and page
      let visibleOps: Operation[] = [];
      const start = (currentPage - 1) * ITEMS_PER_PAGE;

      if (activityType === 'all') {
        visibleOps = allOperations.slice(start, start + ITEMS_PER_PAGE);
      } else if (activityType === 'payments') {
        const paymentFiltered = allOperations.filter(op =>
          op.type === 'payment' ||
          op.type === 'create_account' ||
          op.type === 'path_payment_strict_send' ||
          op.type === 'path_payment_strict_receive' ||
          op.type === 'invoke_host_function'
        );
        visibleOps = paymentFiltered.slice(start, start + ITEMS_PER_PAGE);
      } else if (activityType === 'contracts') {
        const contractFiltered = allOperations.filter(op =>
          op.type === 'invoke_host_function' ||
          op.type === 'extend_footprint_ttl' ||
          op.type === 'restore_footprint'
        );
        visibleOps = contractFiltered.slice(start, start + ITEMS_PER_PAGE);
      }

      const newEffects: Record<string, Effect[]> = {};

      await Promise.all(visibleOps.map(async (op) => {
        if (opEffects[op.id]) return;

        try {
          const res = await fetch(`https://horizon.stellar.org/operations/${op.id}/effects`);
          const data = await res.json();
          if (data._embedded && data._embedded.records) {
            newEffects[op.id] = data._embedded.records;
          }
        } catch {
          // swallow
        }
      }));

      if (Object.keys(newEffects).length > 0) {
        setOpEffects(prev => ({ ...prev, ...newEffects }));
      }
    };

    fetchEffects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allOperations, activityType, currentPage, account.id]);

  const getAmountFromEffects = (effects: Effect[] | undefined) => {
    if (!effects || effects.length === 0) return null;

    // First, try to find effects specifically for this account
    let credit = effects.find(e => e.type === 'account_credited' && e.account === account.id && (e as any).amount);
    let debit = effects.find(e => e.type === 'account_debited' && e.account === account.id && (e as any).amount);

    // If no account-specific effects, look for any credit/debit with amount (like transaction page does)
    if (!credit && !debit) {
      credit = effects.find(e => e.type === 'account_credited' && (e as any).amount);
      debit = effects.find(e => e.type === 'account_debited' && (e as any).amount);
    }

    // Prioritize showing received if we have a credit for this account, or any credit
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

  const xlmBalance = account.balances.find(b => b.asset_type === 'native');
  const otherBalances = account.balances.filter(b => b.asset_type !== 'native');
  const xlmAmount = parseFloat(xlmBalance?.balance || '0');

  let totalValueUSD = xlmAmount * xlmPrice;
  otherBalances.forEach(b => {
    const key = `${b.asset_code}:${b.asset_issuer}`;
    if (assetPrices[key]) {
      totalValueUSD += parseFloat(b.balance) * assetPrices[key];
    }
  });

  useEffect(() => {
    const fetchPrices = async () => {
      const newPrices: Record<string, number> = {};
      const assetsToFetch = account.balances.filter(b => b.asset_type !== 'native');

      await Promise.all(assetsToFetch.map(async (b) => {
        if (!b.asset_code || !b.asset_issuer) return;
        const key = `${b.asset_code}:${b.asset_issuer}`;

        if (b.asset_code === 'USDC' || b.asset_code === 'yUSDC') {
          newPrices[key] = 1.0;
          return;
        }

        try {
          const res = await fetch(
            `https://horizon.stellar.org/order_book?selling_asset_type=${b.asset_type}&selling_asset_code=${b.asset_code}&selling_asset_issuer=${b.asset_issuer}&buying_asset_type=native&limit=1`,
          );
          const data = await res.json();
          if (data.bids && data.bids.length > 0) {
            const priceInXlm = parseFloat(data.bids[0].price);
            newPrices[key] = priceInXlm * xlmPrice;
          }
        } catch {
          // ignore pricing errors
        }
      }));

      setAssetPrices(prev => ({ ...prev, ...newPrices }));
    };

    fetchPrices();
  }, [account, xlmPrice, xlmPrice]);

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
      return decoded.slice(5).replace(/\0/g, '') || 'Contract Call';
    } catch {
      return 'Contract Call';
    }
  };

  const isPaymentContractOp = (op: Operation): boolean => {
    if (op.type !== 'invoke_host_function') return false;
    const functionName = decodeContractFunctionName(op).toLowerCase();
    const paymentTerms = ['transfer', 'withdraw', 'deposit', 'claim', 'swap', 'pay', 'send', 'mint', 'burn'];
    return paymentTerms.some(term => functionName.includes(term));
  };

  // Filter from ALL operations, not just the current page
  const allPaymentOps = allOperations.filter(op =>
    op.type === 'payment' ||
    op.type === 'create_account' ||
    op.type === 'path_payment_strict_send' ||
    op.type === 'path_payment_strict_receive' ||
    isPaymentContractOp(op),
  );

  const allContractOps = allOperations.filter(op =>
    op.type === 'invoke_host_function' ||
    op.type === 'extend_footprint_ttl' ||
    op.type === 'restore_footprint',
  );

  // Get the current data source based on activity type
  const getCurrentDataSource = () => {
    if (activityType === 'payments') return allPaymentOps;
    if (activityType === 'contracts') return allContractOps;
    return allOperations;
  };

  const currentDataSource = getCurrentDataSource();
  const currentTotalPages = Math.ceil(currentDataSource.length / ITEMS_PER_PAGE) + (activityType === 'all' && hasMoreToFetch ? 1 : 0);

  // Get paginated items for current view
  const paginatedOps = currentDataSource.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="w-full bg-[#F2F4F8] min-h-screen pb-24 font-sans relative">
      <div className="bg-[#020617] rounded-b-[2.5rem] pb-8 pt-safe">
        <div className="w-full px-5 max-w-2xl mx-auto pt-4">
          <div className="flex items-center mb-5">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-bold text-white tracking-tight text-sm">StellarChain</span>
            </Link>
          </div>

          <div className="relative mb-6">
            <form onSubmit={handleSearch}>
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search hash, ledger, account..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-xs font-medium backdrop-blur-sm"
              />
            </form>
          </div>

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.back()}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Stellar Account</span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/10 text-white/80 text-[9px] font-mono hover:bg-white/20 transition-colors"
            >
              <span>{shortenAddress(account.id, 4)}</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copied && <span className="text-emerald-400">✓</span>}
            </button>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              ${totalValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h1>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5 flex items-center gap-1">
              <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="text-[9px] font-bold text-emerald-400">+1.2%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 relative -mt-5">
        <div className="bg-white rounded-xl p-1 shadow-lg shadow-slate-200/50 flex mb-4">
          <button
            onClick={() => setActiveTab('balances')}
            className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${activeTab === 'balances' ? 'bg-[#0F172A] text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            Balances
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${activeTab === 'activity' ? 'bg-[#0F172A] text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            Activity
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${activeTab === 'details' ? 'bg-[#0F172A] text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            Details
          </button>
        </div>

        <div className="space-y-4">
          {activeTab === 'balances' && (
            <>
              <div className="flex items-center justify-between px-1">
                <h2 className="text-base font-bold text-slate-900">Assets</h2>
              </div>

              <div className="space-y-3">
                <Link
                  href="/asset/XLM"
                  className="block bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Image
                        src="/stellar-xlm9125.jpg"
                        alt="Stellar Lumens"
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">Stellar Lumens</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">XLM</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className="font-bold text-slate-900 text-base cursor-help"
                        title={formatExactNumber(xlmAmount)}
                      >
                        {formatCompactNumber(xlmAmount)}
                      </p>
                      <p className="text-xs font-semibold text-slate-400">
                        ${(xlmAmount * xlmPrice).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                </Link>

                {otherBalances.map((balance, idx) => {
                  const amount = parseFloat(balance.balance);
                  const isUSDC = balance.asset_code === 'USDC';
                  const bgColors = ['bg-blue-100', 'bg-purple-100', 'bg-emerald-100', 'bg-orange-100', 'bg-pink-100'];
                  const textColors = ['text-blue-600', 'text-purple-600', 'text-emerald-600', 'text-orange-600', 'text-pink-600'];
                  const colorIdx = (balance.asset_code || '').length % bgColors.length;

                  return (
                    <Link
                      key={idx}
                      href={getAssetUrl(balance.asset_code, balance.asset_issuer)}
                      className="block bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isUSDC ? 'bg-[#2775CA]' : bgColors[colorIdx]
                              }`}
                          >
                            {isUSDC ? (
                              <span className="text-white font-bold text-[10px]">USDC</span>
                            ) : (
                              <span className={`font-bold text-base ${textColors[colorIdx]}`}>
                                {(balance.asset_code || 'LP')[0]}
                              </span>
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm">
                              {balance.asset_code || 'Liquidity Pool'}
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide break-all max-w-[120px] truncate">
                              {balance.asset_issuer ? shortenAddress(balance.asset_issuer, 4) : 'Native'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p
                            className="font-bold text-slate-900 text-base cursor-help"
                            title={formatExactNumber(amount)}
                          >
                            {formatCompactNumber(amount)}
                          </p>
                          <p className="text-xs font-semibold text-slate-400">
                            {(() => {
                              const key = `${balance.asset_code}:${balance.asset_issuer}`;
                              const price = assetPrices[key];
                              if (price) {
                                return `$${(amount * price).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}`;
                              }
                              return '$0.00';
                            })()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-3">
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  onClick={() => setActivityType('all')}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${activityType === 'all'
                    ? 'bg-black text-white'
                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActivityType('payments')}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${activityType === 'payments'
                    ? 'bg-black text-white'
                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  Payments
                </button>
                <button
                  onClick={() => setActivityType('contracts')}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${activityType === 'contracts'
                    ? 'bg-black text-white'
                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  Smart Contracts
                </button>
              </div>

              {currentDataSource.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-xs font-medium">No activity found</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[21px] top-4 bottom-4 w-[2px] bg-slate-100 -z-10" />
                  {paginatedOps.map(op => {
                      const isSwap =
                        op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive';
                      const isPayment = op.type === 'payment' || op.type === 'create_account';
                      const isContract = op.type === 'invoke_host_function';

                      let amountIn = '';
                      let assetIn = '';
                      let amountOut = '';
                      let assetOut = '';
                      let typeDisplay = op.type.replace(/_/g, ' ').toUpperCase();
                      let counterparty = '';
                      let counterpartyLabel = 'To:';

                      const effects = opEffects[op.id];
                      const effectInfo = getAmountFromEffects(effects);

                      // Get function name for contracts first
                      let contractFunctionName = '';
                      if (isContract) {
                        contractFunctionName = decodeContractFunctionName(op);
                      }

                      if (effectInfo) {
                        if (effectInfo.type === 'received') {
                          amountOut = formatXLM(effectInfo.amount || '0');
                          assetOut = effectInfo.asset;
                          typeDisplay = 'RECEIVED';
                          if (isContract && contractFunctionName && contractFunctionName !== 'Contract Call') {
                            typeDisplay = contractFunctionName.toUpperCase();
                          } else if (isContract) {
                            typeDisplay = 'SMART CONTRACT';
                          }
                        } else if (effectInfo.type === 'sent') {
                          amountOut = formatXLM(effectInfo.amount || '0');
                          assetOut = effectInfo.asset;
                          typeDisplay = 'SENT';
                          if (isContract && contractFunctionName && contractFunctionName !== 'Contract Call') {
                            typeDisplay = contractFunctionName.toUpperCase();
                          } else if (isContract) {
                            typeDisplay = 'SMART CONTRACT';
                          }
                        }
                      }

                      if (isSwap) {
                        typeDisplay = 'SWAP';
                        const sourceAmount = (op as any).source_amount;
                        const sourceAsset =
                          (op as any).source_asset_type === 'native'
                            ? 'XLM'
                            : (op as any).source_asset_code || 'XLM';
                        const destAmount = op.amount;
                        const destAsset = op.asset_type === 'native' ? 'XLM' : op.asset_code || 'XLM';

                        amountIn = formatXLM(sourceAmount || '0');
                        assetIn = sourceAsset;
                        amountOut = formatXLM(destAmount || '0');
                        assetOut = destAsset;

                        if (op.to && op.to !== account.id) {
                          counterparty = op.to;
                          counterpartyLabel = 'To:';
                        } else if (op.source_account && op.source_account !== account.id) {
                          counterparty = op.source_account;
                          counterpartyLabel = 'From:';
                        } else {
                          counterparty = op.to || op.source_account || '';
                        }
                      } else if (isPayment && !effectInfo) {
                        const isReceive = op.to === account.id;
                        typeDisplay = isReceive ? 'RECEIVED' : 'SENT';
                        amountOut = formatXLM(op.amount || (op as any).starting_balance || '0');
                        assetOut = op.asset_type === 'native' ? 'XLM' : op.asset_code || 'XLM';

                        if (isReceive) {
                          counterparty = op.source_account || (op as any).from || '';
                          counterpartyLabel = 'From:';
                        } else {
                          counterparty = op.to || (op as any).account || '';
                          counterpartyLabel = 'To:';
                        }
                      } else if (isContract && !effectInfo) {
                        typeDisplay = 'SMART CONTRACT';
                      }

                      return (
                        <Link
                          href={`/transaction/${op.transaction_hash}`}
                          key={op.id}
                          className="block bg-white rounded-xl p-2.5 shadow-sm border border-slate-100 mb-2 active:scale-[0.99] transition-transform"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider">
                              {typeDisplay}
                            </span>
                            <span className="text-[9px] font-medium text-slate-400">
                              {timeAgo(op.created_at)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isSwap
                                ? 'bg-blue-50 text-blue-500'
                                : typeDisplay === 'RECEIVED' || effectInfo?.type === 'received'
                                  ? 'bg-emerald-50 text-emerald-500'
                                  : typeDisplay === 'SENT' || effectInfo?.type === 'sent'
                                    ? 'bg-orange-50 text-orange-500'
                                    : 'bg-slate-50 text-slate-500'
                                }`}
                            >
                              {isSwap ? (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                              ) : typeDisplay === 'RECEIVED' || effectInfo?.type === 'received' ? (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                              ) : typeDisplay === 'SENT' || effectInfo?.type === 'sent' ? (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                              ) : (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              {isSwap ? (
                                <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                                  <div className="flex items-baseline gap-0.5">
                                    <span className="font-bold text-slate-900 text-xs">{amountIn}</span>
                                    <span className="text-[9px] font-bold text-slate-400">{assetIn}</span>
                                  </div>
                                  <svg className="w-2.5 h-2.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                  </svg>
                                  <div className="flex items-baseline gap-0.5">
                                    <span className="font-bold text-slate-900 text-xs">{amountOut}</span>
                                    <span className="text-[9px] font-bold text-slate-400">{assetOut}</span>
                                  </div>
                                </div>
                              ) : isContract && effectInfo ? (
                                <div className="flex items-baseline gap-1">
                                  <span className="font-bold text-slate-900 text-xs">{amountOut}</span>
                                  <span className="text-[9px] font-bold text-slate-400">{assetOut}</span>
                                </div>
                              ) : isPayment || effectInfo ? (
                                <div className="flex items-baseline gap-1">
                                  <span className="font-bold text-slate-900 text-xs">{amountOut}</span>
                                  <span className="text-[9px] font-bold text-slate-400">{assetOut}</span>
                                </div>
                              ) : isContract ? (
                                <div className="font-bold text-slate-900 text-xs">
                                  {contractFunctionName && contractFunctionName !== 'Contract Call'
                                    ? contractFunctionName
                                    : 'Contract Interaction'}
                                </div>
                              ) : (
                                <div className="font-bold text-slate-900 text-[11px]">
                                  Operation
                                </div>
                              )}

                              {counterparty && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-[8px] font-bold text-slate-400 uppercase">
                                    {counterpartyLabel}
                                  </span>
                                  <span className="text-[9px] font-mono text-slate-500">
                                    {shortenAddress(counterparty, 4)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}

                  {/* Pagination */}
                  {currentTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-1 mt-4 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1 || loadingPage}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>

                      {/* Page numbers */}
                      {(() => {
                        const pages = [];
                        const showPages = 5;
                        let start = Math.max(1, currentPage - Math.floor(showPages / 2));
                        const end = Math.min(currentTotalPages, start + showPages - 1);
                        if (end - start < showPages - 1) {
                          start = Math.max(1, end - showPages + 1);
                        }

                        if (start > 1) {
                          pages.push(
                            <button key={1} onClick={() => goToPage(1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                              1
                            </button>
                          );
                          if (start > 2) {
                            pages.push(<span key="dots1" className="text-slate-400 text-xs px-1">...</span>);
                          }
                        }

                        for (let i = start; i <= end; i++) {
                          pages.push(
                            <button
                              key={i}
                              onClick={() => goToPage(i)}
                              disabled={loadingPage}
                              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                                currentPage === i
                                  ? 'bg-slate-900 text-white'
                                  : 'text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              {i}
                            </button>
                          );
                        }

                        if (end < currentTotalPages) {
                          if (end < currentTotalPages - 1) {
                            pages.push(<span key="dots2" className="text-slate-400 text-xs px-1">...</span>);
                          }
                          pages.push(
                            <button
                              key={currentTotalPages}
                              onClick={() => goToPage(currentTotalPages)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                            >
                              {activityType === 'all' && hasMoreToFetch ? '...' : currentTotalPages}
                            </button>
                          );
                        }

                        return pages;
                      })()}

                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={(currentPage >= currentTotalPages && !(activityType === 'all' && hasMoreToFetch)) || loadingPage}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {loadingPage && (
                        <svg className="w-4 h-4 animate-spin ml-2 text-slate-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-2">
              {/* Account ID */}
              <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Account ID</label>
                <p className="text-[9px] font-mono text-slate-700 break-all mt-1">{account.id}</p>
              </div>

              {/* Basic Info Grid */}
              <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-medium text-slate-400">Sequence</span>
                    <span className="text-[10px] font-bold text-slate-900 font-mono">{account.sequence}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-medium text-slate-400">Subentries</span>
                    <span className="text-[10px] font-bold text-slate-900">{account.subentry_count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-medium text-slate-400">Last Modified</span>
                    <span className="text-[10px] font-medium text-slate-700">{timeAgo(account.last_modified_time)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-medium text-slate-400">Ledger</span>
                    <Link href={`/ledger/${account.last_modified_ledger}`} className="text-[10px] font-bold text-blue-600">
                      {account.last_modified_ledger.toLocaleString()}
                    </Link>
                  </div>
                </div>
              </div>

              {/* Home Domain */}
              {account.home_domain && (
                <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 flex items-center justify-between">
                  <span className="text-[9px] font-medium text-slate-400">Home Domain</span>
                  <a
                    href={`https://${account.home_domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-blue-600 flex items-center gap-1"
                  >
                    {account.home_domain}
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}

              {/* Signers */}
              {account.signers && account.signers.length > 0 && (
                <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">
                    Signers ({account.signers.length})
                  </label>
                  <div className="space-y-1">
                    {account.signers.map((signer, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <Link
                            href={`/account/${signer.key}`}
                            className="text-[10px] font-semibold text-blue-600"
                          >
                            {shortenAddress(signer.key, 6)}
                          </Link>
                          <span className="text-[8px] text-slate-400 uppercase">{signer.type}</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {signer.weight}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Thresholds & Sponsorship Row */}
              <div className="grid grid-cols-2 gap-2">
                {/* Thresholds */}
                <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-2 block">Thresholds</label>
                  <div className="flex justify-between gap-1">
                    <div className="flex-1 bg-emerald-50 rounded-lg py-1.5 text-center">
                      <p className="text-[8px] font-bold text-emerald-600 uppercase">Low</p>
                      <p className="text-sm font-bold text-emerald-700">{account.thresholds.low_threshold}</p>
                    </div>
                    <div className="flex-1 bg-amber-50 rounded-lg py-1.5 text-center">
                      <p className="text-[8px] font-bold text-amber-600 uppercase">Med</p>
                      <p className="text-sm font-bold text-amber-700">{account.thresholds.med_threshold}</p>
                    </div>
                    <div className="flex-1 bg-red-50 rounded-lg py-1.5 text-center">
                      <p className="text-[8px] font-bold text-red-600 uppercase">High</p>
                      <p className="text-sm font-bold text-red-700">{account.thresholds.high_threshold}</p>
                    </div>
                  </div>
                </div>

                {/* Sponsorship */}
                <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-2 block">Sponsorship</label>
                  <div className="flex justify-between gap-1">
                    <div className="flex-1 bg-blue-50 rounded-lg py-1.5 text-center">
                      <p className="text-[8px] font-bold text-blue-600 uppercase">Out</p>
                      <p className="text-sm font-bold text-blue-700">{account.num_sponsoring}</p>
                    </div>
                    <div className="flex-1 bg-purple-50 rounded-lg py-1.5 text-center">
                      <p className="text-[8px] font-bold text-purple-600 uppercase">In</p>
                      <p className="text-sm font-bold text-purple-700">{account.num_sponsored}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Flags */}
              <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-2 block">Account Flags</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className={`rounded-lg px-2 py-1.5 flex items-center gap-1.5 ${account.flags.auth_required ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${account.flags.auth_required ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className={`text-[9px] font-medium ${account.flags.auth_required ? 'text-emerald-700' : 'text-slate-400'}`}>
                      Auth Required
                    </span>
                  </div>
                  <div className={`rounded-lg px-2 py-1.5 flex items-center gap-1.5 ${account.flags.auth_revocable ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${account.flags.auth_revocable ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className={`text-[9px] font-medium ${account.flags.auth_revocable ? 'text-emerald-700' : 'text-slate-400'}`}>
                      Auth Revocable
                    </span>
                  </div>
                  <div className={`rounded-lg px-2 py-1.5 flex items-center gap-1.5 ${account.flags.auth_immutable ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${account.flags.auth_immutable ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className={`text-[9px] font-medium ${account.flags.auth_immutable ? 'text-emerald-700' : 'text-slate-400'}`}>
                      Auth Immutable
                    </span>
                  </div>
                  <div className={`rounded-lg px-2 py-1.5 flex items-center gap-1.5 ${account.flags.auth_clawback_enabled ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${account.flags.auth_clawback_enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className={`text-[9px] font-medium ${account.flags.auth_clawback_enabled ? 'text-emerald-700' : 'text-slate-400'}`}>
                      Clawback
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

