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

const getOperationCategory = (type: string): { label: string; color: string } => {
  if (type === 'payment' || type === 'create_account') return { label: 'Transfer', color: 'text-emerald-500' };
  if (type === 'path_payment_strict_send' || type === 'path_payment_strict_receive') return { label: 'Swap', color: 'text-sky-500' };
  if (type === 'invoke_host_function') return { label: 'Contract', color: 'text-amber-500' };
  if (type.includes('offer')) return { label: 'DEX', color: 'text-violet-500' };
  if (type === 'change_trust' || type === 'set_trustline_flags') return { label: 'Action', color: 'text-slate-400' };
  return { label: 'Action', color: 'text-slate-400' };
};

const getEffectCategory = (type: string): { label: string; color: string } => {
  if (type.includes('credited')) return { label: 'Credit', color: 'text-emerald-500' };
  if (type.includes('debited')) return { label: 'Debit', color: 'text-rose-500' };
  if (type.includes('trustline')) return { label: 'Trust', color: 'text-indigo-500' };
  if (type.includes('trade')) return { label: 'Trade', color: 'text-violet-500' };
  return { label: 'Effect', color: 'text-slate-400' };
};

export default function TransactionDesktopView({ transaction, operations, effects, accountLabels = {} }: TransactionDesktopViewProps) {
  const [listTab, setListTab] = useState<'operations' | 'effects'>('operations');
  const [selectedOpIndex, setSelectedOpIndex] = useState<number>(0);
  const [selectedEffectIndex, setSelectedEffectIndex] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [operationFilter, setOperationFilter] = useState<string>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Get unique operation categories for filter
  const operationCategories = [...new Set(operations.map(op => getOperationCategory(op.type).label))];
  const filteredOperations = operationFilter === 'all'
    ? operations
    : operations.filter(op => getOperationCategory(op.type).label === operationFilter);

  const [decodedMeta, setDecodedMeta] = useState<DecodedTransactionMeta | null>(null);
  const [isDecodingXdr, setIsDecodingXdr] = useState(false);
  const [fetchedXdr, setFetchedXdr] = useState<string | null>(null);
  const [xdrFetchAttempted, setXdrFetchAttempted] = useState(false);
  const [decodedXdr, setDecodedXdr] = useState<string | null>(null);

  const contractOp = operations.find(op => op.type === 'invoke_host_function');
  const isContractCall = !!contractOp;
  const isSwap = operations.some(op => op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive');
  const paymentOps = operations.filter(op => op.type === 'payment' || op.type === 'create_account');
  const isMultiSend = paymentOps.length > 1;

  const primaryOp = operations.find(op => ['payment', 'create_account', 'path_payment_strict_send', 'path_payment_strict_receive'].includes(op.type)) || operations[0];
  let destination = transaction.source_account;
  let isContractDestination = false;
  if (primaryOp) {
    if (primaryOp.to) destination = primaryOp.to;
    else if ((primaryOp as any).into) destination = (primaryOp as any).into;
    else if (primaryOp.type === 'create_account') destination = (primaryOp as any).account;
    else if (primaryOp.type === 'invoke_host_function') {
      const contractAddr = extractContractAddress(primaryOp as any);
      if (contractAddr) { destination = contractAddr; isContractDestination = true; }
      else { destination = 'Contract'; isContractDestination = true; }
    }
  }

  let typeLabel = 'Transaction';
  if (isSwap) typeLabel = 'Swap';
  else if (isMultiSend) typeLabel = paymentOps.length > 10 ? 'Bulk Send' : 'Multi Send';
  else if (isContractCall) {
    const fname = decodeContractFunctionName(contractOp!);
    typeLabel = fname === 'Contract Call' ? 'Contract' : fname;
  }

  let multiSendSum = 0, multiSendAsset = '';
  if (isMultiSend) {
    multiSendSum = paymentOps.reduce((sum, op) => sum + parseFloat(op.amount || '0'), 0);
    const firstAsset = paymentOps[0].asset_type === 'native' ? 'XLM' : (paymentOps[0].asset_code || 'XLM');
    const allSame = paymentOps.every(op => (op.asset_type === 'native' ? 'XLM' : (op.asset_code || 'XLM')) === firstAsset);
    multiSendAsset = allSame ? firstAsset : 'Mixed';
  }

  let contractFunctionName = 'Contract Call';
  let contractAddress: string | null = null;
  if (isContractCall && contractOp) {
    contractFunctionName = decodeContractFunctionName(contractOp);
    contractAddress = extractContractAddress(contractOp as any);
  }

  const getDisplayAmount = () => {
    if (isMultiSend) return multiSendSum;
    const amt = parseFloat(primaryOp?.amount || (primaryOp as any)?.starting_balance || '0');
    if (amt > 0) return amt;
    const ef = effects.find(e => e.type.includes('credited') || e.type.includes('debited'));
    return ef?.amount ? parseFloat(ef.amount) : 0;
  };

  const getDisplayAsset = () => {
    if (isMultiSend) return multiSendAsset;
    const amt = parseFloat(primaryOp?.amount || '0');
    if (amt > 0) return primaryOp?.asset_type === 'native' ? 'XLM' : (primaryOp?.asset_code || 'XLM');
    const ef = effects.find(e => e.type.includes('credited') || e.type.includes('debited'));
    return ef ? (ef.asset_type === 'native' ? 'XLM' : (ef.asset_code || 'XLM')) : 'XLM';
  };

  const displayAmount = getDisplayAmount();
  const displayAsset = getDisplayAsset();
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

  useEffect(() => {
    if (!isContractCall || isDecodingXdr) return;
    const xdrToUse = fetchedXdr || transaction.result_meta_xdr;
    if (!xdrToUse || decodedXdr === xdrToUse) return;
    setIsDecodingXdr(true);
    setTimeout(() => {
      setDecodedMeta(decodeTransactionMeta(xdrToUse));
      setDecodedXdr(xdrToUse);
      setIsDecodingXdr(false);
    }, 0);
  }, [isContractCall, transaction.result_meta_xdr, fetchedXdr, decodedXdr, isDecodingXdr]);

  useEffect(() => {
    if (!isContractCall || isDecodingXdr || xdrFetchAttempted || fetchedXdr) return;
    const hasTraceData = decodedMeta?.success && ((decodedMeta.invocationTrace?.length || 0) > 0 || (decodedMeta.parsedEvents?.length || 0) > 0);
    if (transaction.result_meta_xdr && hasTraceData) return;
    setXdrFetchAttempted(true);
    setIsDecodingXdr(true);
    fetch(`/api/transaction-meta?hash=${transaction.hash}`)
      .then(res => res.json())
      .then(data => { if (data.resultMetaXdr) setFetchedXdr(data.resultMetaXdr); setIsDecodingXdr(false); })
      .catch(() => setIsDecodingXdr(false));
  }, [isContractCall, isDecodingXdr, xdrFetchAttempted, fetchedXdr, decodedMeta, transaction.result_meta_xdr, transaction.hash]);

  const handleCopy = () => { navigator.clipboard.writeText(transaction.hash); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  const selectedOp = filteredOperations[selectedOpIndex];
  const selectedEffect = effects[selectedEffectIndex];

  const getOpInfo = (op: Operation) => {
    const type = op.type;
    let title = getOperationTypeLabel(type).replace(/_/g, ' ');
    let desc = '';
    if (type === 'payment') { title = 'Payment'; desc = `Send ${op.asset_type === 'native' ? 'XLM' : op.asset_code || ''}`; }
    else if (type === 'create_account') { title = 'Create Account'; desc = 'New account'; }
    else if (type.includes('path_payment')) { title = 'Path Payment'; desc = 'Asset swap'; }
    else if (type === 'invoke_host_function') { title = decodeContractFunctionName(op); desc = 'Contract call'; }
    else if (type === 'change_trust') { title = 'Change Trust'; desc = 'Trustline'; }
    else if (type === 'set_trustline_flags') { title = 'Set Flags'; desc = 'Trustline auth'; }
    else if (type.includes('offer')) { title = type.includes('sell') ? 'Sell Order' : 'Buy Order'; desc = 'DEX order'; }
    return { title, desc };
  };

  const getEffectInfo = (ef: Effect) => {
    const isCredit = ef.type.includes('credited');
    const isDebit = ef.type.includes('debited');
    let title = ef.type.replace(/_/g, ' ');
    let desc = '';

    if (isCredit) {
      title = 'Account Credited';
      desc = `Received ${ef.asset_type === 'native' ? 'XLM' : ef.asset_code || ''}`;
    } else if (isDebit) {
      title = 'Account Debited';
      desc = `Sent ${ef.asset_type === 'native' ? 'XLM' : ef.asset_code || ''}`;
    } else if (ef.type.includes('trustline')) {
      title = 'Trustline Changed';
      desc = 'Trust authorization';
    } else if (ef.type.includes('trade')) {
      title = 'Trade';
      desc = 'Asset exchange';
    }

    return { title, desc };
  };

  const uniqueRecipients = useMemo(() => {
    if (!isMultiSend) return [];
    const r = new Set<string>();
    paymentOps.forEach(op => { const d = op.to || (op as any).account; if (d) r.add(d); });
    return Array.from(r);
  }, [isMultiSend, paymentOps]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <main className="mx-auto max-w-[1400px] px-4 lg:px-6 py-6 space-y-4">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4">
          <div className="flex items-start gap-3">
            <Link href="/transactions" className="mt-0.5 w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Transaction</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${transaction.successful ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                  <span className={`w-1 h-1 rounded-full mr-1.5 ${transaction.successful ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  {transaction.successful ? 'Success' : 'Failed'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-slate-100 text-slate-600">{typeLabel}</span>
              </div>
              <button onClick={handleCopy} className="text-sm font-mono font-medium text-slate-800 hover:text-slate-600 transition-colors text-left break-all">
                {transaction.hash}
                {copied && <span className="ml-2 text-[9px] font-semibold text-emerald-500">Copied!</span>}
              </button>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {formatDate(transaction.created_at)}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {timeAgo(transaction.created_at)}
                </span>
                <span>Ledger <Link href={`/ledger/${transaction.ledger}`} className="text-sky-500 hover:underline font-semibold">{transaction.ledger.toLocaleString()}</Link></span>
              </div>
            </div>
          </div>
        </div>

        {/* From/To */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div className="flex-1 p-4">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">From</div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shadow-md">{transaction.source_account.charAt(0)}</div>
                  <div>
                    <div className="flex items-center">
                      <Link href={`/account/${transaction.source_account}`} className="font-mono text-sm font-medium text-slate-900 hover:text-sky-600">{shortenAddress(transaction.source_account, 6)}</Link>
                      <AccountBadges address={transaction.source_account} labels={accountLabels} />
                    </div>
                    <div className="text-[10px] text-slate-400">Source</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-rose-500 font-bold text-lg">-{displayAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
                  <div className="text-[10px] text-slate-400">{displayAsset}</div>
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center justify-center px-2 bg-slate-50/50">
              <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </div>
            </div>
            <div className="flex-1 p-4 border-t md:border-t-0 md:border-l border-slate-100">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">To</div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {isMultiSend ? (
                    <>
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 text-sm font-bold">{uniqueRecipients.length}</div>
                      <div>
                        <div className="font-medium text-sm text-slate-900">{uniqueRecipients.length} Recipients</div>
                        <div className="flex -space-x-1.5 mt-1">
                          {uniqueRecipients.slice(0, 3).map((a, i) => <div key={a} className={`w-4 h-4 rounded-full ring-2 ring-white text-[6px] font-bold text-white flex items-center justify-center ${['bg-indigo-500', 'bg-sky-400', 'bg-emerald-400'][i]}`}>{a.charAt(0)}</div>)}
                          {uniqueRecipients.length > 3 && <div className="w-4 h-4 rounded-full bg-slate-200 ring-2 ring-white text-[6px] font-bold text-slate-500 flex items-center justify-center">+{uniqueRecipients.length - 3}</div>}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white text-sm font-bold shadow-md">{isContractDestination ? 'C' : destination.charAt(0)}</div>
                      <div>
                        <div className="flex items-center">
                          <Link href={isContractDestination ? `/contract/${destination}` : `/account/${destination}`} className="font-mono text-sm font-medium text-slate-900 hover:text-sky-600">{shortenAddress(destination, 6)}</Link>
                          {!isContractDestination && <AccountBadges address={destination} labels={accountLabels} />}
                        </div>
                        <div className="text-[10px] text-slate-400">{isContractDestination ? 'Contract' : 'Destination'}</div>
                      </div>
                    </>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-emerald-500 font-bold text-lg">+{displayAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
                  <div className="text-[10px] text-slate-400">{displayAsset}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Master-Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Sidebar - Operations/Effects List */}
          <div className="lg:col-span-4 space-y-3">
            {/* Tabs Header */}
            <div className="flex items-center gap-4 px-1 border-b border-slate-200/60 pb-2">
              <button
                onClick={() => setListTab('operations')}
                className={`text-[10px] font-bold uppercase tracking-widest pb-2 -mb-[9px] transition-colors ${listTab === 'operations' ? 'text-sky-600 border-b-2 border-sky-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Operations <span className={listTab === 'operations' ? 'text-sky-500' : 'text-slate-400'}>{filteredOperations.length}</span>
              </button>
              <button
                onClick={() => setListTab('effects')}
                className={`text-[10px] font-bold uppercase tracking-widest pb-2 -mb-[9px] transition-colors ${listTab === 'effects' ? 'text-sky-600 border-b-2 border-sky-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Effects <span className={listTab === 'effects' ? 'text-sky-500' : 'text-slate-400'}>{effects.length}</span>
              </button>

              {/* Filter Dropdown - Only show when operations tab is active */}
              {listTab === 'operations' && (
                <div className="relative ml-auto">
                  <button
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${operationFilter !== 'all' ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    {operationFilter === 'all' ? 'Filter' : operationFilter}
                    <svg className={`w-3 h-3 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showFilterDropdown && (
                    <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                      <button
                        onClick={() => { setOperationFilter('all'); setShowFilterDropdown(false); setSelectedOpIndex(0); }}
                        className={`w-full px-3 py-1.5 text-left text-[11px] hover:bg-slate-50 ${operationFilter === 'all' ? 'text-sky-600 font-medium bg-sky-50' : 'text-slate-600'}`}
                      >
                        All Types
                      </button>
                      {operationCategories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => { setOperationFilter(cat); setShowFilterDropdown(false); setSelectedOpIndex(0); }}
                          className={`w-full px-3 py-1.5 text-left text-[11px] hover:bg-slate-50 ${operationFilter === cat ? 'text-sky-600 font-medium bg-sky-50' : 'text-slate-600'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Operations List */}
            {listTab === 'operations' && (
              <div className="space-y-1.5 overflow-y-auto max-h-[600px] pr-1" style={{ scrollbarWidth: 'thin' }}>
                {filteredOperations.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">No operations matching filter.</div>
                ) : (
                  filteredOperations.map((op, idx) => {
                    const { title } = getOpInfo(op);
                    const { label: cat, color: catColor } = getOperationCategory(op.type);
                    const isActive = idx === selectedOpIndex;
                    const originalIdx = operations.findIndex(o => o.id === op.id);
                    return (
                      <button key={op.id} onClick={() => setSelectedOpIndex(idx)} className={`w-full p-3 rounded-xl cursor-pointer transition-all text-left group ${isActive ? 'bg-sky-50 border border-sky-100 shadow-sm' : 'hover:bg-white border border-transparent hover:border-slate-200/50'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-[9px] font-black transition-all ${isActive ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>OP{originalIdx + 1}</div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-sm font-semibold truncate ${isActive ? 'text-sky-600' : 'text-slate-800 group-hover:text-sky-600'}`}>{title}</h4>
                            <p className={`text-[9px] uppercase tracking-wider font-bold ${isActive ? 'text-sky-400' : catColor}`}>{cat}</p>
                          </div>
                          {isActive && <svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Effects List */}
            {listTab === 'effects' && (
              <div className="space-y-1.5 overflow-y-auto max-h-[600px] pr-1" style={{ scrollbarWidth: 'thin' }}>
                {effects.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">No effects found.</div>
                ) : (
                  effects.map((ef, idx) => {
                    const { title } = getEffectInfo(ef);
                    const { label: cat, color: catColor } = getEffectCategory(ef.type);
                    const isActive = idx === selectedEffectIndex;
                    const isCredit = ef.type.includes('credited');
                    const isDebit = ef.type.includes('debited');
                    return (
                      <button key={ef.id} onClick={() => setSelectedEffectIndex(idx)} className={`w-full p-3 rounded-xl cursor-pointer transition-all text-left group ${isActive ? 'bg-sky-50 border border-sky-100 shadow-sm' : 'hover:bg-white border border-transparent hover:border-slate-200/50'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center transition-all ${isActive ? 'bg-sky-600 text-white' : isCredit ? 'bg-emerald-100 text-emerald-600' : isDebit ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                            {isCredit ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                            ) : isDebit ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-sm font-semibold truncate ${isActive ? 'text-sky-600' : 'text-slate-800 group-hover:text-sky-600'}`}>{title}</h4>
                            <p className={`text-[9px] uppercase tracking-wider font-bold ${isActive ? 'text-sky-400' : catColor}`}>{cat}</p>
                          </div>
                          {ef.amount && (
                            <span className={`text-xs font-bold ${isCredit ? 'text-emerald-500' : isDebit ? 'text-rose-500' : 'text-slate-500'}`}>
                              {isCredit ? '+' : isDebit ? '-' : ''}{formatTokenAmount(ef.amount, 2)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Right Panel - Details */}
          <div className="lg:col-span-8">
            {/* Operation Details */}
            {listTab === 'operations' && selectedOp && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 space-y-5">
                {/* Op Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {selectedOp.type === 'payment' || selectedOp.type === 'create_account' ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> : selectedOp.type === 'invoke_host_function' ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />}
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="bg-sky-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded">OP {selectedOpIndex + 1}</span>
                        <h2 className="text-xl font-bold text-slate-900">{getOpInfo(selectedOp).title}</h2>
                      </div>
                      <p className="text-slate-500 text-sm">{getOpInfo(selectedOp).desc}</p>
                    </div>
                  </div>
                </div>

                {/* Accounts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Source</div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center">
                        <Link href={`/account/${selectedOp.source_account || transaction.source_account}`} className="font-mono text-xs font-medium text-slate-700 hover:text-sky-600">{shortenAddress(selectedOp.source_account || transaction.source_account, 6)}</Link>
                        <AccountBadges address={selectedOp.source_account || transaction.source_account} labels={accountLabels} />
                      </span>
                      <button onClick={() => navigator.clipboard.writeText(selectedOp.source_account || transaction.source_account)} className="text-slate-400 hover:text-sky-500">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      </button>
                    </div>
                  </div>
                  {(selectedOp.to || (selectedOp as any).account || selectedOp.type === 'invoke_host_function') && (
                    <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">{selectedOp.type === 'invoke_host_function' ? 'Contract' : 'Destination'}</div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center">
                          {selectedOp.type === 'invoke_host_function' ? (
                            <Link href={`/contract/${contractAddress || ''}`} className="font-mono text-xs font-medium text-slate-700 hover:text-sky-600">{contractAddress ? shortenAddress(contractAddress, 6) : 'Unknown'}</Link>
                          ) : (
                            <>
                              <Link href={`/account/${selectedOp.to || (selectedOp as any).account}`} className="font-mono text-xs font-medium text-slate-700 hover:text-sky-600">{shortenAddress(selectedOp.to || (selectedOp as any).account, 6)}</Link>
                              <AccountBadges address={selectedOp.to || (selectedOp as any).account} labels={accountLabels} />
                            </>
                          )}
                        </span>
                        <button onClick={() => navigator.clipboard.writeText(selectedOp.to || (selectedOp as any).account || contractAddress || '')} className="text-slate-400 hover:text-sky-500">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Amount */}
                {(selectedOp.amount || (selectedOp as any).starting_balance) && (
                  <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between">
                    <div>
                      <div className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest mb-1">Amount</div>
                      <div className="text-xl font-bold text-emerald-600">{formatTokenAmount(selectedOp.amount || (selectedOp as any).starting_balance)} <span className="text-sm">{selectedOp.asset_type === 'native' ? 'XLM' : (selectedOp.asset_code || 'XLM')}</span></div>
                    </div>
                    {selectedOp.asset_issuer && (
                      <div className="bg-white px-3 py-1.5 rounded-lg border border-emerald-100 text-[10px]">
                        <span className="text-slate-400">Issuer:</span> <span className="font-mono text-slate-600">{shortenAddress(selectedOp.asset_issuer, 4)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Status Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl border border-slate-100 bg-white">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</div>
                    <div className={`flex items-center text-sm font-semibold ${selectedOp.transaction_successful ? 'text-emerald-600' : 'text-rose-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${selectedOp.transaction_successful ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                      {selectedOp.transaction_successful ? 'Success' : 'Failed'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-100 bg-white">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fee</div>
                    <div className="text-sm font-semibold text-slate-800">{feeXLM} XLM</div>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-100 bg-white">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ledger</div>
                    <Link href={`/ledger/${transaction.ledger}`} className="text-sm font-semibold text-sky-600 hover:underline">{transaction.ledger.toLocaleString()}</Link>
                  </div>
                </div>

                {/* Technical */}
                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4">Technical</h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <div><span className="text-slate-400 text-xs">Max Fee</span><div className="font-mono text-slate-800">{maxFeeXLM} XLM</div></div>
                    <div><span className="text-slate-400 text-xs">Memo</span><div className={transaction.memo ? 'text-slate-800' : 'text-slate-400 italic'}>{transaction.memo || 'None'}</div></div>
                    <div><span className="text-slate-400 text-xs">Sequence</span><div className="font-mono text-slate-800">{transaction.source_account_sequence || '--'}</div></div>
                    <div><span className="text-slate-400 text-xs">Fee Account</span><Link href={`/account/${transaction.source_account}`} className="font-mono text-sky-600 hover:underline block truncate">{shortenAddress(transaction.source_account, 6)}</Link></div>
                  </div>
                  {transaction.signatures.length > 0 && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-xl">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Signatures</div>
                      <div className="font-mono text-[9px] text-slate-500 break-all leading-relaxed">{transaction.signatures.join(' ')}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Effect Details */}
            {listTab === 'effects' && selectedEffect && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 space-y-5">
                {/* Effect Header */}
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${selectedEffect.type.includes('credited') ? 'bg-emerald-50' : selectedEffect.type.includes('debited') ? 'bg-rose-50' : 'bg-slate-50'}`}>
                    {selectedEffect.type.includes('credited') ? (
                      <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                    ) : selectedEffect.type.includes('debited') ? (
                      <svg className="w-6 h-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                    ) : (
                      <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${selectedEffect.type.includes('credited') ? 'bg-emerald-600 text-white' : selectedEffect.type.includes('debited') ? 'bg-rose-600 text-white' : 'bg-slate-600 text-white'}`}>
                        EF {selectedEffectIndex + 1}
                      </span>
                      <h2 className="text-xl font-bold text-slate-900">{getEffectInfo(selectedEffect).title}</h2>
                    </div>
                    <p className="text-slate-500 text-sm">{getEffectInfo(selectedEffect).desc}</p>
                  </div>
                </div>

                {/* Account */}
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Account</div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Link href={`/account/${selectedEffect.account}`} className="font-mono text-xs font-medium text-slate-700 hover:text-sky-600">{shortenAddress(selectedEffect.account, 8)}</Link>
                      <AccountBadges address={selectedEffect.account} labels={accountLabels} />
                    </span>
                    <button onClick={() => navigator.clipboard.writeText(selectedEffect.account)} className="text-slate-400 hover:text-sky-500">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                  </div>
                </div>

                {/* Amount */}
                {selectedEffect.amount && (
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${selectedEffect.type.includes('credited') ? 'bg-emerald-50/50 border-emerald-100' : selectedEffect.type.includes('debited') ? 'bg-rose-50/50 border-rose-100' : 'bg-slate-50/50 border-slate-100'}`}>
                    <div>
                      <div className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${selectedEffect.type.includes('credited') ? 'text-emerald-600/60' : selectedEffect.type.includes('debited') ? 'text-rose-600/60' : 'text-slate-400'}`}>Amount</div>
                      <div className={`text-xl font-bold ${selectedEffect.type.includes('credited') ? 'text-emerald-600' : selectedEffect.type.includes('debited') ? 'text-rose-600' : 'text-slate-800'}`}>
                        {selectedEffect.type.includes('credited') ? '+' : selectedEffect.type.includes('debited') ? '-' : ''}
                        {formatTokenAmount(selectedEffect.amount)} <span className="text-sm">{selectedEffect.asset_type === 'native' ? 'XLM' : (selectedEffect.asset_code || 'XLM')}</span>
                      </div>
                    </div>
                    {selectedEffect.asset_issuer && (
                      <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-100 text-[10px]">
                        <span className="text-slate-400">Issuer:</span> <span className="font-mono text-slate-600">{shortenAddress(selectedEffect.asset_issuer, 4)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Effect Type Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-slate-100 bg-white">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Effect Type</div>
                    <div className="text-sm font-semibold text-slate-800 capitalize">{selectedEffect.type.replace(/_/g, ' ')}</div>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-100 bg-white">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Asset</div>
                    <div className="text-sm font-semibold text-slate-800">{selectedEffect.asset_type === 'native' ? 'XLM (Native)' : (selectedEffect.asset_code || 'Unknown')}</div>
                  </div>
                </div>

                {/* Transaction Info */}
                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4">Transaction Info</h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <div><span className="text-slate-400 text-xs">Fee Charged</span><div className="font-mono text-slate-800">{feeXLM} XLM</div></div>
                    <div><span className="text-slate-400 text-xs">Ledger</span><Link href={`/ledger/${transaction.ledger}`} className="text-sky-600 hover:underline font-semibold block">{transaction.ledger.toLocaleString()}</Link></div>
                    <div><span className="text-slate-400 text-xs">Source Account</span><Link href={`/account/${transaction.source_account}`} className="font-mono text-sky-600 hover:underline block truncate">{shortenAddress(transaction.source_account, 6)}</Link></div>
                    <div><span className="text-slate-400 text-xs">Time</span><div className="text-slate-800">{timeAgo(transaction.created_at)}</div></div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state for effects when no effects */}
            {listTab === 'effects' && effects.length === 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8 text-center">
                <div className="text-slate-400 text-sm">No effects found for this transaction.</div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
