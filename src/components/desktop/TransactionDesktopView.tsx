'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { shortenAddress, timeAgo, getOperationTypeLabel, formatDate, formatStroopsToXLM, extractContractAddress, detectContractFunctionType } from '@/lib/stellar';
import type { AccountLabel } from '@/lib/stellar';
import type { ContractFunctionType } from '@/lib/types/token';
import AccountBadges from '@/components/AccountBadges';
import GliderTabs from '@/components/ui/GliderTabs';
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

const formatTokenAmountAdaptive = (value?: string) => {
  if (!value) return '0';
  const num = Number(value);
  if (Number.isNaN(num)) return value;

  const abs = Math.abs(num);
  const digits = abs >= 100 ? 2 : abs >= 1 ? 4 : 7;
  return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: digits });
};

const getOperationCategory = (type: string): { label: string; color: string } => {
  if (type === 'payment' || type === 'create_account') return { label: 'Transfer', color: 'text-emerald-700 dark:text-emerald-400' };
  if (type === 'path_payment_strict_send' || type === 'path_payment_strict_receive') return { label: 'Swap', color: 'text-sky-700 dark:text-sky-400' };
  if (type === 'invoke_host_function') return { label: 'Contract', color: 'text-amber-700 dark:text-amber-400' };
  if (type.includes('offer')) return { label: 'DEX', color: 'text-violet-700 dark:text-violet-400' };
  if (type === 'change_trust' || type === 'set_trustline_flags') return { label: 'Action', color: 'text-[var(--text-muted)]' };
  return { label: 'Action', color: 'text-[var(--text-muted)]' };
};

const getEffectCategory = (type: string): { label: string; color: string } => {
  if (type.includes('credited')) return { label: 'Credit', color: 'text-emerald-700 dark:text-emerald-400' };
  if (type.includes('debited')) return { label: 'Debit', color: 'text-rose-700 dark:text-rose-400' };
  if (type.includes('trustline')) return { label: 'Trust', color: 'text-indigo-700 dark:text-indigo-400' };
  if (type.includes('trade')) return { label: 'Trade', color: 'text-violet-700 dark:text-violet-400' };
  return { label: 'Effect', color: 'text-[var(--text-muted)]' };
};

