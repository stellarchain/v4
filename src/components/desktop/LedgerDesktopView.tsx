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
    <div className="flex items-center justify-center gap-1.5 px-5 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]/50">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || loading}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-muted)] hover:bg-sky-50 hover:border-sky-200 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-bold transition-all ${currentPage === pageNum
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:bg-sky-50 hover:text-sky-700'
              }`}
          >
            {pageNum}
          </button>
        );
      })}

      {hasMore && totalPages > 5 && (
        <span className="text-[var(--text-muted)] text-xs px-1">...</span>
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={(currentPage >= totalPages && !hasMore) || loading}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-muted)] hover:bg-sky-50 hover:border-sky-200 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {loading && (
        <svg className="w-4 h-4 animate-spin ml-2 text-sky-500" fill="none" viewBox="0 0 24 24">
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
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[1600px] p-6 lg:p-8">
        {/* Header Card */}
        <div className="mb-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            {/* Left: Title & Meta */}
            <div className="flex items-start gap-4 min-w-0">
              <Link
                href="/ledgers"
                className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 transition hover:bg-sky-200 dark:hover:bg-sky-900/60"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Ledger</span>
                  <span className="bg-sky-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                    v{ledger.protocol_version}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {ledger.successful_transaction_count} Success
                  </span>
                  {ledger.failed_transaction_count > 0 && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-rose-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      {ledger.failed_transaction_count} Failed
                    </span>
                  )}
                </div>
                <div className="text-xl font-bold text-[var(--text-primary)]">#{ledger.sequence.toLocaleString()}</div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--text-tertiary)]">
                  <span className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDate(ledger.closed_at)}
                  </span>
                  <span className="text-[var(--text-muted)]">•</span>
                  <span className="font-semibold text-sky-600">{timeAgo(ledger.closed_at)}</span>
                  <span className="text-[var(--text-muted)]">•</span>
                  <button
                    type="button"
                    onClick={handleCopyHash}
                    className="group flex items-center gap-1.5 font-mono text-[11px] text-[var(--text-muted)] hover:text-sky-600 transition-colors"
                  >
                    <span className="truncate">{shortenAddress(ledger.hash, 6)}</span>
                    <svg className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {copied && <span className="text-[9px] font-bold text-emerald-500">Copied!</span>}
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Quick Stats */}
            <div className="flex gap-3">
              <div className="p-3 rounded-xl bg-[var(--bg-primary)]/70 border border-[var(--border-subtle)] min-w-[90px]">
                <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Transactions</div>
                <div className="text-lg font-bold text-[var(--text-primary)]">
                  <span className="text-emerald-600">{ledger.successful_transaction_count}</span>
                  {ledger.failed_transaction_count > 0 && (
                    <span className="text-rose-500">/{ledger.failed_transaction_count}</span>
                  )}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-primary)]/70 border border-[var(--border-subtle)] min-w-[90px]">
                <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Operations</div>
                <div className="text-lg font-bold text-[var(--text-primary)]">{ledger.operation_count}</div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-primary)]/70 border border-[var(--border-subtle)] min-w-[90px]">
                <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Base Fee</div>
                <div className="text-lg font-bold text-sky-600">
                  {formatStroopsToXLM(ledger.base_fee_in_stroops)}
                  <span className="text-[10px] font-medium text-[var(--text-muted)] ml-1">XLM</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-primary)]/70 border border-[var(--border-subtle)] min-w-[90px]">
                <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Reserve</div>
                <div className="text-lg font-bold text-[var(--text-primary)]">
                  {formatStroopsToXLM(ledger.base_reserve_in_stroops)}
                  <span className="text-[10px] font-medium text-[var(--text-muted)] ml-1">XLM</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          <Link
            href={`/ledger/${ledger.sequence - 1}`}
            className="group flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] hover:border-sky-200 hover:bg-sky-50/50 transition-all"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] group-hover:bg-sky-100 group-hover:text-sky-600 transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </span>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Previous</div>
              <div className="text-sm font-bold text-[var(--text-secondary)] group-hover:text-sky-600 font-mono">#{(ledger.sequence - 1).toLocaleString()}</div>
            </div>
          </Link>
          <Link
            href={`/ledger/${ledger.sequence + 1}`}
            className="group flex items-center justify-end gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] hover:border-sky-200 hover:bg-sky-50/50 transition-all"
          >
            <div className="text-right">
              <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Next</div>
              <div className="text-sm font-bold text-[var(--text-secondary)] group-hover:text-sky-600 font-mono">#{(ledger.sequence + 1).toLocaleString()}</div>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] group-hover:bg-sky-100 group-hover:text-sky-600 transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>
        </div>

        {/* Tabs */}
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-sm px-4 mb-5">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'transactions', label: 'Transactions', count: totalTx },
              { id: 'operations', label: 'Operations', count: ledger.operation_count },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab.id
                    ? 'text-sky-600 border-sky-600'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] border-transparent'
                  }`}
              >
                {tab.label}
                {'count' in tab && (
                  <span className={activeTab === tab.id ? 'text-sky-500 ml-1' : 'text-[var(--text-muted)] ml-1'}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 w-full space-y-5">

          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left: Ledger Details */}
              <section className="lg:col-span-7 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-sm">
                <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                  <div className="w-9 h-9 bg-sky-100 dark:bg-sky-900/40 rounded-lg flex items-center justify-center text-sky-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Ledger Details</h3>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500">Closed</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="p-3 rounded-xl bg-[var(--bg-primary)]/70 border border-[var(--border-subtle)]">
                    <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Hash</div>
                    <div className="font-mono text-xs font-medium text-[var(--text-secondary)] break-all leading-relaxed">
                      {ledger.hash}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-primary)]/70 border border-[var(--border-subtle)]">
                    <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Previous Hash</div>
                    <div className="font-mono text-xs font-medium text-[var(--text-secondary)] break-all leading-relaxed">
                      {ledger.prev_hash}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                      <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Max Tx Set</div>
                      <div className="text-lg font-bold text-[var(--text-primary)]">{ledger.max_tx_set_size}</div>
                    </div>
                    <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                      <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Tx Set Ops</div>
                      <div className="text-lg font-bold text-[var(--text-primary)]">{ledger.tx_set_operation_count}</div>
                    </div>
                    <div className="p-3 rounded-xl border border-sky-200 dark:border-sky-800/50 bg-sky-100/50 dark:bg-sky-900/30">
                      <div className="text-[9px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest mb-1">Base Fee</div>
                      <div className="text-lg font-bold text-sky-600 dark:text-sky-400">
                        {formatStroopsToXLM(ledger.base_fee_in_stroops)} <span className="text-xs font-medium text-[var(--text-muted)]">XLM</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                      <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Reserve</div>
                      <div className="text-lg font-bold text-[var(--text-primary)]">
                        {formatStroopsToXLM(ledger.base_reserve_in_stroops)} <span className="text-xs font-medium text-[var(--text-muted)]">XLM</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Right: Ledger Activity */}
              <section className="lg:col-span-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-sm">
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg flex items-center justify-center text-emerald-500">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Ledger Activity</h3>
                  </div>
                  <span className="bg-[var(--bg-tertiary)] px-2 py-0.5 rounded text-[9px] font-bold text-[var(--text-tertiary)]">{totalTx} TX</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-100/50 dark:bg-emerald-900/30">
                      <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Successful</div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{ledger.successful_transaction_count}</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-800/50 bg-rose-100/50 dark:bg-rose-900/30">
                      <div className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">Failed</div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span className="text-xl font-bold text-rose-600 dark:text-rose-400">{ledger.failed_transaction_count}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]/70">
                    <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Operations</div>
                    <div className="text-xl font-bold text-[var(--text-primary)]">{ledger.operation_count}</div>
                  </div>
                  <div className="p-3 rounded-xl border border-violet-200 dark:border-violet-800/50 bg-violet-100/50 dark:bg-violet-900/30">
                    <div className="text-[9px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-1">Total Coins</div>
                    <div className="text-lg font-bold text-violet-600 dark:text-violet-400">{formatXLM(ledger.total_coins)} <span className="text-xs font-medium">XLM</span></div>
                  </div>
                  <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-100/50 dark:bg-amber-900/30">
                    <div className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Fee Pool</div>
                    <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{formatXLM(ledger.fee_pool)} <span className="text-xs font-medium">XLM</span></div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-sm overflow-hidden">
              <div className="divide-y divide-[var(--border-subtle)]">
                {paginatedTx.map((tx, idx) => {
                  const info = tx.displayInfo || { type: 'other' as const };
                  let description = 'Transaction';
                  let typeDisplay = 'TRANSACTION';
                  let valueDisplay: ReactNode = null;
                  let accentClass = 'text-[var(--text-tertiary)]';
                  let bgClass = 'bg-[var(--bg-primary)]';
                  let iconBgClass = 'bg-[var(--bg-tertiary)]';

                  if (info.type === 'contract') {
                    description = info.functionName || 'Contract Call';
                    typeDisplay = 'CONTRACT';
                    accentClass = 'text-amber-600 dark:text-amber-400';
                    bgClass = 'bg-amber-100 dark:bg-amber-900/40';
                    iconBgClass = 'bg-amber-100 dark:bg-amber-900/40';
                  } else if (info.type === 'payment') {
                    typeDisplay = info.isSwap ? 'SWAP' : 'PAYMENT';
                    description = info.isSwap ? 'Swap Tokens' : 'Payment';
                    accentClass = info.isSwap ? 'text-violet-600 dark:text-violet-400' : 'text-emerald-600 dark:text-emerald-400';
                    bgClass = info.isSwap ? 'bg-violet-100 dark:bg-violet-900/40' : 'bg-emerald-100 dark:bg-emerald-900/40';
                    iconBgClass = info.isSwap ? 'bg-violet-100 dark:bg-violet-900/40' : 'bg-emerald-100 dark:bg-emerald-900/40';

                    if (info.amount) {
                      valueDisplay = (
                        <div className="text-right">
                          <div className="text-sm font-bold text-[var(--text-primary)]">{formatTokenAmount(info.amount, 2)}</div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{info.asset}</div>
                        </div>
                      );
                    }
                  } else if (info.type === 'manage_offer') {
                    description = 'Manage Offer';
                    typeDisplay = 'OFFER';
                    accentClass = 'text-indigo-600 dark:text-indigo-400';
                    bgClass = 'bg-indigo-100 dark:bg-indigo-900/40';
                    iconBgClass = 'bg-indigo-100 dark:bg-indigo-900/40';
                  } else if (info.type === 'multi_send' || info.type === 'bulk_send') {
                    description = info.type === 'bulk_send' ? 'Bulk Send' : 'Multi Send';
                    typeDisplay = 'MULTI SEND';
                    accentClass = 'text-cyan-600 dark:text-cyan-400';
                    bgClass = 'bg-cyan-100 dark:bg-cyan-900/40';
                    iconBgClass = 'bg-cyan-100 dark:bg-cyan-900/40';
                    valueDisplay = (
                      <div className="text-right">
                        <div className="text-sm font-bold text-[var(--text-primary)]">{info.elementCount}</div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Recipients</div>
                      </div>
                    );
                  }

                  if (!tx.successful) {
                    accentClass = 'text-rose-600 dark:text-rose-400';
                    bgClass = 'bg-rose-100 dark:bg-rose-900/40';
                    iconBgClass = 'bg-rose-100 dark:bg-rose-900/40';
                  }

                  return (
                    <Link
                      href={`/transaction/${tx.hash}`}
                      key={tx.id}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--bg-primary)]/80 transition-colors group"
                    >
                      {/* Index with icon */}
                      <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${iconBgClass} ${accentClass} transition-colors`}>
                        {info.type === 'contract' ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                        ) : info.type === 'payment' && info.isSwap ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        ) : info.type === 'payment' ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : !tx.successful ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        )}
                      </div>

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${bgClass} ${accentClass}`}>
                            {typeDisplay}
                          </span>
                          {!tx.successful && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 text-[9px] font-black text-rose-600 uppercase">Failed</span>
                          )}
                          <span className="px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] text-[9px] font-bold text-[var(--text-tertiary)]">
                            {tx.operation_count} ops
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-sky-600 transition-colors">
                            {description}
                          </span>
                          <span className="text-[var(--text-muted)]">→</span>
                          <span className="text-xs font-mono text-[var(--text-tertiary)] truncate">{shortenAddress(tx.source_account, 6)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--text-muted)]">
                          <span className="font-mono">{shortenAddress(tx.hash, 8)}</span>
                          <span className="text-[var(--text-muted)]">•</span>
                          <span>{timeAgo(tx.created_at)}</span>
                        </div>
                      </div>

                      {/* Value / Arrow */}
                      <div className="shrink-0 flex items-center gap-3">
                        {valueDisplay}
                        <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-sky-100 group-hover:text-sky-600 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
              {paginatedTx.length === 0 && (
                <div className="text-center py-12 text-[var(--text-muted)] text-sm">
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
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-sm overflow-hidden">
              <div className="divide-y divide-[var(--border-subtle)]">
                {paginatedOps.map((op, idx) => {
                  let typeDisplay = getOperationTypeLabel(op.type).replace(/_/g, ' ');
                  let summary = '';
                  let summaryLabel = '';
                  let accentClass = 'text-[var(--text-secondary)]';
                  let bgClass = 'bg-[var(--bg-primary)]';
                  let iconBgClass = 'bg-[var(--bg-tertiary)]';

                  if (op.type === 'payment') {
                    const asset = (op as any).asset_code || ((op as any).asset_type === 'native' ? 'XLM' : '');
                    summary = `${formatTokenAmount((op as any).amount, 2)} ${asset}`;
                    summaryLabel = (op as any).to ? `→ ${shortenAddress((op as any).to, 4)}` : '';
                    typeDisplay = 'Payment';
                    accentClass = 'text-emerald-600 dark:text-emerald-400';
                    bgClass = 'bg-emerald-100 dark:bg-emerald-900/40';
                    iconBgClass = 'bg-emerald-100 dark:bg-emerald-900/40';
                  } else if (op.type === 'create_account') {
                    summary = `${formatTokenAmount((op as any).starting_balance, 2)} XLM`;
                    summaryLabel = 'New Account';
                    typeDisplay = 'Create Account';
                    accentClass = 'text-blue-600 dark:text-blue-400';
                    bgClass = 'bg-blue-100 dark:bg-blue-900/40';
                    iconBgClass = 'bg-blue-100 dark:bg-blue-900/40';
                  } else if (op.type === 'invoke_host_function') {
                    typeDisplay = 'Contract';
                    summary = decodeContractFunctionName(op);
                    accentClass = 'text-amber-600 dark:text-amber-400';
                    bgClass = 'bg-amber-100 dark:bg-amber-900/40';
                    iconBgClass = 'bg-amber-100 dark:bg-amber-900/40';
                  } else if (op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive') {
                    typeDisplay = 'Swap';
                    summary = `${formatTokenAmount((op as any).amount, 2)} ${(op as any).asset_code || 'XLM'}`;
                    summaryLabel = 'Received';
                    accentClass = 'text-violet-600 dark:text-violet-400';
                    bgClass = 'bg-violet-100 dark:bg-violet-900/40';
                    iconBgClass = 'bg-violet-100 dark:bg-violet-900/40';
                  } else if (op.type === 'change_trust') {
                    typeDisplay = 'Trustline';
                    accentClass = 'text-indigo-600 dark:text-indigo-400';
                    bgClass = 'bg-indigo-100 dark:bg-indigo-900/40';
                    iconBgClass = 'bg-indigo-100 dark:bg-indigo-900/40';
                  } else if (op.type.includes('offer')) {
                    typeDisplay = 'Offer';
                    accentClass = 'text-cyan-600 dark:text-cyan-400';
                    bgClass = 'bg-cyan-100 dark:bg-cyan-900/40';
                    iconBgClass = 'bg-cyan-100 dark:bg-cyan-900/40';
                  }

                  if (!op.transaction_successful) {
                    accentClass = 'text-rose-600 dark:text-rose-400';
                    bgClass = 'bg-rose-100 dark:bg-rose-900/40';
                    iconBgClass = 'bg-rose-100 dark:bg-rose-900/40';
                  }

                  return (
                    <Link
                      href={`/transaction/${op.transaction_hash}?tab=operations&op=${op.id}`}
                      key={op.id}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--bg-primary)]/80 transition-colors group"
                    >
                      {/* Icon */}
                      <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${iconBgClass} ${accentClass} transition-colors`}>
                        {op.type === 'invoke_host_function' ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                        ) : op.type === 'payment' ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : op.type === 'create_account' ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                          </svg>
                        ) : op.type.includes('path_payment') ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        ) : op.type === 'change_trust' ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        ) : op.type.includes('offer') ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        )}
                      </div>

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${bgClass} ${accentClass}`}>
                            {typeDisplay}
                          </span>
                          {!op.transaction_successful && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 text-[9px] font-black text-rose-600 uppercase">Failed</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {op.source_account && (
                            <>
                              <span className="text-xs text-[var(--text-tertiary)]">from</span>
                              <span className="text-xs font-mono font-medium text-[var(--text-secondary)]">{shortenAddress(op.source_account, 6)}</span>
                            </>
                          )}
                          <span className="text-[var(--text-muted)]">•</span>
                          <span className="text-xs text-[var(--text-muted)]">{timeAgo(op.created_at)}</span>
                        </div>
                      </div>

                      {/* Summary / Function */}
                      <div className="shrink-0 flex items-center gap-3">
                        {(summary || summaryLabel) && (
                          <div className="text-right">
                            <div className="text-sm font-bold text-[var(--text-primary)]">{summary}</div>
                            {summaryLabel && (
                              <div className="text-[9px] font-medium text-[var(--text-muted)] uppercase tracking-wider">{summaryLabel}</div>
                            )}
                          </div>
                        )}
                        <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-sky-100 group-hover:text-sky-600 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
              {paginatedOps.length === 0 && (
                <div className="text-center py-12 text-[var(--text-muted)] text-sm">
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
  );
}
