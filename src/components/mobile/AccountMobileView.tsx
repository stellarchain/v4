'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Transaction, Operation, shortenAddress, timeAgo, getOperationTypeLabel, formatXLM } from '@/lib/stellar';
import SimpleMobileHeader from './SimpleMobileHeader';

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

export default function AccountMobileView({ account, transactions, operations, xlmPrice }: AccountMobileViewProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'balances' | 'activity' | 'info'>('balances');
  const [activityType, setActivityType] = useState<'all' | 'payments' | 'contracts'>('all');
  const [assetPrices, setAssetPrices] = useState<Record<string, number>>({});

  const xlmBalance = account.balances.find(b => b.asset_type === 'native');
  const otherBalances = account.balances.filter(b => b.asset_type !== 'native');

  const xlmAmount = parseFloat(xlmBalance?.balance || '0');

  // Calculate Total Value
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

        // Simple heuristic for USD stablecoins
        if (b.asset_code === 'USDC' || b.asset_code === 'yUSDC') {
          newPrices[key] = 1.0;
          return;
        }

        try {
          // Fetch orderbook: Selling Asset, Buying XLM -> Price is XLM per Asset
          const res = await fetch(`https://horizon.stellar.org/order_book?selling_asset_type=${b.asset_type}&selling_asset_code=${b.asset_code}&selling_asset_issuer=${b.asset_issuer}&buying_asset_type=native&limit=1`);
          const data = await res.json();
          if (data.bids && data.bids.length > 0) {
            // Bid price is "price of 1 selling_asset in terms of buying_asset"
            // i.e. How many XLM for 1 Asset.
            const priceInXlm = parseFloat(data.bids[0].price);
            newPrices[key] = priceInXlm * xlmPrice;
          }
        } catch (e) {
          // Silent failure
        }
      }));
      setAssetPrices(prev => ({ ...prev, ...newPrices }));
    };

    fetchPrices();
  }, [account, xlmPrice]);

  const handleCopy = () => {
    navigator.clipboard.writeText(account.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper function to decode contract function name from parameters
  const decodeContractFunctionName = (op: Operation): string => {
    try {
      // Look for the Sym parameter which contains the function name
      const parameters = op.parameters as Array<{ type: string; value: string }> | undefined;
      if (!parameters) return 'Contract Call';

      const symParam = parameters.find(p => p.type === 'Sym');
      if (!symParam) return 'Contract Call';

      // Decode base64 and extract the function name
      const decoded = atob(symParam.value);
      // The function name is in the decoded string, skip the first bytes (length prefix)
      const functionName = decoded.slice(5).replace(/\0/g, '');
      return functionName || 'Contract Call';
    } catch {
      return 'Contract Call';
    }
  };

  // Helper to check if a contract operation is payment-related
  const isPaymentContractOp = (op: Operation): boolean => {
    if (op.type !== 'invoke_host_function') return false;
    const functionName = decodeContractFunctionName(op).toLowerCase();
    const paymentTerms = ['transfer', 'withdraw', 'deposit', 'claim', 'swap', 'pay', 'send', 'mint', 'burn'];
    return paymentTerms.some(term => functionName.includes(term));
  };

  // Filter operations for payments and contracts
  const paymentOps = operations.filter(op =>
    op.type === 'payment' ||
    op.type === 'create_account' ||
    op.type === 'path_payment_strict_send' ||
    op.type === 'path_payment_strict_receive' ||
    isPaymentContractOp(op)
  );

  const contractOps = operations.filter(op =>
    op.type === 'invoke_host_function' ||
    op.type === 'extend_footprint_ttl' ||
    op.type === 'restore_footprint'
  );

  return (
    <div className="w-full bg-[#F5F5F7] min-h-screen pb-20 font-sans">
      <div className="w-full pt-6 px-4 max-w-2xl mx-auto">

        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-100 hover:bg-slate-50 transition-colors text-slate-900 shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <span className="font-bold text-lg text-slate-900">Account</span>
          <div className="w-10"></div>
        </div>

        {/* Profile Header */}
        <div className="flex flex-col gap-1 mb-8 px-1">
          <h1 className="text-xl font-bold text-slate-900 leading-tight">Stellar Account</h1>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-4xl font-bold text-slate-900 tracking-tight">
              ${totalValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Tab Navigation (Pills) */}
        <div className="flex gap-3 mb-8 overflow-x-auto no-scrollbar pb-2">
          <button
            onClick={() => setActiveTab('balances')}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'balances'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            Balances
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'activity'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            Activity
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'info'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            Details
          </button>
        </div>

        {/* Balances Tab */}
        {activeTab === 'balances' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-gray-900 text-lg font-semibold">Assets</h2>
              <span className="text-blue-600 text-sm font-semibold">
                {account.balances.length} {account.balances.length === 1 ? 'asset' : 'assets'}
              </span>
            </div>

            {/* XLM Balance Card */}
            <Link
              href="/asset/XLM"
              className="block bg-white rounded-2xl p-4 hover:bg-gray-50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-gray-900 font-bold text-base">Stellar Lumens</p>
                  <p className="text-gray-500 text-xs mt-0.5">XLM</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-900 font-bold text-lg">
                    {formatXLM(xlmBalance?.balance || '0')}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    ${(xlmAmount * xlmPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </Link>

            {/* Other Balances */}
            {otherBalances.map((balance, idx) => {
              const amount = parseFloat(balance.balance);

              return (
                <Link
                  key={idx}
                  href={getAssetUrl(balance.asset_code, balance.asset_issuer)}
                  className="block bg-white rounded-2xl p-4 hover:bg-gray-50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-gray-900 font-bold text-base">
                        {balance.asset_code || 'Liquidity Pool'}
                      </p>
                      {balance.asset_issuer && (
                        <p className="text-gray-500 text-xs font-mono mt-0.5">
                          {shortenAddress(balance.asset_issuer, 6)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-gray-900 font-bold text-lg">
                        {amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5 font-medium">
                        {(() => {
                          const key = `${balance.asset_code}:${balance.asset_issuer}`;
                          const price = assetPrices[key];
                          if (price) {
                            const val = amount * price;
                            return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                          }
                          return balance.asset_code || 'LP';
                        })()}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            {/* Activity Type Toggle */}
            <div className="flex p-1 bg-gray-200 rounded-xl overflow-x-auto">
              <button
                onClick={() => setActivityType('all')}
                className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${activityType === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setActivityType('payments')}
                className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${activityType === 'payments'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
                  }`}
              >
                Payments
              </button>
              <button
                onClick={() => setActivityType('contracts')}
                className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${activityType === 'contracts'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
                  }`}
              >
                Smart Contracts
              </button>
            </div>

            {/* Combined List */}
            <div className="space-y-3">
              {(() => {
                let displayOps = [];
                if (activityType === 'all') {
                  displayOps = [...operations].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                } else if (activityType === 'payments') {
                  displayOps = paymentOps;
                } else {
                  displayOps = contractOps;
                }

                if (displayOps.length === 0) {
                  return (
                    <div className="text-center py-12 bg-gray-100 rounded-2xl">
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-500">No transactions found</p>
                    </div>
                  );
                }

                return displayOps.slice(0, 30).map((op) => {
                  const isStandardPayment = ['payment', 'create_account', 'path_payment_strict_send', 'path_payment_strict_receive'].includes(op.type);
                  const isSwap = op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive';
                  const isOffer = op.type === 'manage_sell_offer' || op.type === 'manage_buy_offer';
                  const isContractPayment = isPaymentContractOp(op);
                  const isContract = ['invoke_host_function', 'extend_footprint_ttl', 'restore_footprint'].includes(op.type) && !isContractPayment;

                  // Determine Direction
                  const isSender = op.from === account.id || op.source_account === account.id;

                  // Get function name for contract payments
                  const contractFunctionName = isContractPayment ? decodeContractFunctionName(op) : '';
                  const isWithdraw = contractFunctionName.toLowerCase().includes('withdraw');
                  const isDeposit = contractFunctionName.toLowerCase().includes('deposit');

                  return (
                    <Link
                      key={op.id}
                      href={`/transaction/${op.transaction_hash}`}
                      className="block bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${!op.transaction_successful ? 'bg-red-50 border-red-100 text-red-600' :
                          isSwap ? 'bg-blue-50 border-blue-100 text-blue-600' :
                            isOffer ? 'bg-indigo-50 border-indigo-100 text-indigo-600' :
                              isContractPayment ? (isWithdraw ? 'bg-orange-50 border-orange-100 text-orange-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600') :
                                isContract ? 'bg-purple-50 border-purple-100 text-purple-600' :
                                  isSender ? 'bg-orange-50 border-orange-100 text-orange-600' :
                                    'bg-emerald-50 border-emerald-100 text-emerald-600'
                          }`}>
                          {!op.transaction_successful ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          ) : isSwap ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                          ) : isOffer ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                          ) : isContractPayment ? (
                            isWithdraw ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                            )
                          ) : isContract ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                          ) : isSender ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            {/* Type Label */}
                            <div className="flex flex-col">
                              <span className={`text-[10px] uppercase font-bold tracking-wider mb-0.5 ${!op.transaction_successful ? 'text-red-500' :
                                isSwap ? 'text-blue-500' :
                                  isOffer ? 'text-indigo-500' :
                                    isContractPayment ? (isWithdraw ? 'text-orange-500' : 'text-emerald-500') :
                                      isContract ? 'text-purple-500' :
                                        isSender ? 'text-orange-500' : 'text-emerald-500'
                                }`}>
                                {!op.transaction_successful ? 'Failed' :
                                  isSwap ? 'Swap' :
                                    isOffer ? 'Manage Offer' :
                                      isContractPayment ? contractFunctionName :
                                        isContract ? 'Smart Contract' :
                                          isSender ? 'Sent' : 'Received'}
                              </span>

                              {/* Main Value Display */}
                              {isSwap ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-gray-900">
                                    {formatXLM((op as any).source_amount || '0')}
                                    <span className="text-xs text-gray-500 ml-1">{(op as any).source_asset_code || 'XLM'}</span>
                                  </span>
                                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                  <span className="font-bold text-gray-900">
                                    {formatXLM(op.amount || '0')}
                                    <span className="text-xs text-gray-500 ml-1">{op.asset_code || 'XLM'}</span>
                                  </span>
                                </div>
                              ) : isOffer ? (
                                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 w-full mt-2 text-sm">
                                  <span className="font-medium text-slate-400">Selling</span>
                                  <span className="font-bold text-slate-900 text-right truncate">
                                    {formatXLM(op.amount || '0')} <span className="text-slate-500 font-normal ml-0.5">{(op as any).selling_asset_code || 'XLM'}</span>
                                  </span>

                                  <span className="font-medium text-slate-400">Buying</span>
                                  <span className="font-bold text-slate-900 text-right truncate">
                                    {(op as any).buying_asset_code || 'XLM'}
                                  </span>

                                  <span className="font-medium text-slate-400">Price</span>
                                  <span className="font-mono text-slate-600 text-right text-xs pt-0.5">
                                    @ {(op as any).price} <span className="text-slate-400">{(op as any).buying_asset_code}/{((op as any).selling_asset_code || 'XLM')}</span>
                                  </span>
                                </div>
                              ) : isContractPayment ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-gray-500 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">via Smart Contract</span>
                                </div>
                              ) : isContract ? (
                                <span className="font-bold text-gray-900 text-sm">{decodeContractFunctionName(op)}</span>
                              ) : (
                                <span className="font-bold text-gray-900 text-base">
                                  {formatXLM(op.amount || op.starting_balance || '0')}
                                  <span className="text-xs text-gray-500 ml-1">{op.asset_code || (op.type === 'create_account' ? 'XLM' : 'XLM')}</span>
                                </span>
                              )}
                            </div>

                            {/* Timestamp */}
                            <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap ml-2">{timeAgo(op.created_at)}</span>
                          </div>

                          {/* Address / Subtext */}
                          {(op.from || op.to || op.funder || op.account) && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                              {isSender ? (
                                <>
                                  <span>To:</span>
                                  <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                                    {shortenAddress(op.to || op.account || 'Unknown', 6)}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span>From:</span>
                                  <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                                    {shortenAddress(op.from || op.funder || 'Unknown', 6)}
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })
              })()}
            </div>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            <h2 className="text-gray-900 text-lg font-semibold mb-4">Account Details</h2>

            {/* Account ID */}
            <div className="bg-gray-100 rounded-2xl p-4">
              <p className="text-gray-500 text-sm mb-2">Account ID</p>
              <p className="text-gray-900 font-mono text-xs break-all">{account.id}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-100 rounded-2xl p-4">
                <p className="text-gray-500 text-sm mb-1">Sequence</p>
                <p className="text-gray-900 font-bold text-lg">{account.sequence}</p>
              </div>
              <div className="bg-gray-100 rounded-2xl p-4">
                <p className="text-gray-500 text-sm mb-1">Subentries</p>
                <p className="text-gray-900 font-bold text-lg">{account.subentry_count}</p>
              </div>
              <div className="bg-gray-100 rounded-2xl p-4">
                <p className="text-gray-500 text-sm mb-1">Signers</p>
                <p className="text-gray-900 font-bold text-lg">{account.signers.length}</p>
              </div>
              <div className="bg-gray-100 rounded-2xl p-4">
                <p className="text-gray-500 text-sm mb-1">Last Ledger</p>
                <Link
                  href={`/ledger/${account.last_modified_ledger}`}
                  className="text-blue-600 font-bold text-lg hover:underline"
                >
                  #{account.last_modified_ledger.toLocaleString()}
                </Link>
              </div>
            </div>

            {/* Thresholds */}
            <div className="bg-gray-100 rounded-2xl p-4">
              <p className="text-gray-500 text-sm mb-3">Thresholds</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-gray-500 text-xs mb-1">Low</p>
                  <p className="text-gray-900 font-bold text-xl">{account.thresholds.low_threshold}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-xs mb-1">Medium</p>
                  <p className="text-gray-900 font-bold text-xl">{account.thresholds.med_threshold}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-xs mb-1">High</p>
                  <p className="text-gray-900 font-bold text-xl">{account.thresholds.high_threshold}</p>
                </div>
              </div>
            </div>

            {/* Home Domain */}
            {account.home_domain && (
              <div className="bg-gray-100 rounded-2xl p-4">
                <p className="text-gray-500 text-sm mb-2">Home Domain</p>
                <p className="text-gray-900 font-semibold">{account.home_domain}</p>
              </div>
            )}

            {/* Flags */}
            <div className="bg-gray-100 rounded-2xl p-4">
              <p className="text-gray-500 text-sm mb-3">Flags</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Auth Required', active: account.flags.auth_required },
                  { label: 'Revocable', active: account.flags.auth_revocable },
                  { label: 'Immutable', active: account.flags.auth_immutable },
                  { label: 'Clawback', active: account.flags.auth_clawback_enabled },
                ].map((flag) => (
                  <span
                    key={flag.label}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold ${flag.active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-200 text-gray-500'
                      }`}
                  >
                    {flag.active ? '✓' : '✗'} {flag.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
