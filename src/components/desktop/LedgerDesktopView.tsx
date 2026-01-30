'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Ledger,
  Transaction,
  Operation,
  formatDate,
  timeAgo,
  formatStroopsToXLM,
  formatXLM,
  shortenAddress,
  getOperationTypeLabel,
  getLedgerTransactionsWithDisplayInfo,
  getLedgerOperations
} from '@/lib/stellar';

interface LedgerDesktopViewProps {
  ledger: Ledger;
  transactions: Transaction[];
  operations: Operation[];
}

const formatTokenAmount = (value?: string, digits = 7) => {
  if (!value) return '0';
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: digits });
};

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

const ITEMS_PER_PAGE = 10;

// Pagination component
const PaginationControls = ({ currentPage, totalPages, onPageChange, loading, hasMore }: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading: boolean;
  hasMore: boolean;
}) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1 mt-4 pt-3 border-t border-slate-100">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || loading}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
        let pageNum: number;
        if (totalPages <= 5) {
          pageNum = i + 1;
        } else if (currentPage <= 3) {
          pageNum = i + 1;
        } else if (currentPage >= totalPages - 2) {
          pageNum = totalPages - 4 + i;
        } else {
          pageNum = currentPage - 2 + i;
        }
        return (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            disabled={loading}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
              currentPage === pageNum
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {pageNum}
          </button>
        );
      })}

      {hasMore && totalPages > 5 && (
        <span className="text-slate-400 text-xs px-1">...</span>
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={(currentPage >= totalPages && !hasMore) || loading}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {loading && (
        <svg className="w-4 h-4 animate-spin ml-2 text-slate-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
    </div>
  );
};

export default function LedgerDesktopView({
  ledger,
  transactions: initialTransactions,
  operations: initialOperations
}: LedgerDesktopViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'operations'>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [operations, setOperations] = useState<Operation[]>(initialOperations);
  const [copied, setCopied] = useState(false);

  // Pagination state
  const [txPage, setTxPage] = useState(1);
  const [opsPage, setOpsPage] = useState(1);
  const [loadingTx, setLoadingTx] = useState(false);
  const [loadingOps, setLoadingOps] = useState(false);
  const [hasMoreTx, setHasMoreTx] = useState(initialTransactions.length >= ITEMS_PER_PAGE);
  const [hasMoreOps, setHasMoreOps] = useState(initialOperations.length >= ITEMS_PER_PAGE);

  const totalTx = ledger.successful_transaction_count + ledger.failed_transaction_count;

  // Fetch more data when navigating to pages that need it
  const fetchMoreTransactions = async (targetPage: number) => {
    const neededItems = targetPage * ITEMS_PER_PAGE;
    if (neededItems <= transactions.length || !hasMoreTx || loadingTx) return;

    setLoadingTx(true);
    const lastCursor = transactions[transactions.length - 1].paging_token;
    try {
      const nextBatch = await getLedgerTransactionsWithDisplayInfo(ledger.sequence, ITEMS_PER_PAGE, 'desc', lastCursor);
      if (nextBatch.length > 0) {
        setTransactions(prev => [...prev, ...nextBatch]);
        setHasMoreTx(nextBatch.length >= ITEMS_PER_PAGE);
      } else {
        setHasMoreTx(false);
      }
    } catch (e) {
      console.error('Failed to load more transactions', e);
    } finally {
      setLoadingTx(false);
    }
  };

  const fetchMoreOperations = async (targetPage: number) => {
    const neededItems = targetPage * ITEMS_PER_PAGE;
    if (neededItems <= operations.length || !hasMoreOps || loadingOps) return;

    setLoadingOps(true);
    const lastCursor = operations[operations.length - 1].paging_token;
    try {
      const response = await getLedgerOperations(ledger.sequence, ITEMS_PER_PAGE, 'desc', lastCursor);
      const nextBatch = response._embedded.records;
      if (nextBatch.length > 0) {
        setOperations(prev => [...prev, ...nextBatch]);
        setHasMoreOps(nextBatch.length >= ITEMS_PER_PAGE);
      } else {
        setHasMoreOps(false);
      }
    } catch (e) {
      console.error('Failed to load more operations', e);
    } finally {
      setLoadingOps(false);
    }
  };

  const goToTxPage = (page: number) => {
    setTxPage(page);
    fetchMoreTransactions(page);
  };

  const goToOpsPage = (page: number) => {
    setOpsPage(page);
    fetchMoreOperations(page);
  };

  // Calculate pagination
  const txTotalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE) + (hasMoreTx ? 1 : 0);
  const opsTotalPages = Math.ceil(operations.length / ITEMS_PER_PAGE) + (hasMoreOps ? 1 : 0);
  const paginatedTx = transactions.slice((txPage - 1) * ITEMS_PER_PAGE, txPage * ITEMS_PER_PAGE);
  const paginatedOps = operations.slice((opsPage - 1) * ITEMS_PER_PAGE, opsPage * ITEMS_PER_PAGE);

  const handleCopyHash = () => {
    navigator.clipboard.writeText(ledger.hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <div className="mx-auto max-w-[1600px] p-6 lg:p-8">
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_45%)]"></div>
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-start gap-4 min-w-0">
              <Link
                href="/ledgers"
                className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition hover:text-slate-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ledger</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    Protocol v{ledger.protocol_version}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    {ledger.successful_transaction_count} Success
                  </span>
                  {ledger.failed_transaction_count > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                      {ledger.failed_transaction_count} Failed
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900">#{ledger.sequence.toLocaleString()}</div>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDate(ledger.closed_at)}
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="font-medium text-slate-700">{timeAgo(ledger.closed_at)}</span>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleCopyHash}
                    className="group flex items-center gap-2 font-mono text-[11px] text-slate-500 hover:text-slate-800"
                  >
                    <span className="truncate">Hash {shortenAddress(ledger.hash, 8)}</span>
                    <svg className="h-3.5 w-3.5 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8m-8-4h8m-8-4h8M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H8l-4 4v10a2 2 0 002 2z" />
                    </svg>
                    {copied && <span className="text-[10px] font-semibold text-emerald-500">Copied</span>}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex divide-x divide-slate-200 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-600 shadow-sm">
              <div className="px-5 py-2">
                <div className="text-[10px] font-bold uppercase tracking-tight text-slate-400 mb-0.5">Transactions</div>
                <div className="text-sm font-bold text-slate-900">
                  <span className="text-emerald-600">{ledger.successful_transaction_count}</span>
                  {ledger.failed_transaction_count > 0 && (
                    <span className="text-rose-500"> / {ledger.failed_transaction_count}</span>
                  )}
                </div>
              </div>
              <div className="px-5 py-2">
                <div className="text-[10px] font-bold uppercase tracking-tight text-slate-400 mb-0.5">Operations</div>
                <div className="text-sm font-bold text-slate-900">{ledger.operation_count}</div>
              </div>
              <div className="px-5 py-2">
                <div className="text-[10px] font-bold uppercase tracking-tight text-slate-400 mb-0.5">Base Fee</div>
                <div className="text-sm font-bold text-slate-900">
                  {formatStroopsToXLM(ledger.base_fee_in_stroops)}{' '}
                  <span className="text-[11px] font-mono font-normal text-slate-500">XLM</span>
                </div>
              </div>
              <div className="px-5 py-2">
                <div className="text-[10px] font-bold uppercase tracking-tight text-slate-400 mb-0.5">Reserve</div>
                <div className="text-sm font-bold text-slate-900">
                  {formatStroopsToXLM(ledger.base_reserve_in_stroops)}{' '}
                  <span className="text-[11px] font-mono font-normal text-slate-500">XLM</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href={`/ledger/${ledger.sequence - 1}`}
            className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 group-hover:text-slate-800 transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </span>
              Previous Ledger
            </div>
            <span className="text-xs font-mono text-slate-400">#{(ledger.sequence - 1).toLocaleString()}</span>
          </Link>
          <Link
            href={`/ledger/${ledger.sequence + 1}`}
            className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
              Next Ledger
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 group-hover:text-slate-800 transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
            <span className="text-xs font-mono text-slate-400">#{(ledger.sequence + 1).toLocaleString()}</span>
          </Link>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row items-start">
          <div className="flex-1 w-full space-y-6">
            <div className="border-b border-slate-200 flex gap-8">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'transactions', label: `Transactions (${totalTx})` },
                { id: 'operations', label: `Operations (${ledger.operation_count})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`pb-3 text-sm font-bold transition-all ${activeTab === tab.id ? 'border-b-2 border-sky-500 text-sky-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col">
                  <div className="flex items-center justify-between px-5 pt-5 pb-2">
                    <h3 className="text-sm font-bold text-slate-800">Ledger Details</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Closed</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    <div className="p-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Hash</div>
                      <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-600 break-all">
                        {ledger.hash}
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Previous Hash</div>
                      <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-600 break-all">
                        {ledger.prev_hash}
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Max Tx Set</div>
                        <div className="text-sm font-bold text-slate-900">{ledger.max_tx_set_size}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tx Set Ops</div>
                        <div className="text-sm font-bold text-slate-900">{ledger.tx_set_operation_count}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Base Fee</div>
                        <div className="text-sm font-bold text-slate-900">
                          {formatStroopsToXLM(ledger.base_fee_in_stroops)} <span className="text-[10px] text-slate-500">XLM</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Reserve</div>
                        <div className="text-sm font-bold text-slate-900">
                          {formatStroopsToXLM(ledger.base_reserve_in_stroops)} <span className="text-[10px] text-slate-500">XLM</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col">
                  <div className="flex items-center justify-between px-5 pt-5 pb-2">
                    <h3 className="text-sm font-bold text-slate-800">Ledger Activity</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{totalTx} Total Tx</span>
                  </div>
                  <div className="p-5 grid grid-cols-2 gap-4 text-xs">
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1">Successful</div>
                      <div className="text-lg font-bold text-emerald-700">{ledger.successful_transaction_count}</div>
                    </div>
                    <div className="rounded-lg border border-rose-100 bg-rose-50 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-rose-500 mb-1">Failed</div>
                      <div className="text-lg font-bold text-rose-700">{ledger.failed_transaction_count}</div>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Operations</div>
                      <div className="text-lg font-bold text-slate-800">{ledger.operation_count}</div>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Coins</div>
                      <div className="text-lg font-bold text-slate-800">{formatXLM(ledger.total_coins)} XLM</div>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 col-span-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Fee Pool</div>
                      <div className="text-lg font-bold text-slate-800">{formatXLM(ledger.fee_pool)} XLM</div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div className="space-y-4">
                {paginatedTx.map((tx) => {
                  const info = tx.displayInfo || { type: 'other' as const };
                  let description = 'Transaction';
                  let typeDisplay = 'TRANSACTION';
                  let valueDisplay: ReactNode = null;
                  let accentClass = 'text-slate-500';
                  let iconBgClass = 'bg-slate-100 text-slate-500';

                  if (info.type === 'contract') {
                    description = info.functionName || 'Smart Contract Call';
                    typeDisplay = 'SMART CONTRACT';
                    accentClass = 'text-purple-500';
                    iconBgClass = 'bg-purple-50 text-purple-500';
                  } else if (info.type === 'payment') {
                    typeDisplay = info.isSwap ? 'SWAP' : 'PAYMENT';
                    description = info.isSwap ? 'Swap Tokens' : 'Payment';
                    accentClass = info.isSwap ? 'text-indigo-500' : 'text-emerald-500';
                    iconBgClass = info.isSwap ? 'bg-indigo-50 text-indigo-500' : 'bg-emerald-50 text-emerald-500';

                    if (info.amount) {
                      valueDisplay = (
                        <span className="text-sm font-bold text-slate-900">
                          {formatTokenAmount(info.amount, 2)}{' '}
                          <span className="text-[10px] font-bold text-slate-400">{info.asset}</span>
                        </span>
                      );
                    }
                  } else if (info.type === 'manage_offer') {
                    description = 'Manage Offer';
                    typeDisplay = 'OFFER';
                    accentClass = 'text-orange-500';
                    iconBgClass = 'bg-orange-50 text-orange-500';
                  } else if (info.type === 'multi_send' || info.type === 'bulk_send') {
                    description = info.type === 'bulk_send' ? 'Bulk Send' : 'Multi Send';
                    typeDisplay = 'MULTI SEND';
                    accentClass = 'text-cyan-500';
                    iconBgClass = 'bg-cyan-50 text-cyan-500';
                    valueDisplay = <span className="text-sm font-bold text-slate-900">{info.elementCount} Recipients</span>;
                  }

                  if (!tx.successful) {
                    accentClass = 'text-rose-500';
                    iconBgClass = 'bg-rose-50 text-rose-600';
                  }

                  return (
                    <Link
                      href={`/transaction/${tx.hash}`}
                      key={tx.id}
                      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex items-start gap-4">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${iconBgClass}`}>
                            {info.type === 'payment' && info.isSwap ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                            ) : info.type === 'contract' ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            ) : !tx.successful ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${accentClass}`}>
                                {typeDisplay}
                                {!tx.successful && <span className="ml-1 text-rose-500 font-extrabold">(FAILED)</span>}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                {tx.operation_count} Ops
                              </span>
                            </div>
                            <div className="text-sm font-bold text-slate-900">{description}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
                              <span>#{shortenAddress(tx.hash, 4)}</span>
                              <span className="text-slate-300">•</span>
                              <span>{timeAgo(tx.created_at)}</span>
                              <span className="text-slate-300">•</span>
                              <span className="truncate">From {shortenAddress(tx.source_account, 4)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {valueDisplay || (
                            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">View details</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
                {paginatedTx.length === 0 && (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    No transactions found in this ledger.
                  </div>
                )}
                <PaginationControls
                  currentPage={txPage}
                  totalPages={txTotalPages}
                  onPageChange={goToTxPage}
                  loading={loadingTx}
                  hasMore={hasMoreTx}
                />
              </div>
            )}

            {activeTab === 'operations' && (
              <div className="space-y-4">
                {paginatedOps.map((op, idx) => {
                  let typeDisplay = getOperationTypeLabel(op.type).replace(/_/g, ' ');
                  let summary = '';
                  let summaryLabel = '';

                  if (op.type === 'payment') {
                    const asset = (op as any).asset_code || ((op as any).asset_type === 'native' ? 'XLM' : '');
                    summary = `${formatTokenAmount((op as any).amount, 2)} ${asset}`;
                    summaryLabel = (op as any).to ? `To ${shortenAddress((op as any).to, 4)}` : '';
                  } else if (op.type === 'create_account') {
                    summary = `${formatTokenAmount((op as any).starting_balance, 2)} XLM`;
                    summaryLabel = 'New Account';
                  } else if (op.type === 'invoke_host_function') {
                    typeDisplay = 'SMART CONTRACT';
                    summary = decodeContractFunctionName(op);
                  } else if (op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive') {
                    typeDisplay = 'SWAP';
                    summary = `${formatTokenAmount((op as any).amount, 2)} ${(op as any).asset_code || 'XLM'}`;
                    summaryLabel = 'Received';
                  }

                  return (
                    <Link
                      href={`/transaction/${op.transaction_hash}?tab=operations&op=${op.id}`}
                      key={op.id}
                      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold border ${op.transaction_successful
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                            : 'bg-rose-50 border-rose-100 text-rose-600'
                            }`}>
                            {(opsPage - 1) * ITEMS_PER_PAGE + idx + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900 capitalize truncate">{typeDisplay}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
                              {op.source_account && (
                                <span className="truncate">Source {shortenAddress(op.source_account, 4)}</span>
                              )}
                              <span className="text-slate-300">•</span>
                              <span>{timeAgo(op.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        {(summary || summaryLabel) && (
                          <div className="text-right">
                            <div className="text-sm font-bold text-slate-900">{summary}</div>
                            <div className="text-[10px] font-medium text-slate-400">{summaryLabel}</div>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
                {paginatedOps.length === 0 && (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    No operations found in this ledger.
                  </div>
                )}
                <PaginationControls
                  currentPage={opsPage}
                  totalPages={opsTotalPages}
                  onPageChange={goToOpsPage}
                  loading={loadingOps}
                  hasMore={hasMoreOps}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
