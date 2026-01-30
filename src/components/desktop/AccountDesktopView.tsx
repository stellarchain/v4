'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Transaction, Operation, Effect, shortenAddress, timeAgo, formatXLM } from '@/lib/stellar';

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

interface AccountDesktopViewProps {
  account: AccountData;
  transactions: Transaction[];
  operations: Operation[];
  xlmPrice: number;
  accountLabels?: Record<string, { name: string; verified: boolean; org_name: string | null; description: string | null }>;
  currentAccountLabel?: { name: string; verified: boolean; org_name: string | null; description: string | null } | null;
}

function getAssetUrl(code: string | undefined, issuer: string | undefined): string {
  if (!code || code === 'native') return '/asset/XLM';
  if (code === 'XLM' && !issuer) return '/asset/XLM';
  return `/asset/${encodeURIComponent(code)}${issuer ? `?issuer=${encodeURIComponent(issuer)}` : ''}`;
}

export default function AccountDesktopView({ account, transactions, operations, xlmPrice, accountLabels = {}, currentAccountLabel }: AccountDesktopViewProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'operations' | 'details'>('operations');
  const [assetPrices, setAssetPrices] = useState<Record<string, number>>({});
  const [opEffects, setOpEffects] = useState<Record<string, Effect[]>>({});
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    const fetchEffects = async () => {
      // Fetch effects for visible operations that we haven't fetched yet
      const currentVisibleOps = operations.slice(0, visibleCount);
      const opsToFetch = currentVisibleOps.filter(op => !opEffects[op.id]);

      if (opsToFetch.length === 0) return;

      const newEffects: Record<string, Effect[]> = {};

      await Promise.all(opsToFetch.map(async (op) => {
        try {
          const res = await fetch(`https://horizon.stellar.org/operations/${op.id}/effects`);
          const data = await res.json();
          if (data._embedded && data._embedded.records) {
            newEffects[op.id] = data._embedded.records;
          }
        } catch {
          // ignore
        }
      }));

      if (Object.keys(newEffects).length > 0) {
        setOpEffects(prev => ({ ...prev, ...newEffects }));
      }
    };

    fetchEffects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operations, account.id, visibleCount]);

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
  }, [account, xlmPrice]);

  const handleCopy = () => {
    navigator.clipboard.writeText(account.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const decodeContractFunctionName = (op: Operation): string => {
    try {
      const parameters = op.parameters as Array<{ type: string; value: string }> | undefined;
      if (!parameters) return 'Contract Call';
      const symParam = parameters.find(p => p.type === 'Sym');
      if (!symParam) return 'Contract Call';
      const decoded = atob(symParam.value);
      // Filter out non-printable characters and extract clean function name
      return decoded.replace(/[^\x20-\x7E]/g, '').trim() || 'Contract Call';
    } catch {
      return 'Contract Call';
    }
  };

  const getAmountFromEffects = (effects: Effect[] | undefined) => {
    if (!effects || effects.length === 0) return null;

    const credit = effects.find(e => e.type === 'account_credited' && e.account === account.id && (e as any).amount);
    const debit = effects.find(e => e.type === 'account_debited' && e.account === account.id && (e as any).amount);

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

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <div className="max-w-[1600px] mx-auto px-6 pb-8 pt-2">
        {/* Top Navigation Bar */}
        <div className="h-16 flex items-center justify-between border-b border-slate-100 mb-2">
          <Link href="/" className="flex items-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Explorer
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('details')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-[11px] font-bold hover:bg-slate-800 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View Account Details
            </button>
            <div className="flex items-center bg-emerald-50 px-3 py-1.5 rounded-md text-[10px] font-bold text-emerald-600 border border-emerald-100">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></span>
              MAINNET
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Overview & Balances */}
          <div className="lg:col-span-5 space-y-8">
            {/* Account Header */}
            <header>
              <div className="flex flex-col gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Account Overview</h1>
                    <span className="px-2 py-1 rounded bg-slate-100 text-[10px] font-bold tracking-widest text-slate-500 border border-slate-200">G-ADDR</span>
                  </div>
                  <div className="flex items-center group">
                    <code className="text-sm font-medium text-slate-400 break-all leading-tight">
                      {account.id}
                    </code>
                    <button
                      onClick={handleCopy}
                      className="ml-3 p-1.5 rounded-md text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-all opacity-0 group-hover:opacity-100 relative"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8m-8-4h8m-8-4h8M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H8l-4 4v10a2 2 0 002 2z" />
                      </svg>
                      {copied && (
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg font-bold">
                          Copied!
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 py-8 border-y border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Net Worth</span>
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                        ${totalValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-emerald-500 font-bold text-xs flex items-center bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        1.2%
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center border-l border-slate-100 pl-8">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Lumen Balance</span>
                    <span className="text-2xl font-bold text-slate-700 tracking-tight">{formatXLM(xlmBalance?.balance || '0')} XLM</span>
                  </div>
                </div>
              </div>
            </header>

            {/* Balances & Assets */}
            <section>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-6 block">Balances & Assets</span>
              <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
                {/* XLM Balance */}
                <Link href="/asset/XLM" className="flex justify-between items-center py-4 group hover:bg-slate-50 transition-colors -mx-4 px-4 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">XLM</div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">Stellar Lumens</h4>
                      <span className="text-[11px] text-slate-400 font-medium">Stellar Native Asset</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-slate-900">${(xlmAmount * xlmPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-[11px] text-slate-400 font-medium font-mono">{formatXLM(xlmBalance?.balance || '0')} XLM</p>
                  </div>
                </Link>

                {/* Other Assets */}
                {otherBalances.map((balance, idx) => {
                  const amount = parseFloat(balance.balance);
                  const isUSDC = balance.asset_code === 'USDC';
                  const bgColors = ['bg-blue-600', 'bg-purple-600', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500'];
                  const colorIdx = (balance.asset_code || '').length % bgColors.length;
                  const key = `${balance.asset_code}:${balance.asset_issuer}`;
                  const price = assetPrices[key];
                  const value = price ? amount * price : 0;

                  return (
                    <Link
                      key={idx}
                      href={getAssetUrl(balance.asset_code, balance.asset_issuer)}
                      className="flex justify-between items-center py-4 group hover:bg-slate-50 transition-colors -mx-4 px-4 rounded-xl"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full ${isUSDC ? 'bg-[#2775CA]' : bgColors[colorIdx]} text-white flex items-center justify-center font-bold text-xs shadow-sm`}>
                          {balance.asset_code ? balance.asset_code.substring(0, 4) : 'LP'}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">{balance.asset_code || 'Liquidity Pool'}</h4>
                          <span className="text-[11px] text-slate-400 font-medium truncate max-w-[200px] block">
                            {balance.asset_issuer ? shortenAddress(balance.asset_issuer, 10) : 'Unknown Issuer'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-slate-900">${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="text-[11px] text-slate-400 font-medium font-mono">
                          {amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {balance.asset_code}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right Column: Recent Activity */}
          <div className="lg:col-span-7">
            <section className="h-full flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-8 block">Recent Activity</span>
              <div className="relative pl-8 border-l-2 border-slate-100 space-y-8 flex-1">
                {operations.slice(0, visibleCount).map((op) => {
                  const effects = opEffects[op.id];
                  const effectInfo = getAmountFromEffects(effects);
                  const isSwap = op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive';
                  const isPayment = op.type === 'payment' || op.type === 'create_account';
                  const isContract = op.type === 'invoke_host_function';

                  let title = op.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                  let subtitle = `Transaction ${shortenAddress(op.transaction_hash, 8)}`;
                  let amountDisplay = '';
                  let timeDisplay = timeAgo(op.created_at);
                  let colorClass = 'bg-slate-300';
                  let amountClass = 'text-slate-900';

                  if (effectInfo) {
                    if (effectInfo.type === 'received') {
                      title = `Received ${effectInfo.asset}`;
                      subtitle = `From ${shortenAddress(op.source_account, 8)}`;
                      amountDisplay = `+${formatXLM(effectInfo.amount)} ${effectInfo.asset}`;
                      colorClass = 'bg-emerald-500';
                      amountClass = 'text-emerald-500';
                    } else {
                      title = `Sent ${effectInfo.asset}`;
                      subtitle = `To ${shortenAddress(op.to || (op as any).into || 'Unknown', 8)}`;
                      amountDisplay = `-${formatXLM(effectInfo.amount)} ${effectInfo.asset}`;
                      colorClass = 'bg-orange-500';
                      amountClass = 'text-orange-500';
                    }
                  } else if (isSwap) {
                    title = 'Trade Complete';
                    subtitle = 'Asset Swap via SDEX';
                    const destAsset = op.asset_type === 'native' ? 'XLM' : op.asset_code || 'XLM';
                    amountDisplay = `+${formatXLM(op.amount || '0')} ${destAsset}`;
                    colorClass = 'bg-blue-500';
                  } else if (isContract) {
                    const functionName = decodeContractFunctionName(op);
                    title = functionName !== 'Contract Call' ? functionName : 'Contract Interaction';
                    subtitle = 'Smart Contract Call';
                    colorClass = 'bg-purple-500';
                  }

                  return (
                    <div key={op.id} className="relative group">
                      <div className={`absolute -left-[37px] top-1.5 w-4 h-4 rounded-full border-[3px] border-white ring-1 ring-slate-100 ${colorClass}`}></div>
                      <Link href={`/transaction/${op.transaction_hash}`} className="flex justify-between items-start hover:bg-slate-50 -my-2 -mx-4 p-4 rounded-xl transition-colors">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 mb-0.5">{title}</h4>
                          <p className="text-slate-400 text-[11px] font-medium">{subtitle}</p>
                        </div>
                        <div className="text-right">
                          {amountDisplay && <p className={`font-bold text-sm ${amountClass}`}>{amountDisplay}</p>}
                          <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-wide">{timeDisplay}</p>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>

              {visibleCount < operations.length && (
                <div className="mt-8 pl-8">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 10)}
                    className="w-full py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 uppercase tracking-wider hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    View More Activity
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Footer */}
        <footer className="py-12 text-center border-t border-slate-100 mt-12">
          <p className="text-[11px] text-slate-400 font-bold tracking-tight">
            © 2024 StellarChain Explorer
          </p>
        </footer>
      </div>

      {/* Account Details Modal */}
      {activeTab === 'details' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setActiveTab('operations')}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-100 scale-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-base text-slate-900">Account Information</h3>
              <button onClick={() => setActiveTab('operations')} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-y-6">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sequence ID</span>
                  <p className="text-sm font-bold font-mono tracking-tight text-slate-900 bg-slate-50 p-2 rounded border border-slate-100">{account.sequence}</p>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sub-Entries</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(Math.min(account.subentry_count, 1000) / 1000) * 100}%` }}></div>
                    </div>
                    <p className="text-xs font-bold text-slate-700">{account.subentry_count} <span className="text-slate-400">/ 1000</span></p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Signers & Thresholds</span>
                  <div className="flex gap-2 mt-1">
                    <div className="px-3 py-1.5 bg-slate-50 rounded-lg text-xs font-bold border border-slate-100 text-slate-600">Low: <span className="text-slate-900">{account.thresholds.low_threshold}</span></div>
                    <div className="px-3 py-1.5 bg-slate-50 rounded-lg text-xs font-bold border border-slate-100 text-slate-600">Med: <span className="text-slate-900">{account.thresholds.med_threshold}</span></div>
                    <div className="px-3 py-1.5 bg-slate-50 rounded-lg text-xs font-bold border border-slate-100 text-slate-600">High: <span className="text-slate-900">{account.thresholds.high_threshold}</span></div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Flags</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Object.entries(account.flags).map(([flag, enabled]) => (
                      enabled && (
                        <span key={flag} className="px-2 py-1 bg-blue-50 rounded text-[9px] font-bold text-blue-600 border border-blue-100 uppercase tracking-wider">
                          {flag.replace('auth_', '').replace(/_/g, ' ')}
                        </span>
                      )
                    ))}
                    {!Object.values(account.flags).some(Boolean) && (
                      <span className="text-xs text-slate-400 italic">No flags set</span>
                    )}
                  </div>
                </div>
                {account.home_domain && (
                  <div className="space-y-1.5 pt-4 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Home Domain</span>
                    <a href={`https://${account.home_domain}`} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
                      {account.home_domain}
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 text-right border-t border-slate-100">
              <button
                onClick={() => setActiveTab('operations')}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
