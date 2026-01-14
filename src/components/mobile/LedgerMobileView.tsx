'use client';

import { useState } from 'react';
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

interface LedgerMobileViewProps {
    ledger: Ledger;
    transactions: Transaction[];
    operations: Operation[];
}

export default function LedgerMobileView({ ledger, transactions: initialTransactions, operations: initialOperations }: LedgerMobileViewProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'operations'>('overview');
    const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
    const [operations, setOperations] = useState<Operation[]>(initialOperations);
    const [loadingMoreTx, setLoadingMoreTx] = useState(false);
    const [loadingMoreOps, setLoadingMoreOps] = useState(false);

    const loadMoreTransactions = async () => {
        if (loadingMoreTx || transactions.length === 0) return;
        setLoadingMoreTx(true);
        const lastCursor = transactions[transactions.length - 1].paging_token;
        try {
            const nextBatch = await getLedgerTransactionsWithDisplayInfo(ledger.sequence, 10, 'desc', lastCursor);
            if (nextBatch.length > 0) {
                setTransactions(prev => [...prev, ...nextBatch]);
            }
        } catch (e) {
            console.error('Failed to load more transactions', e);
        } finally {
            setLoadingMoreTx(false);
        }
    };

    const loadMoreOperations = async () => {
        if (loadingMoreOps || operations.length === 0) return;
        setLoadingMoreOps(true);
        const lastCursor = operations[operations.length - 1].paging_token;
        try {
            const response = await getLedgerOperations(ledger.sequence, 10, 'desc', lastCursor);
            const nextBatch = response._embedded.records;
            if (nextBatch.length > 0) {
                setOperations(prev => [...prev, ...nextBatch]);
            }
        } catch (e) {
            console.error('Failed to load more operations', e);
        } finally {
            setLoadingMoreOps(false);
        }
    };

    return (
        <div className="bg-[#F8FAFC] text-slate-800 min-h-screen flex flex-col font-sans pb-24">
            {/* Main Content Area */}
            <main className="flex-1 px-4 pt-2 pb-8 max-w-lg mx-auto w-full">

                {/* Header / Back Link */}
                <div className="flex items-center justify-between mb-4 mt-1">
                    <Link
                        href="/ledgers"
                        className="flex items-center text-slate-400 hover:text-slate-700 transition-colors text-xs font-semibold uppercase tracking-wide"
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </Link>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Protocol v{ledger.protocol_version}
                        </div>
                        <div className="flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {ledger.successful_transaction_count} Tx
                        </div>
                    </div>
                </div>

                {/* Ledger Main Card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-5 relative overflow-hidden">
                    <div className="relative z-10 flex flex-col gap-4">
                        <div className="flex items-start justify-between relative z-20">
                            <div>
                                <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest">Ledger Sequence</div>
                                <div className="text-2xl font-bold text-slate-900 mt-1">#{ledger.sequence.toLocaleString()}</div>
                                <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 font-mono">
                                    <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {formatDate(ledger.closed_at)} ({timeAgo(ledger.closed_at)})
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-1.5 bg-emerald-50/80 backdrop-blur-sm border border-emerald-100 px-2 py-1 rounded-lg">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    <div className="flex flex-col leading-none">
                                        <span className="text-[10px] font-bold text-emerald-700">{ledger.successful_transaction_count}</span>
                                        <span className="text-[7px] font-bold uppercase text-emerald-600/60">Success</span>
                                    </div>
                                </div>
                                {ledger.failed_transaction_count > 0 && (
                                    <div className="flex items-center gap-1.5 bg-red-50/80 backdrop-blur-sm border border-red-100 px-2 py-1 rounded-lg">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                        <div className="flex flex-col leading-none">
                                            <span className="text-[10px] font-bold text-red-700">{ledger.failed_transaction_count}</span>
                                            <span className="text-[7px] font-bold uppercase text-red-600/60">Failed</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-2">
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Ops</div>
                                <div className="text-sm font-bold text-slate-900 mt-0.5">{ledger.operation_count}</div>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Base Fee</div>
                                <div className="text-sm font-bold text-slate-900 mt-0.5">{ledger.base_fee_in_stroops / 10000000} <span className="text-[9px] font-normal text-slate-500">XLM</span></div>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Reserve</div>
                                <div className="text-sm font-bold text-slate-900 mt-0.5">{ledger.base_reserve_in_stroops / 10000000} <span className="text-[9px] font-normal text-slate-500">XLM</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="border-b border-slate-200 mb-4">
                    <nav aria-label="Tabs" className="-mb-px flex space-x-6 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'overview', label: 'Overview' },
                            { id: 'transactions', label: 'Transactions', count: ledger.successful_transaction_count + ledger.failed_transaction_count },
                            { id: 'operations', label: 'Operations', count: ledger.operation_count }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`py-2 px-1 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-slate-900 text-slate-900 font-semibold'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                    }`}
                            >
                                {tab.label}
                                {tab.count !== undefined && (
                                    <span className={`ml-1 py-0.5 px-1.5 rounded-full text-[10px] ${activeTab === tab.id
                                        ? 'bg-slate-100 text-slate-600'
                                        : 'bg-slate-100 text-slate-500'
                                        }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="min-h-[200px]">
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="space-y-4">
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Ledger Details</h2>
                                <div className="space-y-3">
                                    <div className="flex flex-col gap-1 border-b border-slate-100 pb-2.5">
                                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Hash</span>
                                        <span className="text-xs font-mono text-slate-700 break-all bg-slate-50 p-2 rounded-lg border border-slate-100">{ledger.hash}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2.5">
                                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Max Tx Set Size</span>
                                        <span className="text-xs font-bold text-slate-900">{ledger.max_tx_set_size}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2.5">
                                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Total Coins</span>
                                        <span className="text-xs font-bold text-slate-900">{formatXLM(ledger.total_coins)} XLM</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Fee Pool</span>
                                        <span className="text-xs font-bold text-slate-900">{formatXLM(ledger.fee_pool)} XLM</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex flex-col gap-2.5">
                                <Link
                                    href={`/ledger/${ledger.sequence - 1}`}
                                    className="flex items-center justify-between px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all group"
                                >
                                    <span className="flex items-center gap-2 text-xs font-medium">
                                        <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                        Previous Ledger
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400 group-hover:text-indigo-500">#{(ledger.sequence - 1).toLocaleString()}</span>
                                </Link>
                                <Link
                                    href={`/ledger/${ledger.sequence + 1}`}
                                    className="flex items-center justify-between px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all group"
                                >
                                    <span className="flex items-center gap-2 text-xs font-medium">
                                        Next Ledger
                                        <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400 group-hover:text-indigo-500">#{(ledger.sequence + 1).toLocaleString()}</span>
                                </Link>
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
                                let typeColorClass = 'text-blue-500';
                                let iconBgClass = 'bg-blue-50 text-blue-500';

                                if (info.type === 'contract') {
                                    description = info.functionName || 'Smart Contract Call';
                                    typeDisplay = 'SMART CONTRACT';
                                    typeColorClass = 'text-purple-500';
                                    iconBgClass = 'bg-purple-50 text-purple-500';
                                } else if (info.type === 'payment') {
                                    typeDisplay = info.isSwap ? 'SWAP' : 'PAYMENT';
                                    description = info.isSwap ? 'Swap Tokens' : 'Payment';
                                    typeColorClass = info.isSwap ? 'text-indigo-500' : 'text-emerald-500';
                                    iconBgClass = info.isSwap ? 'bg-indigo-50 text-indigo-500' : 'bg-emerald-50 text-emerald-500';

                                    if (info.amount) {
                                        valueDisplay = (
                                            <span className="font-bold text-slate-900 text-sm">
                                                {info.amount} <span className="text-[10px] font-bold text-slate-400">{info.asset}</span>
                                            </span>
                                        );
                                    }
                                } else if (info.type === 'manage_offer') {
                                    description = 'Manage Offer';
                                    typeDisplay = 'OFFER';
                                    typeColorClass = 'text-orange-500';
                                    iconBgClass = 'bg-orange-50 text-orange-500';
                                } else if (info.type === 'multi_send' || info.type === 'bulk_send') {
                                    description = info.type === 'bulk_send' ? 'Bulk Send' : 'Multi Send';
                                    typeDisplay = 'MULTI SEND';
                                    typeColorClass = 'text-cyan-500';
                                    iconBgClass = 'bg-cyan-50 text-cyan-500';
                                    valueDisplay = <span className="font-bold text-slate-900 text-sm">{info.elementCount} Recipients</span>;
                                }

                                if (!tx.successful) {
                                    typeColorClass = 'text-red-500';
                                    iconBgClass = 'bg-red-50 text-red-500';
                                }

                                return (
                                    <Link
                                        href={`/transaction/${tx.hash}`}
                                        key={tx.id}
                                        className="block bg-white rounded-2xl p-3 shadow-sm border border-slate-100 mb-2.5 active:scale-[0.99] transition-transform hover:shadow-md"
                                    >
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className={`text-[10px] font-bold uppercase tracking-widest pl-1 ${typeColorClass}`}>
                                                {typeDisplay}
                                                {!tx.successful && <span className="ml-1 text-red-500 font-extrabold">(FAILED)</span>}
                                            </span>
                                            <span className="text-[10px] font-medium text-slate-400">
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
                                                        <div className="font-bold text-slate-900 text-sm leading-tight">{description}</div>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <div className="bg-slate-50 px-1.5 py-0.5 rounded-[0.4rem] border border-slate-100 flex items-center">
                                                                <span className="text-[9px] font-mono font-bold text-slate-500">
                                                                    #{shortenAddress(tx.hash, 4)}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] font-medium text-slate-400 truncate max-w-[100px]">
                                                                From <span className="font-mono">{shortenAddress(tx.source_account, 4)}</span>
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="text-right pl-2">
                                                        {valueDisplay}
                                                        <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{tx.operation_count} Ops</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                            {transactions.length === 0 && (
                                <div className="text-center py-8 text-slate-400 text-sm">
                                    No transactions found in this ledger.
                                </div>
                            )}

                            {transactions.length >= 10 && (
                                <button
                                    onClick={loadMoreTransactions}
                                    disabled={loadingMoreTx}
                                    className="w-full py-3 mt-4 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50"
                                >
                                    {loadingMoreTx ? 'Loading...' : 'Load More Transactions'}
                                </button>
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
                                        className="block bg-white rounded-2xl p-0 overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-slate-100 mb-2"
                                    >
                                        <div className="flex items-center p-3 gap-3">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-200">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0 grid grid-cols-[auto_1fr] gap-x-2 items-center">
                                                <span className="text-xs font-bold text-slate-900 capitalize truncate">
                                                    {typeDisplay}
                                                </span>
                                                <div className="flex items-center text-[10px] text-slate-500 font-mono truncate">
                                                    {op.source_account && (
                                                        <span className="truncate max-w-[80px] hover:text-slate-900 transition-colors">
                                                            {shortenAddress(op.source_account, 4)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {(summary || summaryLabel) && (
                                                <div className="text-right flex flex-col justify-center">
                                                    <span className="text-xs font-bold text-slate-900">{summary}</span>
                                                    <span className="text-[9px] font-medium text-slate-400">{summaryLabel}</span>
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                            {operations.length === 0 && (
                                <div className="text-center py-8 text-slate-400 text-sm">
                                    No operations found in this ledger.
                                </div>
                            )}

                            {operations.length >= 10 && (
                                <button
                                    onClick={loadMoreOperations}
                                    disabled={loadingMoreOps}
                                    className="w-full py-3 mt-4 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50"
                                >
                                    {loadingMoreOps ? 'Loading...' : 'Load More Operations'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