export default function TransactionDesktopView({ transaction, operations, effects, accountLabels = {} }: TransactionDesktopViewProps) {
  const [listTab, setListTab] = useState<'operations' | 'effects' | 'trace'>('operations');
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

  // Pre-process invocation trace: merge fn_call + fn_return pairs
  const processedTrace = useMemo(() => {
    if (!decodedMeta?.invocationTrace) return [];
    const result: (typeof decodedMeta.invocationTrace[0] & { matchedReturn?: typeof decodedMeta.returnValue })[] = [];
    const pendingCalls: Map<number, (typeof result[0])[]> = new Map();

    for (const item of decodedMeta.invocationTrace) {
      if (item.type === 'fn_call') {
        const entry = { ...item };
        result.push(entry);
        const stack = pendingCalls.get(item.depth) || [];
        stack.push(entry);
        pendingCalls.set(item.depth, stack);
      } else if (item.type === 'fn_return') {
        const stack = pendingCalls.get(item.depth);
        if (stack && stack.length > 0) {
          const matched = stack.pop()!;
          if (item.returnValue) {
            matched.matchedReturn = item.returnValue;
          }
        }
      } else {
        result.push({ ...item });
      }
    }
    return result;
  }, [decodedMeta]);

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
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <main className="mx-auto max-w-[1400px] px-4 lg:px-4 py-4 space-y-4">
        {/* Header */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-4">
          <div className="flex items-start gap-3">
            <Link href="/transactions" className="mt-0.5 w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-secondary)] transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Transaction</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${transaction.successful ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-800'}`}>
                  <span className={`w-1 h-1 rounded-full mr-1.5 ${transaction.successful ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  {transaction.successful ? 'Success' : 'Failed'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">{typeLabel}</span>
              </div>
              <button onClick={handleCopy} className="text-sm font-mono font-medium text-[var(--text-primary)] hover:text-[var(--text-secondary)] transition-colors text-left break-all">
                {transaction.hash}
                {copied && <span className="ml-2 text-[9px] font-semibold text-emerald-500">Copied!</span>}
              </button>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-[11px] text-[var(--text-tertiary)]">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {formatDate(transaction.created_at)}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {timeAgo(transaction.created_at)}
                </span>
                <span>Ledger <Link href={`/ledger/${transaction.ledger}`} className="text-sky-500 hover:underline font-semibold">{transaction.ledger.toLocaleString()}</Link></span>
              </div>
            </div>
          </div>
        </div>

        {/* From/To or Contract Interaction */}
        {isContractCall && displayAmount === 0 ? (
          /* Contract Interaction Layout */
          <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] dark:bg-amber-900/40 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
              </div>
              <div>
                <div className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Contract Interaction</div>
                <div className="text-xs text-[var(--text-tertiary)]">No value transferred</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Caller */}
              <div className="flex-1 p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">{transaction.source_account.charAt(0)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Caller</div>
                    <div className="flex items-center">
                      <Link href={`/address/${transaction.source_account}`} className="font-mono text-xs font-medium text-[var(--text-primary)] hover:text-sky-600 truncate">{shortenAddress(transaction.source_account, 6)}</Link>
                      <AccountBadges address={transaction.source_account} labels={accountLabels} />
                    </div>
                  </div>
                </div>
              </div>
              {/* Arrow */}
              <div className="flex flex-col items-center gap-1 px-2">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                <span className="text-[8px] font-bold text-amber-500 uppercase">{contractFunctionName}</span>
              </div>
              {/* Contract */}
              <div className="flex-1 p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white text-xs font-bold shadow-sm">C</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-0.5">Contract</div>
                    <Link href={`/contracts/${destination}`} className="font-mono text-xs font-medium text-[var(--text-primary)] hover:text-sky-600 truncate block">{shortenAddress(destination, 6)}</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Standard Transfer Layout */
          <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="flex-1 p-4">
                <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">From</div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shadow-md">{transaction.source_account.charAt(0)}</div>
                    <div>
                      <div className="flex items-center">
                        <Link href={`/address/${transaction.source_account}`} className="font-mono text-sm font-medium text-[var(--text-primary)] hover:text-sky-600">{shortenAddress(transaction.source_account, 6)}</Link>
                        <AccountBadges address={transaction.source_account} labels={accountLabels} />
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">Source</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-rose-500 font-bold text-lg">-{displayAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{displayAsset}</div>
                  </div>
                </div>
              </div>
              <div className="hidden md:flex items-center justify-center px-2 bg-[var(--bg-tertiary)]/50">
                <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] shadow-sm border border-[var(--border-default)] flex items-center justify-center">
                  <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </div>
              </div>
              <div className="flex-1 p-4 border-t md:border-t-0 md:border-l border-[var(--border-subtle)]">
                <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">To</div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {isMultiSend ? (
                      <>
                        <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-tertiary)] text-sm font-bold">{uniqueRecipients.length}</div>
                        <div>
                          <div className="font-medium text-sm text-[var(--text-primary)]">{uniqueRecipients.length} Recipients</div>
                          <div className="flex -space-x-1.5 mt-1">
                            {uniqueRecipients.slice(0, 3).map((a, i) => <div key={a} className={`w-4 h-4 rounded-full ring-2 ring-[var(--bg-secondary)] text-[6px] font-bold text-white flex items-center justify-center ${['bg-indigo-500', 'bg-sky-400', 'bg-emerald-400'][i]}`}>{a.charAt(0)}</div>)}
                            {uniqueRecipients.length > 3 && <div className="w-4 h-4 rounded-full bg-[var(--bg-tertiary)] ring-2 ring-[var(--bg-secondary)] text-[6px] font-bold text-[var(--text-tertiary)] flex items-center justify-center">+{uniqueRecipients.length - 3}</div>}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white text-sm font-bold shadow-md">{isContractDestination ? 'C' : destination.charAt(0)}</div>
                        <div>
                          <div className="flex items-center">
                            <Link href={isContractDestination ? `/contracts/${destination}` : `/address/${destination}`} className="font-mono text-sm font-medium text-[var(--text-primary)] hover:text-sky-600">{shortenAddress(destination, 6)}</Link>
                            {!isContractDestination && <AccountBadges address={destination} labels={accountLabels} />}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)]">{isContractDestination ? 'Contract' : 'Destination'}</div>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-500 font-bold text-lg">+{displayAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{displayAsset}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Master-Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Sidebar - Operations/Effects List */}
          <div className="lg:col-span-4">
            <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-4">
              {/* Tabs Header */}
              <div className="flex items-center gap-4 border-b border-[var(--border-subtle)] mb-3">
                <div className="w-[260px] max-w-full py-3">
                  <GliderTabs
                    size="sm"
                    className="bg-[var(--bg-tertiary)] shadow-none border-0"
                    tabs={[
                      { id: 'operations', label: 'Operations', count: filteredOperations.length },
                      { id: 'effects', label: 'Effects', count: effects.length },
                      ...(isContractCall ? [{ id: 'trace' as const, label: 'Trace' }] : []),
                    ]}
                    activeId={listTab}
                    onChange={(id) => {
                      setShowFilterDropdown(false);
                      setListTab(id as 'operations' | 'effects' | 'trace');
                    }}
                  />
                </div>

                {/* Filter Dropdown - Only show when operations tab is active */}
                {listTab === 'operations' && (
                  <div className="relative ml-auto">
                    <button
                      onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors border ${operationFilter !== 'all' ? 'bg-sky-50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800' : 'text-[var(--text-muted)] border-[var(--border-subtle)] hover:border-[var(--border-default)] hover:text-[var(--text-secondary)]'}`}
                    >
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                      {operationFilter === 'all' ? 'All' : operationFilter}
                      <svg className={`w-2.5 h-2.5 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showFilterDropdown && (
                      <div className="absolute right-0 mt-1 w-36 bg-[var(--bg-secondary)] rounded-xl shadow-lg border border-[var(--border-default)] py-1.5 z-50">
                        <button
                          onClick={() => { setOperationFilter('all'); setShowFilterDropdown(false); setSelectedOpIndex(0); }}
                          className={`w-full px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider hover:bg-[var(--bg-tertiary)] transition-colors ${operationFilter === 'all' ? 'text-sky-600 bg-sky-50 dark:bg-sky-900/40 dark:text-sky-400' : 'text-[var(--text-secondary)]'}`}
                        >
                          All Types
                        </button>
                        {operationCategories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => { setOperationFilter(cat); setShowFilterDropdown(false); setSelectedOpIndex(0); }}
                            className={`w-full px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider hover:bg-[var(--bg-tertiary)] transition-colors ${operationFilter === cat ? 'text-sky-600 bg-sky-50 dark:bg-sky-900/40 dark:text-sky-400' : 'text-[var(--text-secondary)]'}`}
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
                <div className="space-y-1.5 overflow-y-auto max-h-[500px] pr-1" style={{ scrollbarWidth: 'thin' }}>
                  {filteredOperations.length === 0 ? (
                    <div className="text-center py-4 text-[var(--text-muted)] text-sm">No operations matching filter.</div>
                  ) : (
                    filteredOperations.map((op, idx) => {
                      const { title } = getOpInfo(op);
                      const { label: cat, color: catColor } = getOperationCategory(op.type);
                      const isActive = idx === selectedOpIndex;
                      const originalIdx = operations.findIndex(o => o.id === op.id);
                      return (
                        <button key={op.id} onClick={() => setSelectedOpIndex(idx)} className={`w-full p-3 rounded-xl cursor-pointer transition-colors text-left group ${isActive ? 'bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800 shadow-sm' : 'hover:bg-[var(--bg-tertiary)] border border-transparent hover:border-[var(--border-default)]'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-[9px] font-black transition-colors ${isActive ? 'bg-sky-600 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] group-hover:bg-[var(--bg-tertiary)]'}`}>OP{originalIdx + 1}</div>
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-sm font-semibold truncate ${isActive ? 'text-sky-600' : 'text-[var(--text-primary)] group-hover:text-sky-600'}`}>{title}</h4>
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
                <div className="space-y-1.5 overflow-y-auto max-h-[500px] pr-1" style={{ scrollbarWidth: 'thin' }}>
                  {effects.length === 0 ? (
                    <div className="text-center py-4 text-[var(--text-muted)] text-sm">No effects found.</div>
                  ) : (
                    effects.map((ef, idx) => {
                      const { title } = getEffectInfo(ef);
                      const { label: cat, color: catColor } = getEffectCategory(ef.type);
                      const isActive = idx === selectedEffectIndex;
                      const isCredit = ef.type.includes('credited');
                      const isDebit = ef.type.includes('debited');
                      return (
                        <button key={ef.id} onClick={() => setSelectedEffectIndex(idx)} className={`w-full p-3 rounded-xl cursor-pointer transition-colors text-left group ${isActive ? 'bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800 shadow-sm' : 'hover:bg-[var(--bg-tertiary)] border border-transparent hover:border-[var(--border-default)]'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center transition-colors ${isActive ? 'bg-sky-600 text-white' : isCredit ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : isDebit ? 'bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400' : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'}`}>
                              {isCredit ? (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                              ) : isDebit ? (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-sm font-semibold truncate ${isActive ? 'text-sky-600' : 'text-[var(--text-primary)] group-hover:text-sky-600'}`}>{title}</h4>
                              <p className={`text-[9px] uppercase tracking-wider font-bold ${isActive ? 'text-sky-400' : catColor}`}>{cat}</p>
                            </div>
                            {ef.amount && (
                              <span className={`text-xs font-bold ${isCredit ? 'text-emerald-500' : isDebit ? 'text-rose-500' : 'text-[var(--text-tertiary)]'}`}>
                                {isCredit ? '+' : isDebit ? '-' : ''}{formatTokenAmountAdaptive(ef.amount)}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Trace Sidebar - Events & State Changes */}
              {listTab === 'trace' && isContractCall && decodedMeta && decodedMeta.success && (
                <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1" style={{ scrollbarWidth: 'thin' }}>
                  {/* Return Value */}
                  {decodedMeta.returnValue && (
                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                      <div className="text-[9px] uppercase text-emerald-600 dark:text-emerald-400 font-bold tracking-widest mb-1">Return Value</div>
                      <div className="font-mono text-xs text-emerald-700 dark:text-emerald-400 break-all">
                        {decodedMeta.returnValue.display}
                      </div>
                    </div>
                  )}

                  {/* Contract Events */}
                  {decodedMeta.parsedEvents && decodedMeta.parsedEvents.length > 0 && (
                    <div>
                      <div className="text-[9px] uppercase text-[var(--text-muted)] font-bold tracking-widest mb-2">Events ({decodedMeta.parsedEvents.length})</div>
                      <div className="space-y-1.5">
                        {decodedMeta.parsedEvents.map((event, idx) => {
                          const categoryColors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
                            transfer: { bg: 'bg-emerald-50/50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/50', text: 'text-emerald-700 dark:text-emerald-400', icon: 'text-emerald-600 dark:text-emerald-400' },
                            approval: { bg: 'bg-indigo-50/50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800/50', text: 'text-indigo-700 dark:text-indigo-400', icon: 'text-indigo-600 dark:text-indigo-400' },
                            mint: { bg: 'bg-amber-50/50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800/50', text: 'text-amber-700 dark:text-amber-400', icon: 'text-amber-600 dark:text-amber-400' },
                            burn: { bg: 'bg-rose-50/50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800/50', text: 'text-rose-700 dark:text-rose-400', icon: 'text-rose-600 dark:text-rose-400' },
                            trade: { bg: 'bg-violet-50/50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-800/50', text: 'text-violet-700 dark:text-violet-400', icon: 'text-violet-600 dark:text-violet-400' },
                            liquidity: { bg: 'bg-cyan-50/50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-800/50', text: 'text-cyan-700 dark:text-cyan-400', icon: 'text-cyan-600 dark:text-cyan-400' },
                            state: { bg: 'bg-[var(--bg-tertiary)]', border: 'border-[var(--border-default)]', text: 'text-[var(--text-secondary)]', icon: 'text-[var(--text-tertiary)]' },
                            other: { bg: 'bg-[var(--bg-tertiary)]', border: 'border-[var(--border-default)]', text: 'text-[var(--text-secondary)]', icon: 'text-[var(--text-tertiary)]' },
                          };
                          const colors = categoryColors[event.category || 'other'];
                          return (
                            <div key={idx} className={`${colors.bg} rounded-lg px-3 py-2 border ${colors.border}`}>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className={`text-[9px] uppercase ${colors.text} font-bold`}>
                                  {event.eventName || event.type}
                                </span>
                                {event.contractId && (
                                  <Link href={`/contracts/${event.contractId}`} className="text-[10px] font-mono text-sky-600 hover:underline ml-auto">
                                    {shortenAddress(event.contractId, 3)}
                                  </Link>
                                )}
                              </div>
                              {event.decodedParams && Object.keys(event.decodedParams).length > 0 ? (
                                <div className="space-y-0.5">
                                  {Object.entries(event.decodedParams).map(([key, val]) => (
                                    <div key={key} className={`text-[10px] font-mono ${colors.text} truncate`}>
                                      <span className="text-[var(--text-muted)]">{key}:</span> {val.display}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <>
                                  {event.topics.length > 1 && (
                                    <div className={`text-[10px] font-mono ${colors.text} truncate`}>
                                      {event.topics.slice(1).map((t, i) => (
                                        <span key={i} className="mr-1.5">{t.display}</span>
                                      ))}
                                    </div>
                                  )}
                                  {event.data && (
                                    <div className={`text-[10px] font-mono ${colors.icon} truncate`}>{event.data.display}</div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* State Changes */}
                  {decodedMeta.stateChanges && decodedMeta.stateChanges.length > 0 && (
                    <div>
                      <div className="text-[9px] uppercase text-[var(--text-muted)] font-bold tracking-widest mb-2">State Changes ({decodedMeta.stateChanges.length})</div>
                      <div className="space-y-1.5">
                        {decodedMeta.stateChanges.map((change, idx) => {
                          const changeColors: Record<string, { bg: string; border: string; badge: string }> = {
                            created: { bg: 'bg-emerald-50/50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/50', badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' },
                            updated: { bg: 'bg-sky-50/50 dark:bg-sky-900/20', border: 'border-sky-200 dark:border-sky-800/50', badge: 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400' },
                            removed: { bg: 'bg-rose-50/50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800/50', badge: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400' },
                          };
                          const colors = changeColors[change.type];
                          return (
                            <div key={idx} className={`${colors.bg} rounded-lg px-3 py-2 border ${colors.border}`}>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className={`text-[8px] uppercase px-1.5 py-0.5 rounded-full font-bold ${colors.badge}`}>{change.type}</span>
                                {change.durability && (
                                  <span className="text-[8px] px-1.5 py-0.5 bg-[var(--bg-secondary)]/50 rounded-full text-[var(--text-tertiary)]">{change.durability}</span>
                                )}
                                {change.contractId && (
                                  <Link href={`/contracts/${change.contractId}`} className="text-[10px] font-mono text-sky-600 hover:underline ml-auto">
                                    {shortenAddress(change.contractId, 3)}
                                  </Link>
                                )}
                              </div>
                              {change.key && (
                                <div className="text-[10px] font-mono text-[var(--text-secondary)] truncate">
                                  <span className="text-[var(--text-muted)]">key:</span> {change.key.display}
                                </div>
                              )}
                              {change.type === 'updated' && change.valueBefore && change.valueAfter && (
                                <div className="space-y-0.5 text-[10px] font-mono">
                                  <div className="text-rose-600 dark:text-rose-400 truncate"><span className="text-[var(--text-muted)]">-</span> {change.valueBefore.display}</div>
                                  <div className="text-emerald-600 dark:text-emerald-400 truncate"><span className="text-[var(--text-muted)]">+</span> {change.valueAfter.display}</div>
                                </div>
                              )}
                              {change.type === 'created' && change.valueAfter && (
                                <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 truncate">{change.valueAfter.display}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Details */}
          <div className="lg:col-span-8">
            {/* Operation Details */}
            {listTab === 'operations' && selectedOp && (
              <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-4 space-y-4">
                {/* Op Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-sky-50 dark:bg-sky-900/40 rounded-xl flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {selectedOp.type === 'payment' || selectedOp.type === 'create_account' ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> : selectedOp.type === 'invoke_host_function' ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />}
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="bg-sky-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded">OP {selectedOpIndex + 1}</span>
                        <h2 className="text-xl font-bold text-[var(--text-primary)]">{getOpInfo(selectedOp).title}</h2>
                      </div>
                      <p className="text-[var(--text-tertiary)] text-sm">{getOpInfo(selectedOp).desc}</p>
                    </div>
                  </div>
                </div>

                {/* Accounts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]/70 border border-[var(--border-subtle)]">
                    <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Source</div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center">
                        <Link href={`/address/${selectedOp.source_account || transaction.source_account}`} className="font-mono text-xs font-medium text-[var(--text-secondary)] hover:text-sky-600">{shortenAddress(selectedOp.source_account || transaction.source_account, 6)}</Link>
                        <AccountBadges address={selectedOp.source_account || transaction.source_account} labels={accountLabels} />
                      </span>
                      <button onClick={() => navigator.clipboard.writeText(selectedOp.source_account || transaction.source_account)} className="text-[var(--text-muted)] hover:text-sky-500">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      </button>
                    </div>
                  </div>
                  {(selectedOp.to || (selectedOp as any).account || selectedOp.type === 'invoke_host_function') && (
                    <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]/70 border border-[var(--border-subtle)]">
                      <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">{selectedOp.type === 'invoke_host_function' ? 'Contract' : 'Destination'}</div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center">
                          {selectedOp.type === 'invoke_host_function' ? (
                            <Link href={`/contracts/${contractAddress || ''}`} className="font-mono text-xs font-medium text-[var(--text-secondary)] hover:text-sky-600">{contractAddress ? shortenAddress(contractAddress, 6) : 'Unknown'}</Link>
                          ) : (
                            <>
                              <Link href={`/address/${selectedOp.to || (selectedOp as any).account}`} className="font-mono text-xs font-medium text-[var(--text-secondary)] hover:text-sky-600">{shortenAddress(selectedOp.to || (selectedOp as any).account, 6)}</Link>
                              <AccountBadges address={selectedOp.to || (selectedOp as any).account} labels={accountLabels} />
                            </>
                          )}
                        </span>
                        <button onClick={() => navigator.clipboard.writeText(selectedOp.to || (selectedOp as any).account || contractAddress || '')} className="text-[var(--text-muted)] hover:text-sky-500">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Amount */}
                {(selectedOp.amount || (selectedOp as any).starting_balance) && (
                  <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 flex items-center justify-between">
                    <div>
                      <div className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest mb-1">Amount</div>
                      <div className="text-xl font-bold text-emerald-600">{formatTokenAmount(selectedOp.amount || (selectedOp as any).starting_balance)} <span className="text-sm">{selectedOp.asset_type === 'native' ? 'XLM' : (selectedOp.asset_code || 'XLM')}</span></div>
                    </div>
                    {selectedOp.asset_issuer && (
                      <div className="bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-emerald-100 text-[10px]">
                        <span className="text-[var(--text-muted)]">Issuer:</span> <span className="font-mono text-[var(--text-secondary)]">{shortenAddress(selectedOp.asset_issuer, 4)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Status Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                    <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Status</div>
                    <div className={`flex items-center text-sm font-semibold ${selectedOp.transaction_successful ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${selectedOp.transaction_successful ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                      {selectedOp.transaction_successful ? 'Success' : 'Failed'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                    <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Fee</div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">{feeXLM} XLM</div>
                  </div>
                  <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                    <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Ledger</div>
                    <Link href={`/ledger/${transaction.ledger}`} className="text-sm font-semibold text-sky-600 hover:underline">{transaction.ledger.toLocaleString()}</Link>
                  </div>
                </div>

                {/* Technical */}
                <div className="pt-4 border-t border-[var(--border-subtle)]">
                  <h3 className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-4">Technical</h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <div><span className="text-[var(--text-muted)] text-xs">Max Fee</span><div className="font-mono text-[var(--text-primary)]">{maxFeeXLM} XLM</div></div>
                    <div><span className="text-[var(--text-muted)] text-xs">Memo</span><div className={transaction.memo ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] italic'}>{transaction.memo || 'None'}</div></div>
                    <div><span className="text-[var(--text-muted)] text-xs">Sequence</span><div className="font-mono text-[var(--text-primary)]">{transaction.source_account_sequence || '--'}</div></div>
                    <div><span className="text-[var(--text-muted)] text-xs">Fee Account</span><Link href={`/address/${transaction.source_account}`} className="font-mono text-sky-600 hover:underline block truncate">{shortenAddress(transaction.source_account, 6)}</Link></div>
                  </div>
                  {transaction.signatures.length > 0 && (
                    <div className="mt-4 p-3 bg-[var(--bg-tertiary)] rounded-xl">
                      <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Signatures</div>
                      <div className="font-mono text-[9px] text-[var(--text-tertiary)] break-all leading-relaxed">{transaction.signatures.join(' ')}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Effect Details */}
            {listTab === 'effects' && selectedEffect && (
              <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-4 space-y-4">
                {/* Effect Header */}
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${selectedEffect.type.includes('credited') ? 'bg-emerald-50 dark:bg-emerald-900/40' : selectedEffect.type.includes('debited') ? 'bg-rose-50 dark:bg-rose-900/40' : 'bg-[var(--bg-tertiary)]'}`}>
                    {selectedEffect.type.includes('credited') ? (
                      <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                    ) : selectedEffect.type.includes('debited') ? (
                      <svg className="w-6 h-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                    ) : (
                      <svg className="w-6 h-6 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${selectedEffect.type.includes('credited') ? 'bg-emerald-600 text-white' : selectedEffect.type.includes('debited') ? 'bg-rose-600 text-white' : 'bg-[var(--text-secondary)] text-white'}`}>
                        EF {selectedEffectIndex + 1}
                      </span>
                      <h2 className="text-xl font-bold text-[var(--text-primary)]">{getEffectInfo(selectedEffect).title}</h2>
                    </div>
                    <p className="text-[var(--text-tertiary)] text-sm">{getEffectInfo(selectedEffect).desc}</p>
                  </div>
                </div>

                {/* Account */}
                <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]/70 border border-[var(--border-subtle)]">
                  <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Account</div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Link href={`/address/${selectedEffect.account}`} className="font-mono text-xs font-medium text-[var(--text-secondary)] hover:text-sky-600">{shortenAddress(selectedEffect.account, 8)}</Link>
                      <AccountBadges address={selectedEffect.account} labels={accountLabels} />
                    </span>
                    <button onClick={() => navigator.clipboard.writeText(selectedEffect.account)} className="text-[var(--text-muted)] hover:text-sky-500">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                  </div>
                </div>

                {/* Amount */}
                {selectedEffect.amount && (
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${selectedEffect.type.includes('credited') ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50' : selectedEffect.type.includes('debited') ? 'bg-rose-50/50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/50' : 'bg-[var(--bg-tertiary)]/50 border-[var(--border-subtle)]'}`}>
                    <div>
                      <div className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${selectedEffect.type.includes('credited') ? 'text-emerald-700/60 dark:text-emerald-400/60' : selectedEffect.type.includes('debited') ? 'text-rose-700/60 dark:text-rose-400/60' : 'text-[var(--text-muted)]'}`}>Amount</div>
                      <div className={`text-xl font-bold ${selectedEffect.type.includes('credited') ? 'text-emerald-700 dark:text-emerald-400' : selectedEffect.type.includes('debited') ? 'text-rose-700 dark:text-rose-400' : 'text-[var(--text-primary)]'}`}>
                        {selectedEffect.type.includes('credited') ? '+' : selectedEffect.type.includes('debited') ? '-' : ''}
                        {formatTokenAmount(selectedEffect.amount)} <span className="text-sm">{selectedEffect.asset_type === 'native' ? 'XLM' : (selectedEffect.asset_code || 'XLM')}</span>
                      </div>
                    </div>
                    {selectedEffect.asset_issuer && (
                      <div className="bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-[10px]">
                        <span className="text-[var(--text-muted)]">Issuer:</span> <span className="font-mono text-[var(--text-secondary)]">{shortenAddress(selectedEffect.asset_issuer, 4)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Effect Type Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                    <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Effect Type</div>
                    <div className="text-sm font-semibold text-[var(--text-primary)] capitalize">{selectedEffect.type.replace(/_/g, ' ')}</div>
                  </div>
                  <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                    <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Asset</div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">{selectedEffect.asset_type === 'native' ? 'XLM (Native)' : (selectedEffect.asset_code || 'Unknown')}</div>
                  </div>
                </div>

                {/* Transaction Info */}
                <div className="pt-4 border-t border-[var(--border-subtle)]">
                  <h3 className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-4">Transaction Info</h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <div><span className="text-[var(--text-muted)] text-xs">Fee Charged</span><div className="font-mono text-[var(--text-primary)]">{feeXLM} XLM</div></div>
                    <div><span className="text-[var(--text-muted)] text-xs">Ledger</span><Link href={`/ledger/${transaction.ledger}`} className="text-sky-600 hover:underline font-semibold block">{transaction.ledger.toLocaleString()}</Link></div>
                    <div><span className="text-[var(--text-muted)] text-xs">Source Account</span><Link href={`/address/${transaction.source_account}`} className="font-mono text-sky-600 hover:underline block truncate">{shortenAddress(transaction.source_account, 6)}</Link></div>
                    <div><span className="text-[var(--text-muted)] text-xs">Time</span><div className="text-[var(--text-primary)]">{timeAgo(transaction.created_at)}</div></div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state for effects when no effects */}
            {listTab === 'effects' && effects.length === 0 && (
              <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-4 text-center">
                <div className="text-[var(--text-muted)] text-sm">No effects found for this transaction.</div>
              </div>
            )}

            {/* Trace Panel - Invocation Tree */}
            {listTab === 'trace' && isContractCall && (
              <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] overflow-hidden">
                <div className="px-5 py-3 bg-[var(--bg-tertiary)] border-b border-[var(--border-subtle)]">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">Invocation Trace</h3>
                </div>
                <div className="p-5">
                  {/* Loading state */}
                  {isDecodingXdr && (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-sky-500 border-t-transparent"></div>
                      <span className="ml-3 text-sm text-[var(--text-tertiary)]">Decoding invocation trace...</span>
                    </div>
                  )}

                  {/* Decoded trace */}
                  {!isDecodingXdr && decodedMeta && decodedMeta.success && (
                    <>
                      {/* Main invocation header */}
                      <div className="flex items-start gap-3 mb-4 pb-4 border-b border-[var(--border-subtle)]">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0 mt-0.5">
                          <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-[var(--text-tertiary)] mb-1.5 flex items-center flex-wrap gap-1">
                            <Link href={`/address/${transaction.source_account}`} className="font-mono text-sky-600 hover:underline font-medium">
                              {shortenAddress(transaction.source_account, 6)}
                            </Link>
                            <AccountBadges address={transaction.source_account} labels={accountLabels} />
                            <span>invoked</span>
                            <Link href={`/contracts/${contractAddress || ''}`} className="font-mono text-sky-600 hover:underline font-medium">
                              {contractAddress ? shortenAddress(contractAddress, 6) : 'contract'}
                            </Link>
                          </div>
                          <div className="bg-[var(--bg-tertiary)] rounded-lg px-4 py-2.5 font-mono text-sm border border-[var(--border-subtle)] break-all">
                            <span className="text-amber-600 dark:text-amber-400 font-bold">{contractFunctionName || 'call'}</span>
                            <span className="text-[var(--text-tertiary)]">(</span>
                            {processedTrace.length > 0 && processedTrace[0].type === 'fn_call' && processedTrace[0].args && processedTrace[0].args.length > 0 ? (
                              <span className="text-[var(--text-secondary)]">
                                {processedTrace[0].args.map((a, i) => (
                                  <span key={i}>
                                    {i > 0 && <span className="text-[var(--text-muted)]">, </span>}
                                    <span className="text-sky-600 dark:text-sky-400">{a.display}</span>
                                  </span>
                                ))}
                              </span>
                            ) : (
                              <span className="text-[var(--text-muted)]">...</span>
                            )}
                            <span className="text-[var(--text-tertiary)]">)</span>
                            {processedTrace.length > 0 && processedTrace[0].matchedReturn && (
                              <span className="text-emerald-600 dark:text-emerald-400 ml-2">
                                {'\u2192'} {processedTrace[0].matchedReturn.display}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Full invocation tree */}
                      {processedTrace.length > 1 && (
                        <div className="space-y-1">
                          {processedTrace.slice(1).map((call, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2.5 py-1"
                              style={{ marginLeft: `${Math.min(call.depth, 6) * 24}px` }}
                            >
                              <div className="flex flex-col items-center shrink-0 mt-1">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                  call.type === 'fn_call' ? 'bg-sky-50 dark:bg-sky-900/30' : 'bg-amber-50 dark:bg-amber-900/30'
                                }`}>
                                  {call.type === 'fn_call' ? (
                                    <svg className="w-2.5 h-2.5 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                    </svg>
                                  ) : (
                                    <svg className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                  )}
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                {call.type === 'fn_call' && (
                                  <div className="text-sm font-mono leading-relaxed break-all">
                                    <span className="text-[var(--text-muted)]">Invoked </span>
                                    {call.contractId && (
                                      <Link href={`/contracts/${call.contractId}`} className="text-sky-600 dark:text-sky-400 hover:underline">
                                        {shortenAddress(call.contractId, 4)}
                                      </Link>
                                    )}
                                    {call.functionName && (
                                      <>
                                        <span className="text-[var(--text-muted)]"> </span>
                                        <span className="text-amber-600 dark:text-amber-400 font-semibold">{call.functionName}</span>
                                        <span className="text-[var(--text-tertiary)]">(</span>
                                        {call.args && call.args.length > 0 && (
                                          <span className="text-[var(--text-secondary)]">
                                            {call.args.map((a, i) => (
                                              <span key={i}>
                                                {i > 0 && <span className="text-[var(--text-muted)]">, </span>}
                                                <span className="text-sky-600 dark:text-sky-400">{a.display}</span>
                                              </span>
                                            ))}
                                          </span>
                                        )}
                                        <span className="text-[var(--text-tertiary)]">)</span>
                                      </>
                                    )}
                                    {call.matchedReturn && (
                                      <span className="text-emerald-600 dark:text-emerald-400 ml-1.5">
                                        {'\u2192'} {call.matchedReturn.display}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {call.type === 'event' && (
                                  <div className="text-sm font-mono leading-relaxed break-all">
                                    <span className="text-amber-600 dark:text-amber-400 font-semibold">event </span>
                                    {call.contractId && (
                                      <Link href={`/contracts/${call.contractId}`} className="text-sky-600 dark:text-sky-400 hover:underline">
                                        {shortenAddress(call.contractId, 4)}
                                      </Link>
                                    )}
                                    {call.args && call.args.length > 0 && (
                                      <span className="text-[var(--text-secondary)]">
                                        {' ['}
                                        {call.args.map((a, i) => (
                                          <span key={i}>
                                            {i > 0 && ', '}
                                            <span className="text-amber-600 dark:text-amber-400">{a.display}</span>
                                          </span>
                                        ))}
                                        {']'}
                                      </span>
                                    )}
                                    {call.returnValue && (
                                      <span className="text-[var(--text-secondary)]"> data: <span className="text-amber-600 dark:text-amber-400">{call.returnValue.display}</span></span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* No trace data */}
                      {decodedMeta.invocationTrace.length === 0 && (
                        <div className="text-center py-8 text-[var(--text-muted)] text-sm">No detailed invocation trace available for this transaction.</div>
                      )}
                    </>
                  )}

                  {/* Fallback */}
                  {!isDecodingXdr && (!decodedMeta || !decodedMeta.success) && (
                    <div className="text-center py-8">
                      <div className="text-[var(--text-muted)] text-sm">
                        {decodedMeta?.error ? (
                          <div className="space-y-2">
                            <p className="font-medium text-rose-600">XDR decoding error</p>
                            <p className="text-xs">{decodedMeta.error}</p>
                          </div>
                        ) : (
                          'Invocation trace not available. This transaction may be too old or the Soroban RPC data has expired.'
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
