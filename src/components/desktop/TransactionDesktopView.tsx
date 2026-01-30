'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { shortenAddress, timeAgo, getOperationTypeLabel, formatDate, formatStroopsToXLM, extractContractAddress, detectContractFunctionType } from '@/lib/stellar';
import type { AccountLabel } from '@/lib/stellar';
import type { ContractFunctionType } from '@/lib/types/token';
import AccountBadges from '@/components/AccountBadges';
import { decodeTransactionMeta, decodeTransactionResources, type DecodedTransactionMeta, type SorobanMetrics } from '@/lib/xdrDecoder';

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
  accountLabels?: Record<string, AccountLabel>;
}

const decodeContractFunctionName = (op: Operation): string => {
  try {
    const parameters = op.parameters as Array<{ type: string; value: string }> | undefined;
    if (!parameters) return 'Contract Call';

    const symParam = parameters.find(p => p.type === 'Sym');
    if (!symParam) return 'Contract Call';

    const decoded = atob(symParam.value);
    // Filter out non-printable characters and extract clean function name
    const functionName = decoded.replace(/[^\x20-\x7E]/g, '').trim();
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

export default function TransactionDesktopView({ transaction, operations, effects, accountLabels = {} }: TransactionDesktopViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'operations' | 'effects' | 'resources' | 'raw' | null>(null);
  const [copied, setCopied] = useState(false);
  const [isTraceExpanded, setIsTraceExpanded] = useState(false);

  // XDR decoded data for contract transactions
  const [decodedMeta, setDecodedMeta] = useState<DecodedTransactionMeta | null>(null);
  const [isDecodingXdr, setIsDecodingXdr] = useState(false);
  const [fetchedXdr, setFetchedXdr] = useState<string | null>(null);
  const [fetchedDiagnosticEventsXdr, setFetchedDiagnosticEventsXdr] = useState<string[] | null>(null);
  const [xdrFetchAttempted, setXdrFetchAttempted] = useState(false);
  const [decodedXdr, setDecodedXdr] = useState<string | null>(null);

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
  let isContractDestination = false;
  if (primaryOp) {
    if (primaryOp.to) destination = primaryOp.to;
    else if ((primaryOp as any).into) destination = (primaryOp as any).into;
    else if (primaryOp.type === 'create_account') destination = (primaryOp as any).account;
    else if (primaryOp.type === 'invoke_host_function') {
      // Extract contract address for invoke_host_function operations
      const contractAddr = extractContractAddress(primaryOp as any);
      if (contractAddr) {
        destination = contractAddr;
        isContractDestination = true;
      } else {
        destination = 'Contract';
        isContractDestination = true;
      }
    }
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
      // Try to get actual amounts from effects first (more accurate than operation amounts)
      // Use includes() to match various effect types (account_debited, contract_debited, etc.)
      const debitEffect = effects.find(e => e.type.includes('debited'));
      const creditEffect = effects.find(e => e.type.includes('credited'));

      // Source = Sold (prefer effect amount if available)
      const soldAmount = debitEffect?.amount || (swapOp as any).source_amount || '0';
      const soldAsset = debitEffect
        ? (debitEffect.asset_type === 'native' ? 'XLM' : (debitEffect.asset_code || 'XLM'))
        : ((swapOp as any).source_asset_type === 'native' ? 'XLM' : ((swapOp as any).source_asset_code || 'XLM'));

      // Dest = Bought (prefer effect amount if available)
      const boughtAmount = creditEffect?.amount || swapOp.amount || '0';
      const boughtAsset = creditEffect
        ? (creditEffect.asset_type === 'native' ? 'XLM' : (creditEffect.asset_code || 'XLM'))
        : (swapOp.asset_type === 'native' ? 'XLM' : (swapOp.asset_code || 'XLM'));

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

  // Extract contract details
  let contractFunctionName = 'Contract Call';
  let contractAddress: string | null = null;
  let contractFunctionType: ContractFunctionType = 'unknown';

  if (isContractCall && contractOp) {
    contractFunctionName = decodeContractFunctionName(contractOp);
    typeLabel = contractFunctionName === 'Contract Call' ? 'Smart Contract Call' : `${contractFunctionName} (Contract)`;
    contractAddress = extractContractAddress(contractOp as any);
    contractFunctionType = detectContractFunctionType(contractFunctionName);
  }

  const getDisplayAmount = () => {
    if (isMultiSend) return multiSendSum;
    const parsedAmount = parseFloat(amount);
    if (parsedAmount > 0) return parsedAmount;
    const creditEffect = effects.find(e => e.type.includes('credited') || e.type.includes('debited'));
    if (creditEffect && creditEffect.amount) {
      return parseFloat(creditEffect.amount);
    }
    return 0;
  };

  const getDisplayAsset = () => {
    if (isMultiSend) return multiSendAsset;
    const parsedAmount = parseFloat(amount);
    if (parsedAmount > 0) return assetCode;
    const creditEffect = effects.find(e => e.type.includes('credited') || e.type.includes('debited'));
    if (creditEffect) {
      return creditEffect.asset_type === 'native' ? 'XLM' : (creditEffect.asset_code || 'XLM');
    }
    return assetCode;
  };

  const displayAmount = getDisplayAmount();
  const displayAsset = getDisplayAsset();

  const sentEffect = effects.find(e => e.type.includes('debited'));
  const receivedEffect = effects.find(e => e.type.includes('credited'));

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

  // Buffer decoded metrics from envelope XDR
  const envelopeMetrics = useMemo(() => {
    return decodeTransactionResources(transaction.envelope_xdr);
  }, [transaction.envelope_xdr]);

  // Decode XDR when on Resources tab for contract transactions
  useEffect(() => {
    if (!isContractCall || activeTab !== 'resources' || isDecodingXdr) {
      return;
    }

    const xdrToUse = fetchedXdr || transaction.result_meta_xdr;
    if (!xdrToUse || decodedXdr === xdrToUse) {
      return;
    }

    setIsDecodingXdr(true);
    setTimeout(() => {
      const decoded = decodeTransactionMeta(xdrToUse);
      setDecodedMeta(decoded);
      setDecodedXdr(xdrToUse);
      setIsDecodingXdr(false);
    }, 0);
  }, [isContractCall, activeTab, transaction.result_meta_xdr, fetchedXdr, fetchedDiagnosticEventsXdr, decodedXdr, isDecodingXdr]);

  // Fetch Soroban RPC XDR if Horizon data is missing trace details
  useEffect(() => {
    if (!isContractCall || activeTab !== 'resources' || isDecodingXdr || xdrFetchAttempted || fetchedXdr) {
      return;
    }

    const hasTraceData = !!(
      decodedMeta?.success &&
      ((decodedMeta.invocationTrace?.length || 0) > 0 ||
        (decodedMeta.parsedEvents?.length || 0) > 0 ||
        (decodedMeta.stateChanges?.length || 0) > 0)
    );

    const shouldFetchRpcXdr = !transaction.result_meta_xdr || !hasTraceData || (decodedMeta && !decodedMeta.success);

    if (!shouldFetchRpcXdr) {
      return;
    }

    setXdrFetchAttempted(true);
    setIsDecodingXdr(true);

    fetch(`/api/transaction-meta?hash=${transaction.hash}`)
      .then(res => res.json())
      .then(data => {
        if (data.resultMetaXdr) {
          setFetchedXdr(data.resultMetaXdr);
          if (Array.isArray(data.diagnosticEventsXdr) && data.diagnosticEventsXdr.length > 0) {
            setFetchedDiagnosticEventsXdr(data.diagnosticEventsXdr);
          }
        }
        setIsDecodingXdr(false);
      })
      .catch(() => {
        setIsDecodingXdr(false);
      });
  }, [
    isContractCall,
    activeTab,
    isDecodingXdr,
    xdrFetchAttempted,
    fetchedXdr,
    decodedMeta,
    transaction.result_meta_xdr,
    transaction.hash,
  ]);

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
          <div className="flex-1 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              {isContractCall && fromCardAmount === 0 && toCardAmount === 0 ? (
                <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-800">
                        Invoked: <span className="font-mono text-purple-600">{contractFunctionName}</span>
                      </span>
                      <span className="inline-flex items-center bg-violet-50 text-violet-600 border border-violet-100 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide">
                        Smart Contract
                      </span>
                      {contractFunctionType !== 'unknown' && (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide border ${
                          contractFunctionType === 'transfer' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          contractFunctionType === 'swap' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                          contractFunctionType === 'mint' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          contractFunctionType === 'burn' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                          contractFunctionType === 'approve' ? 'bg-cyan-50 text-cyan-600 border-cyan-100' :
                          contractFunctionType === 'deposit' ? 'bg-green-50 text-green-600 border-green-100' :
                          contractFunctionType === 'withdraw' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          'bg-slate-50 text-slate-600 border-slate-100'
                        }`}>
                          {contractFunctionType}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-[11px] text-slate-500">Initiator:</span>
                      <span className="flex items-center">
                        <Link href={`/account/${transaction.source_account}`} className="text-[11px] font-mono font-bold text-slate-700 hover:text-sky-600">
                          {shortenAddress(transaction.source_account, 6)}
                        </Link>
                        <AccountBadges address={transaction.source_account} labels={accountLabels} />
                      </span>
                      {contractAddress && (
                        <>
                          <span className="text-slate-300 mx-1">→</span>
                          <span className="text-[11px] text-slate-500">Contract:</span>
                          <Link
                            href={`/contract/${contractAddress}`}
                            className="text-[11px] font-mono font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                          >
                            {shortenAddress(contractAddress, 6)}
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>
                        </>
                      )}
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
                    <span className="flex items-center">
                      <Link href={`/account/${transaction.source_account}`} className="font-mono font-bold text-slate-700 hover:text-sky-600">
                        {shortenAddress(transaction.source_account, 12)}
                      </Link>
                      <AccountBadges address={transaction.source_account} labels={accountLabels} />
                    </span>
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
                            <span className="flex items-center">
                              <Link href={`/account/${transaction.source_account}`} className="font-mono text-[14px] font-medium text-slate-800 hover:text-sky-600 transition-colors">
                                {shortenAddress(transaction.source_account, 8)}
                              </Link>
                              <AccountBadges address={transaction.source_account} labels={accountLabels} />
                            </span>
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
                            ) : isContractDestination ? (
                              <div className="flex items-center gap-2">
                                <Link href={destination !== 'Contract' ? `/contract/${destination}` : '#'} className="font-mono text-[14px] font-medium text-slate-800 hover:text-indigo-600 transition-colors">
                                  {destination !== 'Contract' ? shortenAddress(destination, 8) : 'Contract'}
                                </Link>
                                <span className="inline-flex items-center bg-violet-50 text-violet-600 border border-violet-100 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide">
                                  Smart Contract
                                </span>
                              </div>
                            ) : (
                              <span className="flex items-center">
                                <Link href={`/account/${destination}`} className="font-mono text-[14px] font-medium text-slate-800 hover:text-sky-600 transition-colors">
                                  {shortenAddress(destination, 8)}
                                </Link>
                                <AccountBadges address={destination} labels={accountLabels} />
                              </span>
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

            {/* Tabs Navigation */}
            <div className="w-full border-b border-slate-200 flex gap-8 px-2">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'operations', label: 'Operations' },
                { id: 'effects', label: 'Effects' },
                ...(isContractCall ? [{ id: 'resources', label: 'Resources' }] : []),
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
                                  <span className="flex items-center">
                                    <Link href={`/account/${op.source_account || transaction.source_account}`} className="truncate max-w-[80px] hover:text-sky-600 hover:underline">
                                      {shortenAddress(op.source_account || transaction.source_account, 4)}
                                    </Link>
                                    <AccountBadges address={op.source_account || transaction.source_account} labels={accountLabels} />
                                  </span>
                                  <svg className="h-3 w-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                  </svg>
                                  <span className="flex items-center">
                                    <Link href={`/account/${op.to || (op as any).into || transaction.source_account}`} className="truncate max-w-[80px] text-sky-600 hover:text-sky-700 hover:underline">
                                      {shortenAddress(op.to || (op as any).into || transaction.source_account, 4)}
                                    </Link>
                                    <AccountBadges address={op.to || (op as any).into || transaction.source_account} labels={accountLabels} />
                                  </span>
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
                                  <span className="flex items-center">
                                    <Link href={`/account/${account}`} className="text-[10px] font-mono font-bold text-sky-600 truncate w-32 hover:underline">
                                      {shortenAddress(account, 6)}
                                    </Link>
                                    <AccountBadges address={account} labels={accountLabels} />
                                  </span>
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
                              <span className="flex items-center">
                                <Link href={`/account/${op.source_account || transaction.source_account}`} className="truncate max-w-[80px] hover:text-sky-600 hover:underline">
                                  {shortenAddress(op.source_account || transaction.source_account, 4)}
                                </Link>
                                <AccountBadges address={op.source_account || transaction.source_account} labels={accountLabels} />
                              </span>
                              <svg className="h-3 w-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                              </svg>
                              <span className="flex items-center">
                                <Link href={`/account/${op.to || (op as any).into || transaction.source_account}`} className="truncate max-w-[80px] text-sky-600 hover:text-sky-700 hover:underline">
                                  {shortenAddress(op.to || (op as any).into || transaction.source_account, 4)}
                                </Link>
                                <AccountBadges address={op.to || (op as any).into || transaction.source_account} labels={accountLabels} />
                              </span>
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
                              <span className="flex items-center">
                                <Link href={`/account/${account}`} className="text-[10px] font-mono font-bold text-sky-600 truncate w-32 hover:underline">
                                  {shortenAddress(account, 6)}
                                </Link>
                                <AccountBadges address={account} labels={accountLabels} />
                              </span>
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

              {activeTab === 'resources' && isContractCall && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column - Contract Execution & Invocation Trace */}
                  <div className="space-y-6">
                    {/* Contract Execution */}
                    <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                      <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-800">Contract Execution</h3>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {[
                          { label: 'Contract Address', value: contractAddress || 'N/A', isContract: true },
                          { label: 'Function Called', value: contractFunctionName || 'Unknown' },
                          { label: 'Function Type', value: contractFunctionType !== 'unknown' ? contractFunctionType : 'N/A' },
                        ].map((item, i) => (
                          <div key={i} className="flex justify-between items-center px-5 py-3">
                            <span className="text-xs text-slate-500 font-medium">{item.label}</span>
                            {item.isContract && contractAddress ? (
                              <Link href={`/contract/${contractAddress}`} className="text-xs font-mono font-bold text-sky-600 hover:text-sky-700">
                                {shortenAddress(contractAddress, 8)}
                              </Link>
                            ) : (
                              <span className="text-xs font-mono font-bold text-slate-700 capitalize">{item.value}</span>
                            )}
                          </div>
                        ))}
                        {/* Signatures */}
                        {transaction.signatures.length > 0 && transaction.signatures.map((sig, idx) => (
                          <div key={idx} className="flex justify-between items-center px-5 py-3">
                            <span className="text-xs text-slate-500 font-medium">Signature {transaction.signatures.length > 1 ? `${idx + 1}` : ''}</span>
                            <button
                              onClick={(e) => {
                                navigator.clipboard.writeText(sig);
                                const btn = e.currentTarget;
                                const original = btn.textContent;
                                btn.textContent = 'Copied!';
                                btn.classList.add('text-emerald-600');
                                setTimeout(() => {
                                  btn.textContent = original;
                                  btn.classList.remove('text-emerald-600');
                                }, 1500);
                              }}
                              className="text-xs font-mono font-bold text-slate-600 hover:text-slate-800 transition-all cursor-pointer"
                              title="Click to copy"
                            >
                              {sig.slice(0, 12)}...{sig.slice(-8)}
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Invocation Trace */}
                    <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                      <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-800">Invocation Trace</h3>
                      </div>
                      <div className="p-5">
                        {/* Loading state */}
                        {isDecodingXdr && (
                          <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-sky-500 border-t-transparent"></div>
                            <span className="ml-3 text-sm text-slate-500">Decoding XDR...</span>
                          </div>
                        )}

                        {/* Decoded invocation trace */}
                        {!isDecodingXdr && decodedMeta && decodedMeta.success && (
                          <>
                            {/* Return Value */}
                            {decodedMeta.returnValue && (
                              <div className="mb-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                                <div className="text-[10px] uppercase text-emerald-600 font-semibold tracking-wider mb-2">Return Value</div>
                                <div className="font-mono text-sm text-emerald-700 break-all">
                                  <span className="text-emerald-600">{decodedMeta.returnValue.type}:</span> {decodedMeta.returnValue.display}
                                </div>
                              </div>
                            )}

                            {/* Main invocation */}
                            <div className="flex items-start gap-3 mb-4">
                              <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center shrink-0 mt-0.5">
                                <svg className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-slate-500 mb-1 flex items-center flex-wrap">
                                  <Link href={`/account/${transaction.source_account}`} className="font-mono text-sky-600 hover:text-sky-700">
                                    {shortenAddress(transaction.source_account, 6)}
                                  </Link>
                                  <AccountBadges address={transaction.source_account} labels={accountLabels} />
                                  <span className="mx-1">invoked</span>
                                  <Link href={`/contract/${contractAddress}`} className="font-mono text-indigo-600 hover:text-indigo-700">
                                    {contractAddress ? shortenAddress(contractAddress, 6) : 'contract'}
                                  </Link>
                                </div>
                                <div className="bg-slate-50 rounded-lg px-4 py-2 font-mono text-sm border border-slate-100">
                                  <span className="text-indigo-600 font-semibold">{contractFunctionName || 'call'}</span>
                                  <span className="text-slate-400">(</span>
                                  <span className="text-slate-500">...</span>
                                  <span className="text-slate-400">)</span>
                                </div>
                              </div>
                            </div>

                            {/* Decoded invocation trace items */}
                            {decodedMeta.invocationTrace && decodedMeta.invocationTrace.length > 0 && (
                              <div className="space-y-2">
                                {decodedMeta.invocationTrace.slice(0, isTraceExpanded ? undefined : 15).map((call, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-3 border-l-2 border-slate-200 pl-4"
                                    style={{ marginLeft: `${Math.min(call.depth, 4) * 20}px` }}
                                  >
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${call.type === 'fn_call' ? 'bg-sky-100' :
                                      call.type === 'fn_return' ? 'bg-emerald-100' : 'bg-amber-100'
                                      }`}>
                                      {call.type === 'fn_call' ? (
                                        <svg className="w-3 h-3 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                      ) : call.type === 'fn_return' ? (
                                        <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                        </svg>
                                      ) : (
                                        <svg className="w-3 h-3 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs text-slate-600">
                                        {call.type === 'fn_call' && (
                                          <>
                                            <span className="text-sky-600 font-semibold">call</span>
                                            {call.contractId && (
                                              <>
                                                <span className="mx-1">to</span>
                                                <Link href={`/contract/${call.contractId}`} className="font-mono text-indigo-600 hover:text-indigo-700">
                                                  {shortenAddress(call.contractId, 4)}
                                                </Link>
                                              </>
                                            )}
                                            {call.functionName && (
                                              <span className="font-mono text-indigo-600 ml-1">.{call.functionName}()</span>
                                            )}
                                          </>
                                        )}
                                        {call.type === 'fn_return' && (
                                          <>
                                            <span className="text-emerald-600 font-semibold">return</span>
                                            {call.functionName && (
                                              <span className="font-mono text-slate-500 ml-1">{call.functionName}</span>
                                            )}
                                            {call.returnValue && (
                                              <span className="font-mono text-emerald-600 ml-1">= {call.returnValue.display}</span>
                                            )}
                                          </>
                                        )}
                                        {call.type === 'event' && (
                                          <>
                                            <span className="text-amber-600 font-semibold">event</span>
                                            {call.args && call.args.length > 0 && (
                                              <span className="font-mono text-slate-700 font-bold ml-1">{call.args[0].display}</span>
                                            )}
                                            {call.contractId && (
                                              <>
                                                <span className="mx-1">from</span>
                                                <Link href={`/contract/${call.contractId}`} className="font-mono text-indigo-600 hover:text-indigo-700">
                                                  {shortenAddress(call.contractId, 4)}
                                                </Link>
                                              </>
                                            )}

                                            {/* Event Details (Topics & Data) */}
                                            <div className="mt-2 bg-slate-50 rounded-lg p-3 text-[11px] font-mono text-slate-600 border border-slate-100">
                                              {/* Topics */}
                                              {call.args && call.args.length > 1 && (
                                                <div className="flex flex-col gap-2 mb-3">
                                                  {call.args.slice(1).map((arg, argIdx) => (
                                                    <div key={argIdx} className="flex flex-col">
                                                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Topic {argIdx + 1}</span>
                                                      <span className="bg-white px-3 py-1.5 rounded border border-slate-200 text-amber-600 break-all leading-relaxed">
                                                        {arg.display}
                                                      </span>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}

                                              {/* Data / Amount */}
                                              {call.returnValue && (
                                                <div className={`${call.args && call.args.length > 1 ? 'pt-3 border-t border-slate-200' : ''}`}>
                                                  <div className="flex flex-col">
                                                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Data</span>
                                                    <span className="text-slate-700 break-all leading-relaxed whitespace-pre-wrap">
                                                      {call.returnValue.display}
                                                    </span>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                      {/* Show args for function calls */}
                                      {call.type === 'fn_call' && call.args && call.args.length > 0 && (
                                        <div className="mt-1 bg-slate-50 rounded px-3 py-2 text-[11px] font-mono text-slate-600 space-y-0.5 border border-slate-100">
                                          {call.args.slice(0, 4).map((arg, argIdx) => (
                                            <div key={argIdx} className="truncate">
                                              <span className="text-slate-400">arg{argIdx}:</span> <span className="text-sky-600">{arg.display}</span>
                                            </div>
                                          ))}
                                          {call.args.length > 4 && (
                                            <div className="text-slate-400">+{call.args.length - 4} more args</div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {decodedMeta.invocationTrace.length > 15 && (
                                  <button
                                    onClick={() => setIsTraceExpanded(!isTraceExpanded)}
                                    className="w-full flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition-colors py-3 mt-2"
                                  >
                                    {isTraceExpanded ? (
                                      <>
                                        <span>Show less</span>
                                        <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </>
                                    ) : (
                                      <>
                                        <span>+{decodedMeta.invocationTrace.length - 15} more trace items</span>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Contract Events */}
                            {decodedMeta.parsedEvents && decodedMeta.parsedEvents.length > 0 && (
                              <div className="mt-6">
                                <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider mb-3">Contract Events ({decodedMeta.parsedEvents.length})</div>
                                <div className="space-y-2">
                                  {decodedMeta.parsedEvents.slice(0, 10).map((event, idx) => {
                                    const categoryColors = {
                                      transfer: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600' },
                                      approval: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-600' },
                                      mint: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-600' },
                                      burn: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-600' },
                                      trade: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600' },
                                      liquidity: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-600' },
                                      state: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600' },
                                      other: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600' },
                                    };
                                    const colors = categoryColors[event.category || 'other'];

                                    return (
                                      <div key={idx} className={`${colors.bg} rounded-lg px-4 py-3 border ${colors.border}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className={`text-[11px] uppercase ${colors.text} font-semibold`}>
                                            {event.eventName || event.type}
                                          </span>
                                          {event.category && event.category !== 'other' && (
                                            <span className="text-[10px] px-2 py-0.5 bg-white/50 rounded text-slate-500">
                                              {event.category}
                                            </span>
                                          )}
                                          {event.contractId && (
                                            <Link href={`/contract/${event.contractId}`} className="text-[11px] font-mono text-indigo-600 hover:text-indigo-700 ml-auto">
                                              {shortenAddress(event.contractId, 4)}
                                            </Link>
                                          )}
                                        </div>
                                        {event.decodedParams && Object.keys(event.decodedParams).length > 0 && (
                                          <div className="space-y-0.5 mt-2">
                                            {Object.entries(event.decodedParams).map(([key, val]) => (
                                              <div key={key} className={`text-[11px] font-mono ${colors.text}`}>
                                                <span className="text-slate-400">{key}:</span>{' '}
                                                <span>{val.display}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {decodedMeta.parsedEvents.length > 10 && (
                                    <div className="text-xs text-slate-400 text-center py-2">
                                      +{decodedMeta.parsedEvents.length - 10} more events
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* State Changes */}
                            {decodedMeta.stateChanges && decodedMeta.stateChanges.length > 0 && (
                              <div className="mt-6">
                                <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider mb-3">State Changes ({decodedMeta.stateChanges.length})</div>
                                <div className="space-y-2">
                                  {decodedMeta.stateChanges.slice(0, 8).map((change, idx) => {
                                    const changeColors = {
                                      created: { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
                                      updated: { bg: 'bg-sky-50', border: 'border-sky-200', badge: 'bg-sky-100 text-sky-700' },
                                      removed: { bg: 'bg-rose-50', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-700' },
                                    };
                                    const colors = changeColors[change.type];

                                    return (
                                      <div key={idx} className={`${colors.bg} rounded-lg px-4 py-3 border ${colors.border}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-semibold ${colors.badge}`}>
                                            {change.type}
                                          </span>
                                          {change.durability && (
                                            <span className="text-[10px] px-2 py-0.5 bg-white/50 rounded text-slate-500">
                                              {change.durability}
                                            </span>
                                          )}
                                          {change.contractId && (
                                            <Link href={`/contract/${change.contractId}`} className="text-[11px] font-mono text-indigo-600 hover:text-indigo-700 ml-auto">
                                              {shortenAddress(change.contractId, 6)}
                                            </Link>
                                          )}
                                        </div>
                                        {change.key && (
                                          <div className="text-[11px] font-mono text-slate-600 mb-1">
                                            <span className="text-slate-400">key:</span> {change.key.display}
                                          </div>
                                        )}
                                        {change.type === 'updated' && change.valueBefore && change.valueAfter && (
                                          <div className="space-y-1 text-[11px] font-mono">
                                            <div className="text-rose-600">
                                              <span className="text-slate-400">before:</span> {change.valueBefore.display}
                                            </div>
                                            <div className="text-emerald-600">
                                              <span className="text-slate-400">after:</span> {change.valueAfter.display}
                                            </div>
                                          </div>
                                        )}
                                        {change.type === 'created' && change.valueAfter && (
                                          <div className="text-[11px] font-mono text-emerald-600">
                                            <span className="text-slate-400">value:</span> {change.valueAfter.display}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {decodedMeta.stateChanges.length > 8 && (
                                    <div className="text-xs text-slate-400 text-center py-2">
                                      +{decodedMeta.stateChanges.length - 8} more state changes
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* No trace data available */}
                            {(!decodedMeta.invocationTrace || decodedMeta.invocationTrace.length === 0) &&
                             (!decodedMeta.parsedEvents || decodedMeta.parsedEvents.length === 0) &&
                             (!decodedMeta.stateChanges || decodedMeta.stateChanges.length === 0) && (
                              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-sm text-slate-500">No detailed invocation trace available for this transaction.</p>
                              </div>
                            )}
                          </>
                        )}

                        {/* Fallback when XDR not available or decoding failed */}
                        {!isDecodingXdr && (!decodedMeta || !decodedMeta.success) && (
                          <>
                            {/* Main invocation */}
                            <div className="flex items-start gap-3 mb-4">
                              <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center shrink-0 mt-0.5">
                                <svg className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-slate-500 mb-1 flex items-center flex-wrap">
                                  <Link href={`/account/${transaction.source_account}`} className="font-mono text-sky-600 hover:text-sky-700">
                                    {shortenAddress(transaction.source_account, 6)}
                                  </Link>
                                  <AccountBadges address={transaction.source_account} labels={accountLabels} />
                                  <span className="mx-1">invoked</span>
                                  <Link href={`/contract/${contractAddress}`} className="font-mono text-indigo-600 hover:text-indigo-700">
                                    {contractAddress ? shortenAddress(contractAddress, 6) : 'contract'}
                                  </Link>
                                </div>
                                <div className="bg-slate-50 rounded-lg px-4 py-2 font-mono text-sm border border-slate-100">
                                  <span className="text-indigo-600 font-semibold">{contractFunctionName || 'call'}</span>
                                  <span className="text-slate-400">(</span>
                                  <span className="text-slate-500">...</span>
                                  <span className="text-slate-400">)</span>
                                </div>
                              </div>
                            </div>

                            {/* Effects as trace items */}
                            {effects.slice(0, 6).map((effect, idx) => (
                              <div key={idx} className="flex items-start gap-3 mb-2 ml-6 border-l-2 border-slate-200 pl-4">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${effect.type.includes('credited') ? 'bg-emerald-100' :
                                  effect.type.includes('debited') ? 'bg-rose-100' : 'bg-slate-100'
                                  }`}>
                                  <svg className={`w-3 h-3 ${effect.type.includes('credited') ? 'text-emerald-600' :
                                    effect.type.includes('debited') ? 'text-rose-600' : 'text-slate-500'
                                    }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    {effect.type.includes('credited') ? (
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                    ) : effect.type.includes('debited') ? (
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                    ) : (
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    )}
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-slate-600">
                                    {effect.amount && (
                                      <span className={`font-mono font-bold ${effect.type.includes('credited') ? 'text-emerald-600' : effect.type.includes('debited') ? 'text-rose-600' : ''}`}>
                                        {effect.type.includes('credited') ? '+' : effect.type.includes('debited') ? '-' : ''}
                                        {parseFloat(effect.amount).toLocaleString(undefined, { maximumFractionDigits: 7 })} {effect.asset_type === 'native' ? 'XLM' : effect.asset_code || ''}
                                      </span>
                                    )}
                                    <span className="mx-1">{effect.type.includes('credited') ? 'credited to' : effect.type.includes('debited') ? 'debited from' : effect.type.replace(/_/g, ' ')}</span>
                                    <Link href={`/account/${effect.account}`} className="font-mono text-sky-600 hover:text-sky-700">
                                      {shortenAddress(effect.account, 4)}
                                    </Link>
                                    <AccountBadges address={effect.account} labels={accountLabels} />
                                  </div>
                                </div>
                              </div>
                            ))}

                            {effects.length > 6 && (
                              <div className="text-xs text-slate-400 text-center mt-3">
                                +{effects.length - 6} more effects
                              </div>
                            )}

                            {/* Error message if decoding failed */}
                            {decodedMeta && !decodedMeta.success && decodedMeta.error && (
                              <div className="mt-4 p-4 bg-rose-50 rounded-xl border border-rose-200">
                                <div className="flex items-start gap-3">
                                  <svg className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <div>
                                    <p className="text-sm text-rose-700 font-medium">XDR decoding error</p>
                                    <p className="text-xs text-rose-600 mt-1">{decodedMeta.error}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Note when no XDR available after fetch attempt */}
                            {xdrFetchAttempted && !transaction.result_meta_xdr && !fetchedXdr && (
                              <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                                <div className="flex items-start gap-3">
                                  <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                  <div>
                                    <p className="text-sm text-amber-700 font-medium">Invocation trace not available</p>
                                    <p className="text-xs text-amber-600 mt-1">This transaction may be too old or the Soroban RPC data has expired.</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </section>
                  </div>

                  {/* Right Column - Transaction Resources & Metrics */}
                  <div className="space-y-6">
                    {/* Transaction Resources */}
                    <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                      <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-800">Transaction Resources</h3>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {/* Transaction Overview */}
                        <div className="p-5">
                          <div className="grid grid-cols-4 gap-3">
                            {[
                              { label: 'Ledger', value: transaction.ledger.toLocaleString() },
                              { label: 'Ops', value: transaction.operation_count.toString() },
                              { label: 'Effects', value: effects.length.toString() },
                              { label: 'Sigs', value: transaction.signatures.length.toString() },
                            ].map((item, i) => (
                              <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-center">
                                <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">{item.label}</div>
                                <div className="text-sm font-bold text-slate-700 font-mono mt-1">{item.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Fees */}
                        <div className="p-5">
                          <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-4">Fees</div>
                          <div className="space-y-3">
                            {[
                              { label: 'Fee Charged', value: `${(parseInt(transaction.fee_charged) / 10000000).toFixed(7)} XLM` },
                              { label: 'Max Fee', value: `${(parseInt(transaction.max_fee) / 10000000).toFixed(7)} XLM` },
                              { label: 'Base Fee', value: `${(100 / 10000000).toFixed(7)} XLM` },
                            ].map((item, i) => (
                              <div key={i} className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">{item.label}</span>
                                <span className="font-mono font-semibold text-slate-700">{item.value}</span>
                              </div>
                            ))}
                            {/* Detailed fee breakdown */}
                            {decodedMeta && decodedMeta.success && decodedMeta.metrics && (
                              (decodedMeta.metrics.totalRefundableResourceFeeCharged || decodedMeta.metrics.totalNonRefundableResourceFeeCharged || decodedMeta.metrics.rentFeeCharged) && (
                                <div className="pt-3 mt-3 border-t border-slate-100 space-y-2">
                                  {decodedMeta.metrics.totalRefundableResourceFeeCharged && parseInt(decodedMeta.metrics.totalRefundableResourceFeeCharged) > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                      <span className="text-slate-400">└ Refundable</span>
                                      <span className="font-mono text-slate-600">{(parseInt(decodedMeta.metrics.totalRefundableResourceFeeCharged) / 10000000).toFixed(7)} XLM</span>
                                    </div>
                                  )}
                                  {decodedMeta.metrics.totalNonRefundableResourceFeeCharged && parseInt(decodedMeta.metrics.totalNonRefundableResourceFeeCharged) > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                      <span className="text-slate-400">└ Non-Refundable</span>
                                      <span className="font-mono text-slate-600">{(parseInt(decodedMeta.metrics.totalNonRefundableResourceFeeCharged) / 10000000).toFixed(7)} XLM</span>
                                    </div>
                                  )}
                                  {decodedMeta.metrics.rentFeeCharged && parseInt(decodedMeta.metrics.rentFeeCharged) > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                      <span className="text-slate-400">└ Rent</span>
                                      <span className="font-mono text-slate-600">{(parseInt(decodedMeta.metrics.rentFeeCharged) / 10000000).toFixed(7)} XLM</span>
                                    </div>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>

                        {/* Contract Resources */}
                        {(envelopeMetrics || (decodedMeta && decodedMeta.success)) && (
                          <div className="p-5">
                            <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-4">Contract Resources</div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Instructions</div>
                                <div className="text-sm font-bold font-mono text-slate-700 mt-1">
                                  {envelopeMetrics?.cpuInsns ? parseInt(envelopeMetrics.cpuInsns).toLocaleString() :
                                    decodedMeta?.metrics?.cpuInsns ? parseInt(decodedMeta.metrics.cpuInsns).toLocaleString() : '—'}
                                </div>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Read Bytes</div>
                                <div className="text-sm font-bold font-mono text-slate-700 mt-1">
                                  {envelopeMetrics?.readBytes ? parseInt(envelopeMetrics.readBytes).toLocaleString() :
                                    decodedMeta?.metrics?.txByteRead ? decodedMeta.metrics.txByteRead.toLocaleString() : '—'}
                                </div>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Write Bytes</div>
                                <div className="text-sm font-bold font-mono text-slate-700 mt-1">
                                  {envelopeMetrics?.writeBytes ? parseInt(envelopeMetrics.writeBytes).toLocaleString() :
                                    decodedMeta?.metrics?.txByteWrite ? decodedMeta.metrics.txByteWrite.toLocaleString() : '—'}
                                </div>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Ledger Entries</div>
                                <div className="text-sm font-bold font-mono text-slate-700 mt-1">
                                  {envelopeMetrics ? (
                                    <>{envelopeMetrics.readEntries || 0}R / {envelopeMetrics.writeEntries || 0}W</>
                                  ) : decodedMeta?.stateChanges ? (
                                    <>{decodedMeta.stateChanges.filter(c => c.type === 'updated' || c.type === 'removed').length}R / {decodedMeta.stateChanges.length}W</>
                                  ) : '—'}
                                </div>
                              </div>
                            </div>
                            {decodedMeta && decodedMeta.success && decodedMeta.events && decodedMeta.events.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                                <span className="text-slate-500">Events Emitted</span>
                                <span className="font-mono font-semibold text-slate-700">{decodedMeta.events.length}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Transaction Data */}
                        <div className="p-5">
                          <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-4">Transaction Data</div>
                          <div className="space-y-3">
                            {[
                              { label: 'Envelope XDR', value: Math.ceil(transaction.envelope_xdr.length * 3 / 4) },
                              { label: 'Result XDR', value: Math.ceil(transaction.result_xdr.length * 3 / 4) },
                              ...(transaction.result_meta_xdr ? [{ label: 'Result Meta', value: Math.ceil(transaction.result_meta_xdr.length * 3 / 4) }] : []),
                              ...(transaction.fee_meta_xdr ? [{ label: 'Fee Meta', value: Math.ceil(transaction.fee_meta_xdr.length * 3 / 4) }] : []),
                            ].map((item, i) => (
                              <div key={i} className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">{item.label}</span>
                                <span className="font-mono font-semibold text-slate-700">{item.value.toLocaleString()} bytes</span>
                              </div>
                            ))}
                            <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-center text-sm">
                              <span className="text-slate-700 font-medium">Total Size</span>
                              <span className="font-mono font-bold text-slate-800">
                                {(
                                  Math.ceil(transaction.envelope_xdr.length * 3 / 4) +
                                  Math.ceil(transaction.result_xdr.length * 3 / 4) +
                                  (transaction.result_meta_xdr ? Math.ceil(transaction.result_meta_xdr.length * 3 / 4) : 0) +
                                  (transaction.fee_meta_xdr ? Math.ceil(transaction.fee_meta_xdr.length * 3 / 4) : 0)
                                ).toLocaleString()} bytes
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
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
                  <span className="flex items-center">
                    <Link href={`/account/${transaction.source_account}`} className="text-[10px] font-mono font-medium text-sky-600 truncate w-24 text-right">
                      {shortenAddress(transaction.source_account, 6)}
                    </Link>
                    <AccountBadges address={transaction.source_account} labels={accountLabels} />
                  </span>
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


      </div>
    </div>
  );
}
