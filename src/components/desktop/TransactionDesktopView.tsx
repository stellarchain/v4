'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { shortenAddress, timeAgo, getOperationTypeLabel, formatDate, formatStroopsToXLM } from '@/lib/stellar';

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

interface TransactionDesktopViewProps {
  transaction: TransactionData;
  operations: Operation[];
  effects: Effect[];
}

const decodeContractFunctionName = (op: Operation): string => {
  try {
    const parameters = op.parameters as Array<{ type: string; value: string }> | undefined;
    if (!parameters) return 'Contract Call';

    const symParam = parameters.find(p => p.type === 'Sym');
    if (!symParam) return 'Contract Call';

    const decoded = atob(symParam.value);
    const functionName = decoded.slice(5).replace(/\0/g, '');
    return functionName || 'Contract Call';
  } catch {
    return 'Contract Call';
  }
};

const formatTokenAmount = (value?: string, digits = 7) => {
  if (!value) return '0';
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: digits });
};

export default function TransactionDesktopView({ transaction, operations, effects }: TransactionDesktopViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'operations' | 'effects' | 'raw' | null>(null);
  const [copied, setCopied] = useState(false);
  const contractOp = operations.find(op => op.type === 'invoke_host_function');
  const isContractCall = !!contractOp;
  const isSwap = operations.some(op =>
    op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive'
  );

  const offerOp = operations.find(op =>
    ['manage_buy_offer', 'manage_sell_offer', 'create_passive_sell_offer'].includes(op.type)
  );
  const isOffer = !!offerOp;

  const paymentOps = operations.filter(op => op.type === 'payment' || op.type === 'create_account');
  const isMultiSend = paymentOps.length > 1;

  const transferOps = operations.filter(op =>
    ['payment', 'create_account', 'path_payment_strict_send', 'path_payment_strict_receive'].includes(op.type)
  );

  const primaryOp = transferOps[0] || operations[0];
  let destination = transaction.source_account;
  if (primaryOp) {
    if (primaryOp.to) destination = primaryOp.to;
    else if ((primaryOp as any).into) destination = (primaryOp as any).into;
    else if (primaryOp.type === 'create_account') destination = (primaryOp as any).account;
    else if (primaryOp.type === 'invoke_host_function') destination = 'Smart Contract';
  }

  const amount = primaryOp?.amount || (primaryOp as any).starting_balance || '0';
  const assetCode = primaryOp?.asset_type === 'native' ? 'XLM' : (primaryOp?.asset_code || 'XLM');

  let typeLabel = 'Transaction';
  let fromLabel = 'From Account';
  let toLabel = 'To Destination';

  let swapSold: { amount: string; code: string } | null = null;
  let swapBought: { amount: string; code: string } | null = null;

  if (isSwap) {
    typeLabel = 'Swap Transaction';
    const swapOp = operations.find(op => op.type.includes('path_payment'));
    if (swapOp) {
      const soldAmount = (swapOp as any).source_amount || '0';
      const soldAsset = (swapOp as any).source_asset_type === 'native' ? 'XLM' : ((swapOp as any).source_asset_code || 'XLM');
      const boughtAmount = swapOp.amount || '0';
      const boughtAsset = swapOp.asset_type === 'native' ? 'XLM' : (swapOp.asset_code || 'XLM');

      swapSold = { amount: soldAmount, code: soldAsset };
      swapBought = { amount: boughtAmount, code: boughtAsset };

      fromLabel = 'Sold';
      toLabel = 'Bought';
    }
  }

  let offerDetails: { selling: string; buying: string; price: string; amount: string } | null = null;
  if (isOffer && offerOp) {
    typeLabel = 'Manage Offer';
    const sellingCode = (offerOp as any).selling_asset_type === 'native' ? 'XLM' : ((offerOp as any).selling_asset_code || 'XLM');
    const buyingCode = (offerOp as any).buying_asset_type === 'native' ? 'XLM' : ((offerOp as any).buying_asset_code || 'XLM');

    offerDetails = {
      selling: sellingCode,
      buying: buyingCode,
      price: (offerOp as any).price || '0',
      amount: (offerOp as any).amount || '0'
    };

    fromLabel = 'Selling';
    toLabel = 'Buying';
  }

  let multiSendCount = 0;
  let multiSendSum = 0;
  let multiSendAsset = '';

  if (isMultiSend) {
    typeLabel = paymentOps.length > 10 ? 'Bulk Send' : 'Multi Send';
    toLabel = 'Recipients';
    multiSendCount = paymentOps.length;
    multiSendSum = paymentOps.reduce((sum, op) => sum + parseFloat(op.amount || '0'), 0);

    const firstOp = paymentOps[0];
    const firstAsset = firstOp.asset_type === 'native' ? 'XLM' : (firstOp.asset_code || 'XLM');
    const allSame = paymentOps.every(op => {
      const opAsset = op.asset_type === 'native' ? 'XLM' : (op.asset_code || 'XLM');
      return opAsset === firstAsset;
    });

    multiSendAsset = allSame ? firstAsset : 'Mixed';
  }

  if (isContractCall && contractOp) {
    const contractFunctionName = decodeContractFunctionName(contractOp);
    typeLabel = contractFunctionName === 'Contract Call' ? 'Smart Contract Call' : `${contractFunctionName} (Contract)`;
  }

  const getDisplayAmount = () => {
    if (isMultiSend) return multiSendSum;
    const parsedAmount = parseFloat(amount);
    if (parsedAmount > 0) return parsedAmount;
    const creditEffect = effects.find(e => e.type === 'account_credited' || e.type === 'account_debited');
    if (creditEffect && creditEffect.amount) {
      return parseFloat(creditEffect.amount);
    }
    return 0;
  };

  const getDisplayAsset = () => {
    if (isMultiSend) return multiSendAsset;
    const parsedAmount = parseFloat(amount);
    if (parsedAmount > 0) return assetCode;
    const creditEffect = effects.find(e => e.type === 'account_credited' || e.type === 'account_debited');
    if (creditEffect) {
      return creditEffect.asset_type === 'native' ? 'XLM' : (creditEffect.asset_code || 'XLM');
    }
    return assetCode;
  };

  const displayAmount = getDisplayAmount();
  const displayAsset = getDisplayAsset();

  const sentEffect = effects.find(e => e.type === 'account_debited');
  const receivedEffect = effects.find(e => e.type === 'account_credited');

  const sentAmountFromEffect = sentEffect?.amount ? parseFloat(sentEffect.amount) : 0;
  const sentAssetFromEffect = sentEffect ? (sentEffect.asset_type === 'native' ? 'XLM' : (sentEffect.asset_code || 'XLM')) : 'XLM';

  const receivedAmountFromEffect = receivedEffect?.amount ? parseFloat(receivedEffect.amount) : 0;
  const receivedAssetFromEffect = receivedEffect ? (receivedEffect.asset_type === 'native' ? 'XLM' : (receivedEffect.asset_code || 'XLM')) : 'XLM';

  const fromCardAmount = displayAmount > 0 ? displayAmount : sentAmountFromEffect;
  const fromCardAsset = displayAmount > 0 ? displayAsset : sentAssetFromEffect;
  const toCardAmount = displayAmount > 0 ? displayAmount : receivedAmountFromEffect;
  const toCardAsset = displayAmount > 0 ? displayAsset : receivedAssetFromEffect;

  const feeXLM = formatStroopsToXLM(parseInt(transaction.fee_charged));
  const maxFeeXLM = formatStroopsToXLM(parseInt(transaction.max_fee));

  const effectsByAccount = useMemo(() => {
    return effects.reduce((acc, ef) => {
      const key = ef.account || 'unknown';
      if (!acc[key]) acc[key] = [];
      acc[key].push(ef);
      return acc;
    }, {} as Record<string, Effect[]>);
  }, [effects]);

  const handleCopy = () => {
    navigator.clipboard.writeText(transaction.hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const totalAmountLabel = displayAmount > 0
    ? `${displayAmount.toLocaleString(undefined, { maximumFractionDigits: isMultiSend ? 2 : 7 })}`
    : '--';
  const totalAssetLabel = isMultiSend ? multiSendAsset : displayAsset;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <div className="mx-auto max-w-[1600px] p-6 lg:p-8">
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-start gap-4 min-w-0">
              <Link
                href="/transactions"
                className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition hover:text-slate-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Transaction</span>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${transaction.successful ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${transaction.successful ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    {transaction.successful ? 'Successful' : 'Failed'}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {typeLabel}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="group flex items-center gap-2 text-left text-sm font-mono font-medium text-slate-800 hover:text-slate-900"
                >
                  <span className="truncate">{transaction.hash}</span>
                  <svg className="h-4 w-4 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8m-8-4h8m-8-4h8M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H8l-4 4v10a2 2 0 002 2z" />
                  </svg>
                  {copied && <span className="text-[10px] font-semibold text-emerald-500">Copied</span>}
                </button>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDate(transaction.created_at)}
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="font-medium text-slate-700">{timeAgo(transaction.created_at)}</span>
                  <span className="text-slate-300">|</span>
                  <span>
                    Ledger{' '}
                    <Link href={`/ledger/${transaction.ledger}`} className="font-mono text-[11px] font-semibold text-sky-600 hover:underline">
                      {transaction.ledger}
                    </Link>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 mb-6 items-start">
          <div className="flex-1 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            {isContractCall && fromCardAmount === 0 && toCardAmount === 0 ? (
              <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 rounded-xl p-4">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800">
                    Invoked Contract Function: <span className="font-mono text-purple-600">{typeLabel.replace('(Contract)', '').trim()}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-slate-500">Initiator:</span>
                    <Link href={`/account/${transaction.source_account}`} className="text-[11px] font-mono font-bold text-slate-700 hover:text-sky-600">
                      {shortenAddress(transaction.source_account, 6)}
                    </Link>
                    <span className="text-slate-300 mx-1">→</span>
                    <span className="text-[11px] text-slate-500">Contract:</span>
                    <Link href={`/account/${contractOp?.to || (contractOp as any).into || transaction.source_account}`} className="text-[11px] font-mono font-bold text-slate-700 hover:text-sky-600">
                      {shortenAddress(contractOp?.to || (contractOp as any).into || 'Smart Contract', 6)}
                    </Link>
                  </div>
                </div>
              </div>
            ) : isOffer && offerDetails ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">DEX Limit Order</h3>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  {/* Selling */}
                  <div className="flex flex-col items-center md:items-start text-center md:text-left min-w-[140px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Selling</span>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 shadow-sm text-xs">
                        {offerDetails.selling.substring(0, 2)}
                      </div>
                      <div>
                        <div className="text-lg font-bold text-slate-900 leading-none mb-1">
                          {formatTokenAmount(offerDetails.amount)}
                        </div>
                        <div className="text-xs font-bold text-slate-500">{offerDetails.selling}</div>
                      </div>
                    </div>
                  </div>

                  {/* Price Info */}
                  <div className="flex-1 flex flex-col items-center justify-center px-4 w-full md:w-auto">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Exchange Rate</div>
                    <div className="flex items-center gap-2 w-full justify-center">
                      <div className="h-px bg-slate-300 flex-1 opacity-50"></div>
                      <div className="bg-white border border-slate-200 shadow-sm rounded px-3 py-1.5 font-mono text-xs font-bold text-slate-700 whitespace-nowrap">
                        1 {offerDetails.selling} ≈ {formatTokenAmount(offerDetails.price)} {offerDetails.buying}
                      </div>
                      <div className="h-px bg-slate-300 flex-1 opacity-50"></div>
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>

                  {/* Buying */}
                  <div className="flex flex-col items-center md:items-end text-center md:text-right min-w-[140px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Buying</span>
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 shadow-sm text-xs">
                        {offerDetails.buying.substring(0, 2)}
                      </div>
                      <div>
                        <div className="text-lg font-bold text-slate-900 leading-none mb-1">
                          {/* Value = Amount * Price */}
                          {formatTokenAmount((parseFloat(offerDetails.amount) * parseFloat(offerDetails.price)).toString())}
                        </div>
                        <div className="text-xs font-bold text-slate-500">{offerDetails.buying}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Initiator Footer */}
                <div className="flex items-center justify-between text-xs px-2">
                  <span className="text-slate-400">Order by</span>
                  <Link href={`/account/${transaction.source_account}`} className="font-mono font-bold text-slate-700 hover:text-sky-600">
                    {shortenAddress(transaction.source_account, 12)}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">{fromLabel}</div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-slate-200 hover:shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 text-white text-sm font-bold flex items-center justify-center shadow-sm">
                        {transaction.source_account.slice(0, 1)}
                      </div>
                      <div>
                        {isOffer || isSwap ? (
                          <div className="font-mono text-[13px] font-medium text-slate-800">
                            {isOffer
                              ? `${offerDetails?.amount ? formatTokenAmount(offerDetails.amount, 2) : '0'} ${offerDetails?.selling || ''}`
                              : `${swapSold?.amount ? formatTokenAmount(swapSold.amount, 2) : '0'} ${swapSold?.code || ''}`}
                          </div>
                        ) : (
                          <Link href={`/account/${transaction.source_account}`} className="font-mono text-[14px] font-medium text-slate-800 hover:text-sky-600 transition-colors">
                            {shortenAddress(transaction.source_account, 8)}
                          </Link>
                        )}
                        <div className="text-[11px] text-slate-500 mt-0.5">Source account</div>
                      </div>
                    </div>
                    {!isOffer && !isSwap && (
                      <div className="text-right">
                        <div className="text-sm font-bold text-rose-500">
                          {fromCardAmount > 0 ? `- ${fromCardAmount.toLocaleString(undefined, { maximumFractionDigits: 7 })}` : '--'}{' '}
                          <span className="text-[11px] font-mono font-normal text-slate-500">{fromCardAsset}</span>
                        </div>
                        <div className="text-[10px] font-medium uppercase text-slate-400 mt-0.5">Sent</div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="hidden md:flex items-center justify-center text-slate-300 pt-6">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">{toLabel}</div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-slate-200 hover:shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-semibold shadow-sm">
                          {isMultiSend ? 'Tx' : destination.slice(0, 1)}
                        </div>
                        <div>
                          {isOffer ? (
                            <div className="text-sm font-bold text-slate-800">At {offerDetails?.price} {offerDetails?.buying}</div>
                          ) : isSwap ? (
                            <div className="text-sm font-bold text-slate-800">{formatTokenAmount(swapBought?.amount || '0', 2)} {swapBought?.code}</div>
                          ) : isMultiSend ? (
                            <div className="text-sm font-bold text-slate-800">{multiSendCount} Recipients</div>
                          ) : (
                            <Link href={`/account/${destination}`} className="font-mono text-[14px] font-medium text-slate-800 hover:text-sky-600 transition-colors">
                              {shortenAddress(destination, 8)}
                            </Link>
                          )}
                          {isMultiSend && (
                            <div className="mt-1 flex -space-x-1">
                              {paymentOps.slice(0, 3).map((op, idx) => (
                                <div key={op.id || idx} className="h-4 w-4 rounded-full border border-white bg-indigo-500"></div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-emerald-500">
                          {displayAmount > 0 ? displayAmount.toLocaleString(undefined, { maximumFractionDigits: 7 }) : '--'}{' '}
                          <span className="text-[11px] font-mono font-normal text-slate-500">{totalAssetLabel}</span>
                        </div>
                        <div className="text-[10px] font-medium uppercase text-slate-400 mt-0.5">{isMultiSend ? 'Total Amt' : 'Received'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="w-full lg:w-80 space-y-6 flex-shrink-0 animate-in fade-in slide-in-from-right-2 duration-300">
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-slate-800">Details</h3>
                <button type="button" className="text-[10px] font-bold uppercase tracking-wider text-sky-600 hover:underline">View JSON</button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-[11px] text-slate-500">Fee Charged</span>
                  <span className="text-[11px] font-mono font-medium text-slate-700">{feeXLM} XLM</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-[11px] text-slate-500">Max Fee</span>
                  <span className="text-[11px] font-mono font-medium text-slate-700">{maxFeeXLM} XLM</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-[11px] text-slate-500">Memo</span>
                  <span className="text-[11px] font-medium text-slate-400">{transaction.memo ? `${transaction.memo} (${transaction.memo_type})` : 'None'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-[11px] text-slate-500">Fee Account</span>
                  <Link href={`/account/${transaction.source_account}`} className="text-[10px] font-mono font-medium text-sky-600 truncate w-24 text-right">
                    {shortenAddress(transaction.source_account, 6)}
                  </Link>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-[11px] text-slate-500">Sequence</span>
                  <span className="text-[11px] font-mono font-medium text-slate-700">{transaction.source_account_sequence || '--'}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-[11px] text-slate-500">Ledger</span>
                  <Link href={`/ledger/${transaction.ledger}`} className="text-[11px] font-mono font-medium text-sky-600">
                    {transaction.ledger}
                  </Link>
                </div>
              </div>
              {transaction.signatures.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Signatures</h4>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                    <code className="text-[9px] text-slate-600 break-all leading-relaxed block font-mono">
                      {transaction.signatures.join(' ')}
                    </code>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="w-full border-b border-slate-200 flex gap-8 px-2">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'operations', label: 'Operations' },
            { id: 'effects', label: 'Effects' },
            { id: 'raw', label: 'Raw Data' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(prev => prev === tab.id ? null : tab.id as typeof activeTab)}
              className={`pb-3 text-sm font-bold transition-all ${activeTab === tab.id ? 'border-b-2 border-sky-500 text-sky-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full space-y-6">


          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col h-full">
                  <div className="flex items-center justify-between px-5 pt-5 pb-2">
                    <h3 className="text-sm font-bold text-slate-800">Operations</h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">{transaction.operation_count}</span>
                  </div>
                  <div className="divide-y divide-slate-100 flex-1">
                    {operations.slice(0, 5).map((op, idx) => (
                      <div key={op.id} className="p-3 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="mt-1 h-6 w-6 rounded bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-mono">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-xs font-bold text-slate-700">
                                {op.type === 'invoke_host_function'
                                  ? decodeContractFunctionName(op)
                                  : op.type === 'payment' && isMultiSend
                                    ? 'Payment'
                                    : getOperationTypeLabel(op.type).replace(/_/g, ' ')}
                              </span>
                              <span className="text-[11px] font-mono font-medium text-slate-900">
                                {op.amount ? formatTokenAmount(op.amount, 2) : '--'}{' '}
                                <span className="text-[9px] text-slate-500">{op.asset_type === 'native' ? 'XLM' : op.asset_code || ''}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                              <Link href={`/account/${op.source_account || transaction.source_account}`} className="truncate max-w-[80px] hover:text-sky-600 hover:underline">
                                {shortenAddress(op.source_account || transaction.source_account, 4)}
                              </Link>
                              <svg className="h-3 w-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                              </svg>
                              <Link href={`/account/${op.to || (op as any).into || transaction.source_account}`} className="truncate max-w-[80px] text-sky-600 hover:text-sky-700 hover:underline">
                                {shortenAddress(op.to || (op as any).into || transaction.source_account, 4)}
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {operations.length > 5 && (
                    <button
                      onClick={() => setActiveTab('operations')}
                      className="w-full border-t border-slate-100 py-3 text-center text-xs font-bold text-sky-600 hover:bg-slate-50 transition-colors rounded-b-xl"
                    >
                      View All {operations.length} Operations
                    </button>
                  )}
                </section>

                <section className="rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col h-full">
                  <div className="flex items-center justify-between px-4 pt-4">
                    <h3 className="text-sm font-bold text-slate-800">Effects</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{effects.length}</span>
                  </div>
                  <div className="divide-y divide-slate-100 flex-1">
                    {effects.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">No effects found.</div>
                    ) : (
                      Object.entries(effectsByAccount).slice(0, 3).map(([account, accountEffects]) => (
                        <div key={account} className="p-3">
                          <div className="flex justify-between items-center mb-1">
                            {account === 'unknown' ? (
                              <span className="text-[10px] font-mono font-semibold text-slate-400 truncate w-32">Unknown</span>
                            ) : (
                              <Link href={`/account/${account}`} className="text-[10px] font-mono font-bold text-sky-600 truncate w-32 hover:underline">
                                {shortenAddress(account, 6)}
                              </Link>
                            )}
                            <span className="text-[9px] font-bold uppercase text-slate-300 tracking-wider">{accountEffects.length} EFFECTS</span>
                          </div>
                          <div className="space-y-1">
                            {accountEffects.slice(0, 3).map(ef => {
                              const isCredit = ef.type.includes('credited');
                              const isDebit = ef.type.includes('debited');
                              const effectLabel = isCredit ? 'Account Credited' : isDebit ? 'Account Debited' : ef.type.replace(/_/g, ' ');
                              const effectAsset = ef.asset_type === 'native' ? 'XLM' : ef.asset_code;
                              return (
                                <div key={ef.id} className="rounded bg-slate-50 p-2 flex justify-between items-center">
                                  <span className={`text-xs font-medium ${isCredit ? 'text-emerald-600' : isDebit ? 'text-rose-500' : 'text-slate-500'}`}>
                                    {effectLabel}
                                  </span>
                                  <span className={`text-[11px] font-mono font-bold ${isCredit ? 'text-emerald-600' : isDebit ? 'text-rose-500' : 'text-slate-600'}`}>
                                    {ef.amount ? `${isCredit ? '+' : isDebit ? '-' : ''}${formatTokenAmount(ef.amount)}` : '--'}{' '}
                                    <span className="text-[9px] text-slate-500">{effectAsset}</span>
                                  </span>
                                </div>
                              );
                            })}
                            {accountEffects.length > 3 && (
                              <div className="text-[9px] text-center text-slate-400 font-medium py-1">
                                + {accountEffects.length - 3} more effects
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {Object.keys(effectsByAccount).length > 3 && (
                    <button
                      onClick={() => setActiveTab('effects')}
                      className="w-full border-t border-slate-100 py-3 text-center text-xs font-bold text-sky-600 hover:bg-slate-50 transition-colors rounded-b-xl"
                    >
                      View All Effects
                    </button>
                  )}
                </section>
              </div>
            </>
          )}

          {activeTab === 'operations' && (
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between px-4 pt-4">
                <h3 className="text-sm font-bold text-slate-800">Operations</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{transaction.operation_count}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {operations.map((op, idx) => (
                  <div key={op.id} className="p-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 h-6 w-6 rounded bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-mono">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-slate-700">
                            {op.type === 'invoke_host_function'
                              ? decodeContractFunctionName(op)
                              : op.type === 'payment' && isMultiSend
                                ? 'Payment'
                                : getOperationTypeLabel(op.type).replace(/_/g, ' ')}
                          </span>
                          <span className="text-[11px] font-mono font-medium text-slate-900">
                            {op.amount ? formatTokenAmount(op.amount, 2) : '--'}{' '}
                            <span className="text-[9px] text-slate-500">{op.asset_type === 'native' ? 'XLM' : op.asset_code || ''}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                          <Link href={`/account/${op.source_account || transaction.source_account}`} className="truncate max-w-[80px] hover:text-sky-600 hover:underline">
                            {shortenAddress(op.source_account || transaction.source_account, 4)}
                          </Link>
                          <svg className="h-3 w-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                          <Link href={`/account/${op.to || (op as any).into || transaction.source_account}`} className="truncate max-w-[80px] text-sky-600 hover:text-sky-700 hover:underline">
                            {shortenAddress(op.to || (op as any).into || transaction.source_account, 4)}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'effects' && (
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between px-4 pt-4">
                <h3 className="text-sm font-bold text-slate-800">Effects</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{effects.length}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {effects.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No effects found.</div>
                ) : (
                  Object.entries(effectsByAccount).map(([account, accountEffects]) => (
                    <div key={account} className="p-3">
                      <div className="flex justify-between items-center mb-1">
                        {account === 'unknown' ? (
                          <span className="text-[10px] font-mono font-semibold text-slate-400 truncate w-32">Unknown</span>
                        ) : (
                          <Link href={`/account/${account}`} className="text-[10px] font-mono font-bold text-sky-600 truncate w-32 hover:underline">
                            {shortenAddress(account, 6)}
                          </Link>
                        )}
                        <span className="text-[9px] font-bold uppercase text-slate-300 tracking-wider">{accountEffects.length} EFFECTS</span>
                      </div>
                      <div className="space-y-1">
                        {accountEffects.map(ef => {
                          const isCredit = ef.type.includes('credited');
                          const isDebit = ef.type.includes('debited');
                          const effectLabel = isCredit ? 'Account Credited' : isDebit ? 'Account Debited' : ef.type.replace(/_/g, ' ');
                          const effectAsset = ef.asset_type === 'native' ? 'XLM' : ef.asset_code;
                          return (
                            <div key={ef.id} className="rounded bg-slate-50 p-2 flex justify-between items-center">
                              <span className={`text-xs font-medium ${isCredit ? 'text-emerald-600' : isDebit ? 'text-rose-500' : 'text-slate-500'}`}>
                                {effectLabel}
                              </span>
                              <span className={`text-[11px] font-mono font-bold ${isCredit ? 'text-emerald-600' : isDebit ? 'text-rose-500' : 'text-slate-600'}`}>
                                {ef.amount ? `${isCredit ? '+' : isDebit ? '-' : ''}${formatTokenAmount(ef.amount)}` : '--'}{' '}
                                <span className="text-[9px] text-slate-500">{effectAsset}</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {activeTab === 'raw' && (
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Envelope XDR</div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p className="break-all font-mono text-[10px] text-slate-600">{transaction.envelope_xdr}</p>
                </div>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Result XDR</div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p className="break-all font-mono text-[10px] text-slate-600">{transaction.result_xdr}</p>
                </div>
              </div>
              {transaction.result_meta_xdr && (
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Result Meta XDR</div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="break-all font-mono text-[10px] text-slate-600">{transaction.result_meta_xdr}</p>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>


      </div>
    </div>
  );
}
