'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { Ledger, NetworkStats, Transaction, formatXLM, shortenAddress, timeAgo, Operation } from '@/lib/stellar';
import InfoTooltip from '../InfoTooltip';

interface DesktopHomePageProps {
    stats: NetworkStats;
    initialTransactions: Transaction[];
    initialLedgers: Ledger[];
    initialOperations: Operation[];
    xlmVolume: number;
    xlmPrice: number;
}

export default function DesktopHomePage({
    stats,
    initialTransactions,
    initialLedgers,
    initialOperations,
    xlmVolume,
    xlmPrice
}: DesktopHomePageProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [liveStats, setLiveStats] = useState(stats);
    const [operations, setOperations] = useState<Operation[]>(initialOperations);
    const [activeTab, setActiveTab] = useState('All Activity');
    const ledgerCountRef = useRef<HTMLSpanElement>(null);
    const tpsRef = useRef<HTMLSpanElement>(null);

    // Helper to format token amounts
    const formatTokenAmount = (amount: string | number) => {
        const value = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (value === 0) return '0';
        if (value < 0.001) return '< 0.001';
        return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
    };

    // Filter operations based on active tab
    const filteredOperations = operations.filter(op => {
        if (activeTab === 'All Activity') return true;

        const type = op.type;
        if (activeTab === 'Swaps') {
            return type.includes('swap') || type.includes('offer') || type.includes('path_payment');
        }
        if (activeTab === 'Smart Contracts') {
            return type === 'invoke_host_function' || type === 'bump_sequence' || type === 'restore_footprint';
        }
        if (activeTab === 'Payments') {
            return type === 'payment' || type === 'create_account' || type === 'account_merge';
        }
        return true;
    });

    // Poll for latest stats AND operations based on active tab
    useEffect(() => {
        const getUrl = () => {
            // For "Payments" tab, specifically fetch payment operations to ensure density
            if (activeTab === 'Payments') return 'https://horizon.stellar.org/payments';
            return 'https://horizon.stellar.org/operations';
        };

        const fetchStats = async () => {
            try {
                const ledgersRes = await fetch('https://horizon.stellar.org/ledgers?limit=1&order=desc');
                const ledgersData = await ledgersRes.json();
                const latest: Ledger = ledgersData._embedded.records[0];

                if (latest.sequence > liveStats.ledger_count) {
                    setLiveStats(prev => ({
                        ...prev,
                        ledger_count: latest.sequence,
                        latest_ledger: latest,
                    }));

                    // Visual animations for stats
                    if (ledgerCountRef.current) gsap.fromTo(ledgerCountRef.current, { scale: 1.1 }, { scale: 1, duration: 0.5, ease: 'power2.out' });
                    if (tpsRef.current) gsap.fromTo(tpsRef.current, { scale: 1.1 }, { scale: 1, duration: 0.5, ease: 'power2.out' });
                }
            } catch (e) {
                console.error('Failed to fetch stats', e);
            }
        };

        const fetchInitialData = async () => {
            try {
                const url = `${getUrl()}?limit=50&order=desc&include_failed=false`;
                const res = await fetch(url);
                const data = await res.json();
                if (data._embedded && data._embedded.records) {
                    setOperations(data._embedded.records);
                }
            } catch (e) {
                console.error('Failed to fetch initial tab data', e);
            }
        };

        const pollData = async () => {
            await fetchStats();

            try {
                const url = `${getUrl()}?limit=10&order=desc&include_failed=false`;
                const res = await fetch(url);
                const data = await res.json();
                const newOps: Operation[] = data._embedded.records;

                setOperations(prevOps => {
                    const existingIds = new Set(prevOps.map(op => op.id));
                    const uniqueNewOps = newOps.filter(op => !existingIds.has(op.id));

                    if (uniqueNewOps.length > 0) {
                        return [...uniqueNewOps, ...prevOps].slice(0, 500);
                    }
                    return prevOps;
                });
            } catch (e) {
                console.error('Failed to poll data', e);
            }
        };

        // If we are just mounting and tab is "All Activity", we might use initialOperations, 
        // but activeTab change triggers this everywhere. 
        // To avoid double fetch on mount, we could check if activeTab is default, 
        // but fetching fresh 50 is safer to sync "Payments" tab immediately.
        if (activeTab === 'Payments' || activeTab !== 'All Activity') {
            fetchInitialData();
        } else if (activeTab === 'All Activity' && operations !== initialOperations) {
            // If returning to All Activity, RE-fetch to get 'operations' mix back
            fetchInitialData();
        }

        // Poll every 3 seconds
        const interval = setInterval(pollData, 3000);
        return () => clearInterval(interval);
    }, [activeTab]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const query = searchQuery.trim();
        if (!query) return;

        if (query.length === 56 && query.startsWith('G')) {
            window.location.href = `/account/${query}`;
        } else if (query.length === 64) {
            window.location.href = `/transaction/${query}`;
        } else if (/^\d+$/.test(query)) {
            window.location.href = `/ledger/${query}`;
        } else {
            window.location.href = `/account/${query}`;
        }
    };

    const formattedVolume = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 1
    }).format(xlmVolume);

    const txCount = liveStats.latest_ledger.successful_transaction_count + liveStats.latest_ledger.failed_transaction_count;
    const tps = (txCount / 5).toFixed(2);
    const marketCap = parseFloat(liveStats.total_coins) * xlmPrice;

    // Helper to determine operation style
    // Helper to determine operation style
    const getOpStyle = (typePath: string) => {
        const type = String(typePath); // Ensure string
        if (type === 'payment' || type === 'create_account') return { color: 'text-orange-500', bg: 'bg-orange-500', label: 'PAYMENT' };
        if (type.includes('offer') || type.includes('swap') || type === 'path_payment_strict_send' || type === 'path_payment_strict_receive') return { color: 'text-blue-500', bg: 'bg-blue-500', label: 'SWAP' };
        if (type === 'invoke_host_function' || type.toLowerCase().includes('invokecontract') || type.toLowerCase().includes('hostfunction')) return { color: 'text-purple-500', bg: 'bg-purple-500', label: 'CONTRACT CALL' };
        if (type === 'change_trust') return { color: 'text-emerald-500', bg: 'bg-emerald-500', label: 'TRUSTLINE' };
        return { color: 'text-gray-900', bg: 'bg-gray-400', label: type.replace(/_/g, ' ').toUpperCase() };
    };

    const decodeContractFunctionName = (op: Operation): string => {
        try {
            // Do NOT trust (op as any).function as it may contain raw XDR type strings

            const parameters = (op as any).parameters as Array<{ type: string; value: string }> | undefined;
            if (!parameters) return 'Contract Call';

            const symParam = parameters.find(p => p.type === 'Sym');
            if (!symParam) return 'Contract Call';

            const decoded = atob(symParam.value);
            const functionName = decoded.slice(5).replace(/\0/g, '');

            // Fallback if the decoding produced something weird or empty
            if (!functionName || functionName.includes('HostFunctionType')) return 'Contract Call';

            return functionName;
        } catch {
            return 'Contract Call';
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#f3f4f6]">

            {/* Dark Header */}
            <header className="bg-[#111827] pt-4 pb-12 shadow-lg flex-shrink-0">
                <div className="max-w-[1600px] mx-auto px-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="hidden sm:flex items-center gap-2 bg-[#1f2937] px-3 py-1.5 rounded-md border border-gray-700 text-[11px]">
                                <div className="flex items-center gap-2 border-r border-gray-700 pr-3">
                                    <span className="text-gray-400 font-medium uppercase">XLM</span>
                                    <span className="text-white font-mono">${xlmPrice.toFixed(4)}</span>
                                    <span className="text-green-400 font-mono">+2.51%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-400 font-medium">NETWORK FEE</span>
                                    <span className="text-white font-mono">{(liveStats.base_fee / 10000000).toFixed(6)}</span>
                                    <span className="text-gray-500 font-mono">XLM</span>
                                </div>
                            </div>
                        </div>
                        <div className="relative w-full max-w-md">
                            <form onSubmit={handleSearch}>
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </span>
                                <input
                                    placeholder="Search address, hash, contract..."
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#1f2937] border border-gray-700 text-gray-100 text-sm rounded-lg focus:ring-1 focus:ring-[#06b6d4] focus:bg-[#374151] block pl-10 p-2 placeholder-gray-500 transition-all outline-none"
                                />
                            </form>
                        </div>
                    </div>
                </div>
            </header>

            {/* Stats Band */}
            <div className="max-w-[1600px] mx-auto w-full px-6 -mt-8 mb-4 z-10 flex-shrink-0">
                <div className="bg-white rounded-lg shadow-xl border border-gray-100 flex flex-wrap items-center divide-x divide-gray-100 overflow-hidden">
                    <div className="flex-1 min-w-[150px] p-4 flex flex-col">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total TVL</span>
                        <span className="text-sm font-bold text-gray-900 font-mono">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(marketCap)}
                        </span>
                    </div>
                    <div className="flex-1 min-w-[150px] p-4 flex flex-col">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Global Vol (24H)</span>
                        <span className="text-sm font-bold text-gray-900 font-mono">{formattedVolume}</span>
                    </div>
                    <div className="flex-1 min-w-[150px] p-4 flex flex-col">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Current TPS</span>
                        <span ref={tpsRef} className="text-sm font-bold text-green-500 font-mono">{tps} / s</span>
                    </div>
                    <div className="flex-1 min-w-[150px] p-4 flex flex-col">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Latest Ledger</span>
                        <span ref={ledgerCountRef} className="text-sm font-bold text-[#06b6d4] font-mono">#{liveStats.ledger_count.toLocaleString()}</span>
                    </div>
                    <div className="flex-1 min-w-[150px] p-4 flex flex-col bg-gray-50">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Smart Ops / H</span>
                        <span className="text-sm font-bold text-gray-900 font-mono">8,412 CALLS</span>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="max-w-[1600px] mx-auto w-full px-6 flex-1 flex gap-6 min-h-0 mb-6">

                {/* Unified Activity Stream (Left) */}
                <div className="flex-[3] flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="flex flex-col flex-shrink-0">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4]"></span>
                                Unified Activity Stream
                            </h3>
                            <div className="flex items-center gap-4">
                                <button className="text-gray-400 hover:text-[#06b6d4]">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="px-4 py-2 bg-white border-b border-gray-100 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                            {['All Activity', 'Swaps', 'Smart Contracts', 'Payments'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter whitespace-nowrap transition-colors ${activeTab === tab
                                        ? 'bg-[#06b6d4] text-white'
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white text-[10px] text-gray-400 uppercase font-bold tracking-wider z-20 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 border-b border-gray-100">Time</th>
                                    <th className="px-4 py-3 border-b border-gray-100">Operation Type</th>
                                    <th className="px-4 py-3 border-b border-gray-100">Detail / Amount</th>
                                    <th className="px-4 py-3 border-b border-gray-100">Address / Hash</th>
                                </tr>
                            </thead>
                            <tbody className="text-[12px] font-mono divide-y divide-gray-50">
                                {filteredOperations.map((op) => {
                                    const style = getOpStyle(op.type);

                                    return (
                                        <tr key={op.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                                                {new Date(op.created_at).toLocaleTimeString([], { hour12: false })}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${style.bg}`}></span>
                                                    <span className="font-bold text-gray-900">
                                                        {style.label}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {/* Simplified Content Logic */}
                                                {(op.type === 'payment' || op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive') ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className={`${style.color} font-bold`}>
                                                            {op.amount ? formatTokenAmount(op.amount) : '---'}
                                                        </span>
                                                        <span className="text-gray-500">{op.asset_code || 'XLM'}</span>
                                                        <span className="text-gray-400 mx-1">→</span>
                                                        <span className="text-gray-500">{shortenAddress(op.to || (op as any).into || op.source_account, 4)}</span>
                                                    </div>
                                                ) : ['manage_sell_offer', 'manage_buy_offer', 'create_passive_sell_offer'].includes(op.type) ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-blue-500 font-bold">
                                                            {(op as any).amount ? formatTokenAmount((op as any).amount) : '0'}
                                                        </span>
                                                        <span className="text-gray-500">
                                                            {(op as any).selling_asset_code || ((op as any).selling_asset_type === 'native' ? 'XLM' : '')}
                                                        </span>
                                                        <span className="text-gray-400 mx-1">@</span>
                                                        <span className="text-gray-900 font-mono">{(op as any).price}</span>
                                                        <span className="text-gray-500">
                                                            {(op as any).buying_asset_code || ((op as any).buying_asset_type === 'native' ? 'XLM' : '')}
                                                        </span>
                                                    </div>
                                                ) : op.type === 'create_account' ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-gray-500">Fund Account:</span>
                                                        <span className="font-bold text-gray-900">{formatTokenAmount((op as any).starting_balance)} XLM</span>
                                                    </div>
                                                ) : (op.type === 'invoke_host_function' || String(op.type).toLowerCase().includes('invokecontract') || String(op.type).toLowerCase().includes('hostfunction')) ? (
                                                    <div>
                                                        <span className="text-purple-500">{decodeContractFunctionName(op)}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-600">{getOpStyle(op.type).label}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">
                                                <Link href={`/transaction/${op.transaction_hash}`} className="hover:text-[#06b6d4] hover:underline">
                                                    {shortenAddress(op.transaction_hash, 8)}
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                        <button className="text-[10px] font-bold text-gray-400 hover:text-[#06b6d4] transition-colors flex items-center gap-1 mx-auto uppercase tracking-tighter">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            Load More Activity
                        </button>
                    </div>
                </div>

                {/* Network Summary (Right) */}
                <div className="flex-[1] flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm h-fit">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Network Summary</h3>
                        <span className="text-[10px] text-[#06b6d4] font-bold animate-pulse">SYNCED</span>
                    </div>

                    <div className="flex-1 p-4 space-y-4">
                        {/* TPS Widget */}
                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Live Throughput</div>
                            <div className="flex items-end gap-2 mb-2 h-24 justify-between px-2">
                                {[30, 45, 25, 60, 40, 75, 50].map((h, i) => (
                                    <div key={i} className="w-2 rounded-t bg-[#06b6d4]" style={{ height: `${h}%`, opacity: 0.2 + (i * 0.1) }}></div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-xs font-bold text-gray-900 font-mono">{tps} TPS</span>
                                <span className="text-[10px] text-green-500 font-bold">+12.4%</span>
                            </div>
                        </div>

                        {/* Quick Stats - REMOVED per user request */}

                        {/* Health Status */}
                        <div className="pt-4 border-t border-gray-100">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Health Status</div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-500">Validator Consensus</span>
                                    <span className="text-[10px] text-green-500 font-bold">100%</span>
                                </div>
                                <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="w-full h-full bg-green-500"></div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-500">Mempool Load</span>
                                    <span className="text-[10px] text-[#06b6d4] font-bold">14%</span>
                                </div>
                                <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="w-[14%] h-full bg-[#06b6d4]"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-3 bg-gray-50 border-t border-gray-100">
                        <div className="flex items-center justify-center gap-4">
                            <span className="text-[9px] text-gray-400 font-mono">Mainnet v{liveStats.protocol_version}</span>
                            <span className="text-[9px] text-gray-400 font-mono">Lag: 12ms</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
