'use client';

import { useState } from 'react';
import Link from 'next/link';
import { shortenAddress, timeAgo, getOperationTypeLabel, formatDate, formatXLM } from '@/lib/stellar';
import SimpleMobileHeader from './SimpleMobileHeader';

interface Operation {
  id: string;
  type: string;
  source_account: string;
  transaction_successful: boolean;
  created_at: string;
  amount?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  to?: string;
  from?: string;
  starting_balance?: string;
  [key: string]: unknown;
}

interface Effect {
  id: string;
  type: string;
  account: string;
  amount?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
}

interface TransactionData {
  hash: string;
  source_account: string;
  source_account_sequence?: string;
  successful: boolean;
  created_at: string;
  ledger: number;
  operation_count: number;
  fee_charged: string;
  max_fee: string;
  memo?: string;
  memo_type: string;
  signatures: string[];
  envelope_xdr: string;
  result_xdr: string;
  result_meta_xdr?: string;
  fee_meta_xdr?: string;
}

interface TransactionMobileViewProps {
  transaction: TransactionData;
  operations: Operation[];
  effects: Effect[];
}

export default function TransactionMobileView({ transaction, operations, effects }: TransactionMobileViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'operations' | 'effects' | 'details' | 'raw'>(
    (operations.length > 0 && operations[0].type === 'invoke_host_function') ? 'effects' : 'operations'
  );
  const [copied, setCopied] = useState(false);
  const [expandFrom, setExpandFrom] = useState(false);
  const [expandTo, setExpandTo] = useState(false);

  // Find ALL transfer operations to support multi-asset/batch transfers
  const transferOps = operations.filter(op =>
    ['payment', 'create_account', 'path_payment_strict_send', 'path_payment_strict_receive'].includes(op.type)
  );

  const primaryOp = transferOps[0];
  const isMultiTransfer = transferOps.length > 1;

  // Check if all batch ops are for the same asset
  const isSameAsset = isMultiTransfer && transferOps.every(op =>
    (op.asset_type === transferOps[0].asset_type) &&
    (op.asset_code === transferOps[0].asset_code) &&
    (op.asset_issuer === transferOps[0].asset_issuer)
  );

  const totalBatchAmount = isMultiTransfer ? transferOps.reduce((sum, op) => sum + parseFloat(op.amount || '0'), 0) : 0;

  // Check if this is a transfer transaction
  const isTransfer = transferOps.length > 0 && primaryOp?.amount && primaryOp?.to;

  // Detect and parse DEX swap from effects
  const detectDEXSwap = () => {
    const liquidityTrade = effects.find(ef => ef.type === 'liquidity_pool_trade' || ef.type === 'trade');

    if (!liquidityTrade) return null;

    // Attempt to find pool ID if it exists in the trade effect
    const poolId = (liquidityTrade as any).liquidity_pool_id || (liquidityTrade as any).liquidity_pool?.id;

    const debited = effects.find(ef => ef.type === 'account_debited' && ef.amount);
    const credited = effects.find(ef => ef.type === 'account_credited' && ef.amount);

    if (debited && credited) {
      const fromAsset = debited.asset_type === 'native' ? 'XLM' : debited.asset_code || 'Unknown';
      const toAsset = credited.asset_type === 'native' ? 'XLM' : credited.asset_code || 'Unknown';

      return {
        fromAmount: debited.amount,
        fromAsset,
        toAmount: credited.amount,
        toAsset,
        account: debited.account,
        poolId
      };
    }

    return null;
  };

  const dexSwap = detectDEXSwap();

  const offerOp = operations.length === 1 && (
    operations[0].type === 'manage_sell_offer' ||
    operations[0].type === 'manage_buy_offer' ||
    operations[0].type === 'create_passive_sell_offer'
  ) ? operations[0] : null;

  // Logic to summarize effects (Sent/Received) from smart contracts
  const getEffectsSummary = () => {
    // Check effects regardless of operation type to ensure we capture Swaps/Contracts that might be complex
    // if (operations.length > 0 && operations[0].type !== 'invoke_host_function') return null;

    const debit = effects.find(ef => ef.type === 'account_debited' && ef.amount);
    const credit = effects.find(ef => ef.type === 'account_credited' && ef.amount);

    const sent = debit ? {
      amount: debit.amount!,
      asset: debit.asset_type === 'native' ? 'XLM' : debit.asset_code || 'Unknown',
      account: debit.account
    } : undefined;

    const received = credit ? {
      amount: credit.amount!,
      asset: credit.asset_type === 'native' ? 'XLM' : credit.asset_code || 'Unknown',
      recipient: credit.account
    } : undefined;

    if (!sent && !received) return null;
    return { sent, received };
  };
  const effectsSummary = getEffectsSummary();

  const handleCopy = () => {
    navigator.clipboard.writeText(transaction.hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const feeXLM = (parseInt(transaction.fee_charged) / 10000000).toFixed(7);

  // Helper to decode contract function name
  const decodeContractFunctionName = (op: Operation): string => {
    try {
      const parameters = op.parameters as Array<{ type: string; value: string }> | undefined;
      if (!parameters) return 'Contract Call';

      const symParam = parameters.find(p => p.type === 'Sym');
      if (!symParam) return 'Contract Call';

      const decoded = atob(symParam.value);
      const functionName = decoded.slice(5).replace(/\0/g, ''); // Skip length prefix
      return functionName || 'Contract Call';
    } catch {
      return 'Contract Call';
    }
  };

  return (
    <div className="w-full bg-[var(--bg-primary)] min-h-screen pb-20 font-sans">
      <div className="w-full pt-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-2 px-4">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Transaction</h1>
          <Link
            href="/transactions"
            className="flex items-center gap-1 text-[var(--text-tertiary)] font-medium text-sm hover:text-[var(--text-primary)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
        </div>

        {/* Timestamp */}
        <div className="px-4 mb-6">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-mono">{formatDate(transaction.created_at)}</span>
            <span className="text-gray-400">•</span>
            <span>{timeAgo(transaction.created_at)}</span>
          </div>
        </div>

        {/* Conditional Layout: DEX Swap, Transfer, or Non-Transfer */}
        {dexSwap ? (
          // DEX SWAP LAYOUT: Two Separate Cards with Center Button
          <div className="relative px-4">

            {/* Minimal Header */}
            <div className="flex items-center justify-center mb-6 opacity-50">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                DEX Swap
              </span>
            </div>

            <div className="relative space-y-3">
              {/* Sold Card */}
              <div className="bg-[#F8FAFC] rounded-[24px] p-6 border border-slate-100 shadow-sm relative z-0">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-slate-400">Swap</span>
                  <div className="bg-slate-200/50 px-2 py-1 rounded-lg">
                    <span className="text-xs font-bold text-slate-500">Sold</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Placeholder Icon if we don't have one, or just the code */}
                    <span className="text-2xl font-bold text-slate-900">{dexSwap.fromAsset}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-900 tracking-tight">
                      {parseFloat(dexSwap.fromAmount || '0').toLocaleString(undefined, { maximumFractionDigits: 7 })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Central Swap Button */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="w-12 h-12 bg-blue-600 rounded-full shadow-xl flex items-center justify-center border-4 border-white transition-transform active:scale-95">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </div>
              </div>

              {/* Received Card */}
              <div className="bg-[#F8FAFC] rounded-[24px] p-6 border border-slate-100 shadow-sm relative z-0">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-slate-400">Receive</span>
                  <div className="bg-slate-200/50 px-2 py-1 rounded-lg">
                    <span className="text-xs font-bold text-slate-500">Bought</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-slate-900">{dexSwap.toAsset}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-900 tracking-tight">
                      {parseFloat(dexSwap.toAmount || '0').toLocaleString(undefined, { maximumFractionDigits: 7 })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Info - simplified */}
            <div className="mt-6 flex flex-col gap-3 items-center">
              <Link href={`/account/${dexSwap.account}`} className="group flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100 hover:border-slate-200 transition-colors w-max">
                <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-500">Trader:</span>
                <span className="text-sm font-mono font-bold text-blue-600 group-hover:text-blue-700">
                  {shortenAddress(dexSwap.account, 8)}
                </span>
              </Link>


            </div>

          </div>
        ) : isTransfer ? (
          // TRANSFER LAYOUT: Two-card design
          <div className="relative space-y-2">
            {/* FROM Card - Mint Green */}
            <div className="bg-[#D1FAE5] rounded-[32px] p-6 pb-10 relative z-10 transition-transform shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 bg-white/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] text-white font-bold">
                    F
                  </div>
                  <span className="text-sm font-semibold text-emerald-900">From Account</span>
                  <svg className="w-3 h-3 text-emerald-800" fill="none" strokeWidth={2.5} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </div>
                {primaryOp?.amount && !isMultiTransfer && (
                  <div className="bg-white/60 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-900 shadow-sm">
                    {primaryOp?.asset_type === 'native' ? 'XLM' : primaryOp?.asset_code || 'XLM'}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-end px-1">
                {isMultiTransfer ? (
                  <div className="w-full">
                    {isSameAsset ? (
                      <div className="mb-2">
                        <div className="flex justify-between items-baseline border-b border-emerald-900/10 pb-2 mb-1">
                          <span className="text-4xl font-bold text-emerald-950 tracking-tighter">
                            {totalBatchAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                          </span>
                          <span className="text-xl font-bold text-emerald-900">
                            {primaryOp?.asset_type === 'native' ? 'XLM' : primaryOp?.asset_code || 'XLM'}
                          </span>
                        </div>
                        <div className="text-xs text-emerald-800/70 font-medium italic text-right">
                          Batch of {transferOps.length} transfers
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col gap-2 mb-2">
                          {transferOps.slice(0, expandFrom ? undefined : 3).map((op, idx) => (
                            <div key={idx} className="flex justify-between items-baseline border-b border-emerald-900/10 pb-1 last:border-0 last:pb-0">
                              <span className="text-3xl font-bold text-emerald-950 tracking-tighter">
                                {parseFloat(op.amount || '0').toLocaleString(undefined, { maximumFractionDigits: 4 })}
                              </span>
                              <span className="text-lg font-bold text-emerald-900">
                                {op.asset_type === 'native' ? 'XLM' : op.asset_code || 'XLM'}
                              </span>
                            </div>
                          ))}
                        </div>
                        {transferOps.length > 3 && (
                          <button
                            onClick={() => setExpandFrom(!expandFrom)}
                            className="text-xs text-emerald-800/70 font-medium italic text-right mb-1 hover:text-emerald-950 underline decoration-dotted underline-offset-2 w-full flex justify-end"
                          >
                            {expandFrom ? 'Show less' : `+ ${transferOps.length - 3} more`}
                          </button>
                        )}
                      </>
                    )}
                    <div className="mt-1 flex items-center gap-1">
                      <Link href={`/account/${transaction.source_account}`} className="text-sm font-mono text-emerald-800/70 hover:text-emerald-950 transition-colors">
                        {shortenAddress(transaction.source_account, 8)}
                      </Link>
                      <span className="text-emerald-800/60 font-medium text-xs">~ sent</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-emerald-950 tracking-tighter">
                          {parseFloat(primaryOp.amount!).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </span>
                        <span className="text-emerald-800/60 font-medium text-sm">~ sent</span>
                      </div>
                      <div className="mt-1">
                        <Link href={`/account/${transaction.source_account}`} className="text-sm font-mono text-emerald-800/70 hover:text-emerald-950 transition-colors flex items-center gap-1">
                          {shortenAddress(transaction.source_account, 8)}
                        </Link>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-xl font-bold text-emerald-900">
                        {primaryOp?.asset_type === 'native' ? 'XLM' : primaryOp?.asset_code || 'XLM'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Floating Connector */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <div className="w-10 h-10 bg-black text-white rounded-xl shadow-xl flex items-center justify-center border-[3px] border-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </div>
            </div>

            {/* TO Card - Cream Yellow */}
            <div className="bg-[#FEF9C3] rounded-[32px] p-6 pt-10 relative z-0 transition-transform -mt-5 shadow-sm">
              <div className="flex justify-between items-start mb-4 pt-1">
                <div className="flex items-center gap-2 bg-white/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
                  <div className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center text-[8px] text-white font-bold">
                    T
                  </div>
                  <span className="text-sm font-semibold text-yellow-900">To Destination</span>
                  <svg className="w-3 h-3 text-yellow-800" fill="none" strokeWidth={2.5} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </div>
                {primaryOp?.amount && !isMultiTransfer && (
                  <div className="bg-white/60 px-3 py-1.5 rounded-full text-xs font-bold text-yellow-900 shadow-sm">
                    {primaryOp?.asset_type === 'native' ? 'XLM' : primaryOp?.asset_code || 'XLM'}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-end px-1 pb-1">
                {isMultiTransfer ? (
                  <div className="w-full">
                    <div className="flex flex-col gap-3 mb-2">
                      {transferOps.slice(0, expandTo ? undefined : 3).map((op, idx) => (
                        <div key={idx} className="flex justify-between items-baseline border-b border-yellow-900/10 last:border-0 pb-1 last:pb-0">
                          <span className="text-3xl font-bold text-yellow-950 tracking-tighter">
                            {parseFloat(op.amount || '0').toLocaleString(undefined, { maximumFractionDigits: 4 })}
                          </span>
                          <span className="text-lg font-bold text-yellow-900">
                            {op.asset_type === 'native' ? 'XLM' : op.asset_code || 'XLM'}
                          </span>
                        </div>
                      ))}
                    </div>
                    {transferOps.length > 3 && (
                      <button
                        onClick={() => setExpandTo(!expandTo)}
                        className="text-xs text-yellow-800/70 font-medium italic text-right mb-2 hover:text-yellow-950 underline decoration-dotted underline-offset-2 w-full flex justify-end"
                      >
                        {expandTo ? 'Show less' : `+ ${transferOps.length - 3} more assets`}
                      </button>
                    )}
                    <div className="mt-1">
                      <Link href={`/account/${primaryOp!.to}`} className="text-sm font-mono text-yellow-900/70 hover:text-yellow-950 transition-colors">
                        {transferOps.every(op => op.to === primaryOp!.to) ? shortenAddress(primaryOp!.to!, 8) : 'Multiple Recipients'}
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-yellow-950 tracking-tighter">
                          {parseFloat(primaryOp!.amount!).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </span>
                      </div>
                      <div className="mt-1">
                        <Link href={`/account/${primaryOp!.to}`} className="text-sm font-mono text-yellow-900/70 hover:text-yellow-950 transition-colors">
                          {shortenAddress(primaryOp!.to!, 8)}
                        </Link>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-xl font-bold text-yellow-900">
                        {primaryOp?.asset_type === 'native' ? 'XLM' : primaryOp?.asset_code || 'XLM'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          // NON-TRANSFER LAYOUT: Single card design
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-[32px] p-8 shadow-sm border border-slate-200">
              <div className="mb-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Transaction Type</h3>
                  <p className="text-xl font-bold text-slate-900 capitalize mt-0.5">
                    {operations.length === 1
                      ? (operations[0].type === 'invoke_host_function'
                        ? decodeContractFunctionName(operations[0])
                        : getOperationTypeLabel(operations[0].type))
                      : `${transaction.operation_count} Operations`
                    }
                  </p>
                  {operations.length === 1 && operations[0].type === 'invoke_host_function' && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-bold uppercase tracking-wide">
                      Smart Contract
                    </span>
                  )}
                </div>

                {offerOp && (
                  <div className="mt-5 mb-1">
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-slate-200/20 rounded-full blur-2xl -mr-8 -mt-8"></div>

                      <div className="relative z-10">
                        {/* Primary Action Section */}
                        <div className="mb-4">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${offerOp.type === 'manage_buy_offer' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                            {offerOp.type === 'manage_buy_offer' ? 'Buying' : 'Selling'}
                          </p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-slate-900 tracking-tighter">
                              {parseFloat(offerOp.amount || '0').toLocaleString()}
                            </span>
                            <span className="text-lg font-bold text-slate-500">
                              {offerOp.type === 'manage_buy_offer' ? ((offerOp as any).buying_asset_code || 'XLM') : ((offerOp as any).selling_asset_code || 'XLM')}
                            </span>
                          </div>
                        </div>

                        {/* Divider / Price */}
                        <div className="flex items-center gap-3 my-4">
                          <div className="h-px flex-1 bg-slate-200"></div>
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-100 shadow-sm">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Price</span>
                            <span className="text-xs font-mono font-bold text-slate-700">
                              {(offerOp as any).price}
                            </span>
                          </div>
                          <div className="h-px flex-1 bg-slate-200"></div>
                        </div>

                        {/* Counter Asset Section */}
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${offerOp.type === 'manage_buy_offer' ? 'bg-red-400' : 'bg-emerald-400'}`}></span>
                            {offerOp.type === 'manage_buy_offer' ? 'With' : 'For'}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xl font-bold text-slate-900">
                              {offerOp.type === 'manage_buy_offer' ? ((offerOp as any).selling_asset_code || 'XLM') : ((offerOp as any).buying_asset_code || 'XLM')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {effectsSummary?.sent && (
                  <div className="mt-5 mb-1">
                    <div className="bg-orange-50 rounded-2xl p-5 border border-orange-100/50 shadow-sm flex justify-between items-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-orange-200/20 rounded-full blur-xl -mr-4 -mt-4"></div>
                      <div className="relative z-10 flex flex-col">
                        <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                          Sent
                        </p>
                        <p className="text-3xl font-bold text-orange-950 tracking-tight leading-none">
                          {parseFloat(effectsSummary.sent.amount).toLocaleString(undefined, { maximumFractionDigits: 7 })}
                        </p>
                        {effectsSummary.sent.account && effectsSummary.sent.account !== transaction.source_account && (
                          <Link href={`/account/${effectsSummary.sent.account}`} className="text-[10px] font-mono text-orange-700/60 mt-0.5 hover:text-orange-800 transition-colors w-fit">
                            from {shortenAddress(effectsSummary.sent.account, 4)}
                          </Link>
                        )}
                      </div>
                      <div className="relative z-10 bg-white px-3 py-1.5 rounded-xl text-orange-950 font-bold text-sm shadow-sm border border-orange-50">
                        {effectsSummary.sent.asset}
                      </div>
                    </div>
                  </div>
                )}

                {effectsSummary?.received && (!effectsSummary.sent || effectsSummary.sent.asset !== effectsSummary.received.asset) && (
                  <div className="mt-5 mb-1">
                    <div className="bg-[#ECFDF5] rounded-2xl p-5 border border-emerald-100/50 shadow-sm flex justify-between items-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-200/20 rounded-full blur-xl -mr-4 -mt-4"></div>

                      <div className="relative z-10 flex flex-col">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                          Received
                        </p>
                        <p className="text-3xl font-bold text-emerald-950 tracking-tight leading-none">
                          {parseFloat(effectsSummary.received.amount).toLocaleString(undefined, { maximumFractionDigits: 7 })}
                        </p>
                        {effectsSummary.received.recipient !== transaction.source_account && (
                          <Link href={`/account/${effectsSummary.received.recipient}`} className="text-[10px] font-mono text-emerald-700/60 mt-0.5 hover:text-emerald-800 transition-colors w-fit">
                            to {shortenAddress(effectsSummary.received.recipient, 4)}
                          </Link>
                        )}
                      </div>
                      <div className="relative z-10 bg-white px-3 py-1.5 rounded-xl text-emerald-950 font-bold text-sm shadow-sm border border-emerald-50">
                        {effectsSummary.received.asset}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">Source Account</span>
                  <Link href={`/account/${transaction.source_account}`} className="text-sm font-mono font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                    {shortenAddress(transaction.source_account, 8)}
                  </Link>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">Operations</span>
                  <span className="text-sm font-bold text-slate-900">{transaction.operation_count}</span>
                </div>
                {operations[0]?.type && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-600">Primary Type</span>
                    <span className="text-sm font-bold text-slate-900 capitalize">{getOperationTypeLabel(operations[0].type)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Network Fee - Small & Centered */}
        <div className="flex justify-center items-center mt-6 gap-2 opacity-70 hover:opacity-100 transition-opacity">
          <span className="text-xs font-medium text-slate-500">Network Fee</span>
          <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{feeXLM} XLM</span>
        </div>

        {/* Status Button */}
        <div className="mt-3">
          <div className={`w-full py-4 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${transaction.successful ? 'bg-black' : 'bg-red-600'
            }`}>
            {transaction.successful ? 'Transaction Successful' : 'Transaction Failed'}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8">
          <div className="flex gap-4 border-b border-gray-100 pb-2 mb-4 px-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('operations')}
              className={`pb-2 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'operations' ? 'text-black border-b-2 border-black' : 'text-gray-400'}`}
            >
              Operations
            </button>
            <button
              onClick={() => setActiveTab('effects')}
              className={`pb-2 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'effects' ? 'text-black border-b-2 border-black' : 'text-gray-400'}`}
            >
              Effects
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-2 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'details' ? 'text-black border-b-2 border-black' : 'text-gray-400'}`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`pb-2 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'raw' ? 'text-black border-b-2 border-black' : 'text-gray-400'}`}
            >
              Raw Data
            </button>
          </div>

          <div className="min-h-[100px] px-4">
            {activeTab === 'operations' && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                {operations.map((op, idx) => (
                  <div key={op.id} className="p-3 border-b border-gray-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                        {idx + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <span className="text-sm font-semibold text-slate-900 capitalize truncate pr-2">
                            {op.type === 'invoke_host_function'
                              ? decodeContractFunctionName(op)
                              : op.type === 'manage_sell_offer' || op.type === 'manage_buy_offer'
                                ? 'Manage Offer'
                                : getOperationTypeLabel(op.type)}
                          </span>
                          {/* Standard Amount Display for Non-Offer Types */}
                          {!['manage_sell_offer', 'manage_buy_offer'].includes(op.type) && op.amount && (
                            <span className="text-sm font-bold text-slate-900 whitespace-nowrap">
                              {parseFloat(op.amount).toLocaleString(undefined, { maximumFractionDigits: 7 })}
                              <span className="text-xs text-slate-500 ml-1 font-medium">{op.asset_type === 'native' ? 'XLM' : op.asset_code || 'XLM'}</span>
                            </span>
                          )}
                        </div>

                        {/* Special Display for Offers */}
                        {(op.type === 'manage_sell_offer' || op.type === 'manage_buy_offer') && (
                          <div className="mt-1 mb-2 bg-slate-50 rounded-lg p-2 border border-slate-100">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-slate-500 font-medium">Selling</span>
                              <span className="text-sm font-bold text-slate-900">
                                {formatXLM(op.amount || '0')}
                                <span className="text-xs ml-1 font-normal text-slate-500">{(op as any).selling_asset_code || 'XLM'}</span>
                              </span>
                            </div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-slate-500 font-medium">Buying</span>
                              <span className="text-sm font-bold text-slate-900">
                                {(op as any).buying_asset_code || 'XLM'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 mt-1">
                              <span className="text-xs text-slate-500">Price</span>
                              <span className="text-xs font-mono font-medium text-slate-700">
                                {(op as any).price} {(op as any).buying_asset_code || 'XLM'}/{(op as any).selling_asset_code || 'XLM'}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
                            {(op.from || op.to || (op as any).source_account) ? (
                              <>
                                {op.from && (
                                  <Link href={`/account/${op.from}`} className="font-mono hover:text-blue-600 transition-colors truncate max-w-[80px]">
                                    {shortenAddress(op.from, 4)}
                                  </Link>
                                )}
                                <svg className="w-3 h-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                                {op.to && (
                                  <Link href={`/account/${op.to}`} className="font-mono hover:text-blue-600 transition-colors truncate max-w-[80px]">
                                    {shortenAddress(op.to, 4)}
                                  </Link>
                                )}
                              </>
                            ) : (
                              op.source_account && (
                                <Link href={`/account/${op.source_account}`} className="font-mono hover:text-blue-600 transition-colors">
                                  {shortenAddress(op.source_account, 8)}
                                </Link>
                              )
                            )}
                          </div>
                          {op.type === 'invoke_host_function' && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">Contract</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'effects' && (
              <div className="space-y-4">
                {/* DEX Swap Summary - Keep card style for summary */}
                {dexSwap && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100 mb-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                        <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </div>
                      <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">Swap Summary</span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-2">
                      <div className="text-left">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Sold</div>
                        <div className="text-base font-bold text-slate-900">
                          {parseFloat(dexSwap.fromAmount || '0').toLocaleString(undefined, { maximumFractionDigits: 5 })}
                          <span className="text-xs ml-1 text-slate-500">{dexSwap.fromAsset}</span>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Bought</div>
                        <div className="text-base font-bold text-emerald-700">
                          {parseFloat(dexSwap.toAmount || '0').toLocaleString(undefined, { maximumFractionDigits: 5 })}
                          <span className="text-xs ml-1 text-emerald-600/70">{dexSwap.toAsset}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Compact Effects List */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  {/* Group effects by account */}
                  {Object.entries(effects.reduce((acc, effect) => {
                    const account = effect.account || 'Unknown';
                    if (!acc[account]) acc[account] = [];
                    acc[account].push(effect);
                    return acc;
                  }, {} as Record<string, typeof effects>)).map(([account, accountEffects]) => {
                    const sent = accountEffects.filter(e => e.type.includes('debited'));
                    const received = accountEffects.filter(e => e.type.includes('credited'));
                    const others = accountEffects.filter(e => !e.type.includes('debited') && !e.type.includes('credited'));

                    return (
                      <div key={account} className="p-4 border-b border-gray-100 last:border-0 hover:bg-slate-50 transition-colors">
                        {/* Account Header */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <Link href={`/account/${account}`} className="font-mono text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group">
                            {shortenAddress(account, 6)}
                            <svg className="w-3 h-3 text-slate-300 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>
                        </div>

                        {/* Sent Section */}
                        {sent.length > 0 && (
                          <div className="mb-3 pl-8 relative">
                            <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-red-100"></div>
                            <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                              Sent
                            </div>
                            <div className="space-y-1">
                              {sent.map(ef => (
                                <div key={ef.id} className="flex items-center gap-2 text-sm">
                                  <span className="font-bold text-slate-900">{parseFloat(ef.amount || '0').toLocaleString(undefined, { maximumFractionDigits: 5 })}</span>
                                  <span className="text-xs font-semibold text-slate-500">{ef.asset_type === 'native' ? 'XLM' : ef.asset_code || ''}</span>
                                  {ef.type.includes('contract') && <span className="text-[8px] bg-slate-100 text-slate-500 uppercase px-1 rounded border border-slate-200">Contract</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Received Section */}
                        {received.length > 0 && (
                          <div className="mb-3 pl-8 relative">
                            <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-emerald-100"></div>
                            <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                              Received
                            </div>
                            <div className="space-y-1">
                              {received.map(ef => (
                                <div key={ef.id} className="flex items-center gap-2 text-sm">
                                  <span className="font-bold text-emerald-700">{parseFloat(ef.amount || '0').toLocaleString(undefined, { maximumFractionDigits: 5 })}</span>
                                  <span className="text-xs font-semibold text-emerald-600/70">{ef.asset_type === 'native' ? 'XLM' : ef.asset_code || ''}</span>
                                  {ef.type.includes('contract') && <span className="text-[8px] bg-slate-100 text-slate-500 uppercase px-1 rounded border border-slate-200">Contract</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Other Effects */}
                        {others.length > 0 && (
                          <div className="pl-8 space-y-2">
                            {others.map(ef => (
                              <div key={ef.id} className="text-sm text-slate-600 flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                <span className="capitalize font-medium">{ef.type.replace(/_/g, ' ')}</span>
                                {ef.amount && (
                                  <span className="font-bold text-slate-900 ml-auto">
                                    {parseFloat(ef.amount).toLocaleString()} <span className="text-xs text-slate-400">{ef.asset_type === 'native' ? 'XLM' : ef.asset_code}</span>
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {effects.length === 0 && (
                    <div className="p-6 text-center text-slate-400 text-sm">No effects found for this transaction</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'details' && (
              <div className="space-y-3">
                {/* Transaction Hash */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex justify-between items-start gap-3">
                    <span className="text-sm font-semibold text-gray-600">Transaction Hash</span>
                    <button
                      onClick={handleCopy}
                      className="text-xs font-mono text-gray-900 hover:text-black transition-colors text-right break-all flex items-center gap-1"
                    >
                      {shortenAddress(transaction.hash, 12)}
                      {copied ? (
                        <svg className="w-3.5 h-3.5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Ledger */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-600">Ledger</span>
                    <Link href={`/ledger/${transaction.ledger}`} className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors">
                      #{transaction.ledger.toLocaleString()}
                    </Link>
                  </div>
                </div>

                {/* Sequence Number */}
                {transaction.source_account_sequence && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-600">Sequence Number</span>
                      <span className="text-sm font-mono font-bold text-gray-900">{transaction.source_account_sequence}</span>
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex justify-between items-start gap-3">
                    <span className="text-sm font-semibold text-gray-600">Timestamp</span>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">{formatDate(transaction.created_at)}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{timeAgo(transaction.created_at)}</div>
                    </div>
                  </div>
                </div>

                {/* Fees */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-600">Fee Charged</span>
                      <span className="text-sm font-bold text-gray-900">{feeXLM} XLM</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Max Fee</span>
                      <span className="text-xs font-mono text-gray-700">
                        {(parseInt(transaction.max_fee) / 10000000).toFixed(7)} XLM
                      </span>
                    </div>
                  </div>
                </div>

                {/* Memo */}
                {transaction.memo && transaction.memo_type !== 'none' && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-sm font-semibold text-gray-600">Memo ({transaction.memo_type})</span>
                      <span className="text-sm font-mono text-gray-900 break-all text-right">{transaction.memo}</span>
                    </div>
                  </div>
                )}

                {/* Signatures */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-gray-600">Signatures</span>
                    <span className="text-xs bg-white px-2 py-1 rounded-full font-bold text-gray-900">
                      {transaction.signatures.length}
                    </span>
                  </div>
                  {transaction.signatures.length > 0 && (
                    <div className="space-y-1.5 mt-3">
                      {transaction.signatures.map((sig, idx) => (
                        <div key={idx} className="text-[10px] font-mono text-gray-500 break-all bg-white p-2 rounded">
                          {sig}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Operations Count */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-600">Total Operations</span>
                    <span className="text-sm font-bold text-gray-900">{transaction.operation_count}</span>
                  </div>
                </div>

                {/* Transaction Size (XDR) */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-600">Transaction Size</span>
                    <span className="text-sm font-bold text-gray-900">
                      {Math.round(transaction.envelope_xdr.length * 0.75).toLocaleString()} bytes
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'raw' && (
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-xs font-semibold text-gray-600 mb-2">Envelope XDR</div>
                  <p className="font-mono text-[10px] text-gray-500 break-all">{transaction.envelope_xdr}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-xs font-semibold text-gray-600 mb-2">Result XDR</div>
                  <p className="font-mono text-[10px] text-gray-500 break-all">{transaction.result_xdr}</p>
                </div>
                {transaction.result_meta_xdr && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs font-semibold text-gray-600 mb-2">Result Meta XDR</div>
                    <p className="font-mono text-[10px] text-gray-500 break-all">{transaction.result_meta_xdr}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
