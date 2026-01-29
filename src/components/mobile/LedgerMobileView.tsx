'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { containers, colors, coreColors, tabs, badges, getPrimaryColor } from '@/lib/design-system';
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

interface LedgerMobileViewProps {
    ledger: Ledger;
    transactions: Transaction[];
    operations: Operation[];
}

const ITEMS_PER_PAGE = 10;

// Loading spinner component
const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-4">
        <svg className="w-6 h-6 animate-spin text-[var(--primary-blue)]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="ml-2 text-sm text-[var(--text-tertiary)]">Loading more...</span>
    </div>
);

// End of list message component
const EndOfList = ({ message }: { message: string }) => (
    <div className="flex items-center justify-center py-4 text-[var(--text-muted)] text-sm">
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        {message}
    </div>
);

// Load more button fallback
const LoadMoreButton = ({ onClick, loading }: { onClick: () => void; loading: boolean }) => (
    <button
        onClick={onClick}
        disabled={loading}
        className="w-full py-3 mt-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] text-sm font-semibold text-[var(--primary-blue)] hover:bg-[var(--bg-tertiary)] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
        {loading ? (
            <span className="flex items-center justify-center">
                <svg className="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
            </span>
        ) : (
            'Load more'
        )}
    </button>
);

export default function LedgerMobileView({ ledger, transactions: initialTransactions, operations: initialOperations }: LedgerMobileViewProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'operations'>('overview');
    const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
    const [operations, setOperations] = useState<Operation[]>(initialOperations);

    // Infinite scroll state
    const [loadingTx, setLoadingTx] = useState(false);
    const [loadingOps, setLoadingOps] = useState(false);
    const [hasMoreTx, setHasMoreTx] = useState(initialTransactions.length >= ITEMS_PER_PAGE);
    const [hasMoreOps, setHasMoreOps] = useState(initialOperations.length >= ITEMS_PER_PAGE);

    // Refs for intersection observer sentinel elements
    const txSentinelRef = useRef<HTMLDivElement>(null);
    const opsSentinelRef = useRef<HTMLDivElement>(null);

    // Fetch more transactions
    const fetchMoreTransactions = useCallback(async () => {
        if (!hasMoreTx || loadingTx || transactions.length === 0) return;

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
    }, [hasMoreTx, loadingTx, transactions, ledger.sequence]);

    // Fetch more operations
    const fetchMoreOperations = useCallback(async () => {
        if (!hasMoreOps || loadingOps || operations.length === 0) return;

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
    }, [hasMoreOps, loadingOps, operations, ledger.sequence]);

    // Intersection Observer for transactions
    useEffect(() => {
        if (activeTab !== 'transactions') return;

        const sentinel = txSentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting && hasMoreTx && !loadingTx) {
                    fetchMoreTransactions();
                }
            },
            {
                root: null,
                rootMargin: '100px', // Trigger 100px before reaching the sentinel
                threshold: 0.1,
            }
        );

        observer.observe(sentinel);

        return () => {
            observer.disconnect();
        };
    }, [activeTab, hasMoreTx, loadingTx, fetchMoreTransactions]);

    // Intersection Observer for operations
    useEffect(() => {
        if (activeTab !== 'operations') return;

        const sentinel = opsSentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting && hasMoreOps && !loadingOps) {
                    fetchMoreOperations();
                }
            },
            {
                root: null,
                rootMargin: '100px',
                threshold: 0.1,
            }
        );

        observer.observe(sentinel);

        return () => {
            observer.disconnect();
        };
    }, [activeTab, hasMoreOps, loadingOps, fetchMoreOperations]);

    return (
        <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen flex flex-col font-sans pb-24">
            {/* Main Content Area */}
            <main className="flex-1 px-3 pt-2 pb-8 max-w-lg mx-auto w-full">

                {/* Header / Back Link */}
                <div className="flex items-center justify-between mb-4 mt-1">
                    <Link
                        href="/ledgers"
                        className="flex items-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors text-xs font-semibold uppercase tracking-wide"
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </Link>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--primary-blue)] text-white">
                            Protocol v{ledger.protocol_version}
                        </div>
                        <div className="flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20">
                            {ledger.successful_transaction_count} Tx
                        </div>
                    </div>
                </div>

                {/* Ledger Main Card */}
                <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-3 mb-2 relative overflow-hidden">
                    <div className="relative z-10 flex flex-col gap-3">
                        <div className="flex items-start justify-between relative z-20">
                            <div>
                                <div className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-widest">Ledger Sequence</div>
                                <div className="flex items-center gap-2 mt-1">
                                    <Link
                                        href={`/ledger/${ledger.sequence - 1}`}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--primary-blue)] hover:border-[var(--primary-blue)]/30 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </Link>
                                    <span className="text-2xl font-bold" style={{ color: 'var(--primary-blue)' }}>#{ledger.sequence.toLocaleString()}</span>
                                    <Link
                                        href={`/ledger/${ledger.sequence + 1}`}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--primary-blue)] hover:border-[var(--primary-blue)]/30 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </Link>
                                </div>
                                <div className="flex items-center gap-2 mt-1.5 text-xs text-[var(--text-tertiary)] font-mono">
                                    <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {formatDate(ledger.closed_at)} ({timeAgo(ledger.closed_at)})
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-1.5 bg-[var(--success)]/10 backdrop-blur-sm border border-[var(--success)]/20 px-2 py-1 rounded-lg">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)]"></div>
                                    <div className="flex flex-col leading-none">
                                        <span className="text-[11px] font-bold text-[var(--success)]">{ledger.successful_transaction_count}</span>
                                        <span className="text-[8px] font-bold uppercase text-[var(--success)]/60">Success</span>
                                    </div>
                                </div>
                                {ledger.failed_transaction_count > 0 && (
                                    <div className="flex items-center gap-1.5 bg-[var(--error)]/10 backdrop-blur-sm border border-[var(--error)]/20 px-2 py-1 rounded-lg">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--error)]"></div>
                                        <div className="flex flex-col leading-none">
                                            <span className="text-[11px] font-bold text-[var(--error)]">{ledger.failed_transaction_count}</span>
                                            <span className="text-[8px] font-bold uppercase text-[var(--error)]/60">Failed</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl p-2 text-center">
                                <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Ops</div>
                                <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{ledger.operation_count}</div>
                            </div>
                            <div className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl p-2 text-center">
                                <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Base Fee</div>
                                <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{ledger.base_fee_in_stroops / 10000000} <span className="text-[10px] font-normal text-[var(--text-tertiary)]">XLM</span></div>
                            </div>
                            <div className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl p-2 text-center">
                                <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Reserve</div>
                                <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{ledger.base_reserve_in_stroops / 10000000} <span className="text-[10px] font-normal text-[var(--text-tertiary)]">XLM</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs - Glider Style */}
                {(() => {
                  const tabs = [
                    { id: 'overview', label: 'Overview' },
                    { id: 'transactions', label: 'Transactions' },
                    { id: 'operations', label: 'Operations' },
                  ];
                  const activeTabIndex = tabs.findIndex(tab => tab.id === activeTab);
                  const tabCount = tabs.length;

                  return (
                    <div className="relative flex items-center bg-[var(--bg-secondary)] p-1 rounded-xl shadow-sm border border-[var(--border-subtle)] mb-2">
                      {/* Glider Background */}
                      <div
                        className="absolute top-1 bottom-1 bg-[var(--primary-blue)]/10 rounded-lg transition-all duration-300 ease-out z-0"
                        style={{
                          left: '4px',
                          width: `calc((100% - 8px) / ${tabCount})`,
                          transform: `translateX(${activeTabIndex >= 0 ? activeTabIndex * 100 : 0}%)`,
                          opacity: activeTabIndex >= 0 ? 1 : 0
                        }}
                      />

                      {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`relative z-10 flex-1 py-1.5 text-[11px] rounded-lg transition-colors duration-200 text-center ${
                              isActive
                                ? 'text-[var(--primary-blue)] font-bold'
                                : 'text-[var(--text-secondary)] font-semibold hover:text-[var(--text-primary)]'
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Tab Content */}
                <div className="min-h-[200px]">
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="space-y-2">
                            <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-3">
                                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Ledger Details</h2>
                                <div className="space-y-3">
                                    <div className="flex flex-col gap-1 border-b border-[var(--border-subtle)] pb-2.5">
                                        <span className="text-[11px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide">Hash</span>
                                        <span className="text-xs font-mono text-[var(--text-secondary)] break-all bg-[var(--bg-tertiary)] p-2 rounded-lg border border-[var(--border-subtle)]">{ledger.hash}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-2.5">
                                        <span className="text-[11px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide">Max Tx Set Size</span>
                                        <span className="text-xs font-bold text-[var(--text-primary)]">{ledger.max_tx_set_size}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-2.5">
                                        <span className="text-[11px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide">Total Coins</span>
                                        <span className="text-xs font-bold text-[var(--text-primary)]">{formatXLM(ledger.total_coins)} XLM</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-[11px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide">Fee Pool</span>
                                        <span className="text-xs font-bold text-[var(--text-primary)]">{formatXLM(ledger.fee_pool)} XLM</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}

                    {/* TRANSACTIONS TAB */}
                    {activeTab === 'transactions' && (
                        <div className="space-y-3">
                            {transactions.map((tx) => {
                                const info = tx.displayInfo || { type: 'other' };
                                let description = 'Transaction';
                                let typeDisplay = 'TRANSACTION';
                                let valueDisplay = null;
                                let typeColorClass = 'text-[var(--primary-blue)]';
                                let iconBgClass = 'bg-[var(--primary-blue)]/10 text-[var(--primary-blue)]';

                                if (info.type === 'contract') {
                                    description = info.functionName || 'Smart Contract Call';
                                    typeDisplay = 'SMART CONTRACT';
                                    typeColorClass = 'text-[var(--warning)]';
                                    iconBgClass = 'bg-[var(--warning)]/10 text-[var(--warning)]';
                                } else if (info.type === 'payment') {
                                    typeDisplay = info.isSwap ? 'SWAP' : 'PAYMENT';
                                    description = info.isSwap ? 'Swap Tokens' : 'Payment';
                                    typeColorClass = info.isSwap ? 'text-[var(--primary-blue)]' : 'text-[var(--success)]';
                                    iconBgClass = info.isSwap ? 'bg-[var(--primary-blue)]/10 text-[var(--primary-blue)]' : 'bg-[var(--success)]/10 text-[var(--success)]';

                                    if (info.amount) {
                                        valueDisplay = (
                                            <span className="font-bold text-[var(--text-primary)] text-sm">
                                                {info.amount} <span className="text-[11px] font-bold text-[var(--text-muted)]">{info.asset}</span>
                                            </span>
                                        );
                                    }
                                } else if (info.type === 'manage_offer') {
                                    description = 'Manage Offer';
                                    typeDisplay = 'OFFER';
                                    typeColorClass = 'text-[var(--warning)]';
                                    iconBgClass = 'bg-[var(--warning)]/10 text-[var(--warning)]';
                                } else if (info.type === 'multi_send' || info.type === 'bulk_send') {
                                    description = info.type === 'bulk_send' ? 'Bulk Send' : 'Multi Send';
                                    typeDisplay = 'MULTI SEND';
                                    typeColorClass = 'text-[var(--primary-blue)]';
                                    iconBgClass = 'bg-[var(--primary-blue)]/10 text-[var(--primary-blue)]';
                                    valueDisplay = <span className="font-bold text-[var(--text-primary)] text-sm">{info.elementCount} Recipients</span>;
                                }

                                if (!tx.successful) {
                                    typeColorClass = 'text-[var(--error)]';
                                    iconBgClass = 'bg-[var(--error)]/10 text-[var(--error)]';
                                }

                                return (
                                    <Link
                                        href={`/transaction/${tx.hash}`}
                                        key={tx.id}
                                        className="block bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-3 mb-2.5 active:scale-[0.99] transition-transform hover:shadow-md"
                                    >
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className={`text-[11px] font-bold uppercase tracking-widest pl-1 ${typeColorClass}`}>
                                                {typeDisplay}
                                                {!tx.successful && <span className="ml-1 text-[var(--error)] font-extrabold">(FAILED)</span>}
                                            </span>
                                            <span className="text-[11px] font-medium text-[var(--text-muted)]">
                                                {timeAgo(tx.created_at)}
                                            </span>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${iconBgClass}`}>
                                                {info.type === 'payment' && info.isSwap ? (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                                ) : info.type === 'contract' ? (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                ) : !tx.successful ? (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <div className="font-bold text-[var(--text-primary)] text-sm leading-tight">{description}</div>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <div className="bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded-[0.4rem] border border-[var(--border-subtle)] flex items-center">
                                                                <span className="text-[10px] font-mono font-bold text-[var(--text-tertiary)]">
                                                                    #{shortenAddress(tx.hash, 4)}
                                                                </span>
                                                            </div>
                                                            <span className="text-[11px] font-medium text-[var(--text-muted)] truncate max-w-[100px]">
                                                                From <span className="font-mono">{shortenAddress(tx.source_account, 4)}</span>
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="text-right pl-2">
                                                        {valueDisplay}
                                                        <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase mt-0.5">{tx.operation_count} Ops</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                            {transactions.length === 0 && (
                                <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                                    No transactions found in this ledger.
                                </div>
                            )}

                            {/* Sentinel element for infinite scroll */}
                            <div ref={txSentinelRef} className="h-1" />

                            {/* Loading spinner */}
                            {loadingTx && <LoadingSpinner />}

                            {/* Load more button fallback */}
                            {hasMoreTx && !loadingTx && transactions.length > 0 && (
                                <LoadMoreButton onClick={fetchMoreTransactions} loading={loadingTx} />
                            )}

                            {/* End of list message */}
                            {!hasMoreTx && transactions.length > 0 && (
                                <EndOfList message="No more transactions" />
                            )}
                        </div>
                    )}

                    {/* OPERATIONS TAB */}
                    {activeTab === 'operations' && (
                        <div className="space-y-3">
                            {operations.map((op, idx) => {
                                let typeDisplay = getOperationTypeLabel(op.type).replace(/_/g, ' ');
                                let summary = '';
                                let summaryLabel = '';

                                if (op.type === 'payment') {
                                    const amount = (op as any).amount ? formatStroopsToXLM(parseFloat((op as any).amount) * 10000000) : '0'; // Assuming native amount comes in as XLM string, so * 1e7 then format back? Or just parsed float. formatStroopsToXLM divides by 1e7. Wait, op.amount in generic op is usually string.
                                    // Actually simpler:
                                    const rawAmt = (op as any).amount || '0';
                                    const asset = (op as any).asset_code || ((op as any).asset_type === 'native' ? 'XLM' : '');
                                    summary = `${rawAmt} ${asset}`;
                                    summaryLabel = (op as any).to ? `To ${shortenAddress((op as any).to, 4)}` : '';
                                } else if (op.type === 'create_account') {
                                    summary = `${(op as any).starting_balance} XLM`;
                                    summaryLabel = `New Account`;
                                } else if (op.type === 'invoke_host_function') {
                                    let functionName = 'Contract Call';
                                    try {
                                        const parameters = (op as any).parameters;
                                        if (parameters && Array.isArray(parameters)) {
                                            const symParam = parameters.find((p: any) => p.type === 'Sym');
                                            if (symParam && symParam.value) {
                                                const decoded = atob(symParam.value);
                                                const name = decoded.slice(5).replace(/\0/g, '');
                                                if (name) functionName = name;
                                            }
                                        }
                                    } catch (e) {
                                        // fallback
                                    }
                                    typeDisplay = 'SMART CONTRACT';
                                    summary = functionName;
                                } else if (op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive') {
                                    typeDisplay = 'SWAP';
                                    summary = `${(op as any).amount || '0'} ${(op as any).asset_code || 'XLM'}`;
                                    summaryLabel = 'Received';
                                }

                                return (
                                    <Link
                                        href={`/transaction/${op.transaction_hash}?tab=operations&op=${op.id}`}
                                        key={op.id}
                                        className="block bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-0 overflow-hidden hover:shadow-md transition-shadow mb-2"
                                    >
                                        <div className="flex items-center p-3 gap-3">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-xs font-bold text-[var(--text-tertiary)] border border-[var(--border-subtle)]">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0 grid grid-cols-[auto_1fr] gap-x-2 items-center">
                                                <span className="text-xs font-bold text-[var(--text-primary)] capitalize truncate">
                                                    {typeDisplay}
                                                </span>
                                                <div className="flex items-center text-[11px] text-[var(--text-tertiary)] font-mono truncate">
                                                    {op.source_account && (
                                                        <span className="truncate max-w-[80px] hover:text-[var(--text-primary)] transition-colors">
                                                            {shortenAddress(op.source_account, 4)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {(summary || summaryLabel) && (
                                                <div className="text-right flex flex-col justify-center">
                                                    <span className="text-xs font-bold text-[var(--text-primary)]">{summary}</span>
                                                    <span className="text-[10px] font-medium text-[var(--text-muted)]">{summaryLabel}</span>
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                            {operations.length === 0 && (
                                <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                                    No operations found in this ledger.
                                </div>
                            )}

                            {/* Sentinel element for infinite scroll */}
                            <div ref={opsSentinelRef} className="h-1" />

                            {/* Loading spinner */}
                            {loadingOps && <LoadingSpinner />}

                            {/* Load more button fallback */}
                            {hasMoreOps && !loadingOps && operations.length > 0 && (
                                <LoadMoreButton onClick={fetchMoreOperations} loading={loadingOps} />
                            )}

                            {/* End of list message */}
                            {!hasMoreOps && operations.length > 0 && (
                                <EndOfList message="No more operations" />
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
