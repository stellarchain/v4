'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { Ledger, NetworkStats, Transaction, formatXLM } from '@/lib/stellar';
import LiveTransactionFeed from './LiveTransactionFeed';
import LiveLedgerFeed from './LiveLedgerFeed';
import LiveOperationFeed from './LiveOperationFeed';
import InfoTooltip from './InfoTooltip';

interface DesktopHomePageProps {
    stats: NetworkStats;
    initialTransactions: Transaction[];
    initialLedgers: Ledger[];
    initialOperations: any[];
    xlmVolume: number;
}

export default function DesktopHomePage({
    stats,
    initialTransactions,
    initialLedgers,
    initialOperations,
    xlmVolume
}: DesktopHomePageProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [liveStats, setLiveStats] = useState(stats);
    const ledgerCountRef = useRef<HTMLDivElement>(null);
    const tpsRef = useRef<HTMLDivElement>(null);

    // Poll for latest stats
    useEffect(() => {
        const fetchLatestStats = async () => {
            try {
                const res = await fetch('https://horizon.stellar.org/ledgers?limit=1&order=desc');
                const data = await res.json();
                const latest: Ledger = data._embedded.records[0];

                if (latest.sequence > liveStats.ledger_count) {
                    setLiveStats(prev => ({
                        ...prev,
                        ledger_count: latest.sequence,
                        latest_ledger: latest,
                    }));

                    // Visual animations
                    if (ledgerCountRef.current) {
                        gsap.fromTo(ledgerCountRef.current, { scale: 1.1 }, { scale: 1, duration: 0.5, ease: 'power2.out' });
                    }
                    if (tpsRef.current) {
                        gsap.fromTo(tpsRef.current, { scale: 1.1 }, { scale: 1, duration: 0.5, ease: 'power2.out' });
                    }
                }
            } catch (e) {
                console.error('Failed to fetch stats', e);
            }
        };

        const interval = setInterval(fetchLatestStats, 6000);
        return () => clearInterval(interval);
    }, [liveStats.ledger_count]);

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
    const tps = (txCount / 5).toFixed(1);

    return (
        <div className="min-h-screen bg-[#F6F7F9]">
            {/* Search Hero Section - Compact & Clean */}
            <div className="relative bg-[#0b0e1e] rounded-2xl overflow-hidden mb-5 shadow-sm">
                <div className="relative z-10 px-6 py-6 flex flex-col gap-5">

                    {/* Top Row: Title & Stats Pill */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                Explore <span className="text-white/40 font-medium text-lg">Stellar Blockchain</span>
                            </h1>
                        </div>

                        {/* Compact Right-Aligned Stats */}
                        <div className="flex bg-[#161a2c] rounded-lg p-1 border border-white/5">
                            <div className="flex items-center gap-3 px-3 py-1 border-r border-white/5">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">XLM</span>
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-white font-mono font-bold text-xs">$0.12</span>
                                    <span className="text-emerald-400 text-[9px] font-medium">+2.5%</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 px-3 py-1">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">Fee</span>
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-white font-mono font-bold text-xs">{(liveStats.base_fee / 10000000).toFixed(7)}</span>
                                    <span className="text-white/40 text-[9px] font-medium">XLM</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Minimal Search Bar - Slimmer */}
                    <form onSubmit={handleSearch} className="max-w-[100%]">
                        <div className="bg-[#161a2c] border border-white/5 rounded-lg flex items-center shadow-inner transition-colors focus-within:bg-[#1a1e32] focus-within:border-white/10">
                            <span className="pl-3 pr-2 text-white/30">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none text-white placeholder-white/30 focus:ring-0 focus:outline-none flex-1 text-xs py-2.5 w-full font-medium"
                                placeholder="Search by Address / Transaction Hash / Ledger / Token"
                            />
                            <div className="flex items-center gap-2 border-l border-white/5 ml-2 pl-3 pr-2">
                                <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded bg-[#23273a] px-1.5 font-mono text-[9px] font-medium text-white/40">
                                    <span className="text-[10px]">⌘</span>K
                                </kbd>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Stats Cards Row - Compact */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

                {/* Card 1: Market Cap */}
                <div className="bg-white rounded-xl p-4 border border-slate-100/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)]">
                    <div className="flex justify-between items-start mb-3">
                        <div className="w-8 h-8 bg-[#F6F7F9] rounded-lg flex items-center justify-center text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                        </div>
                        <InfoTooltip direction="bottom" content="The total market value of all circulating XLM coins." label={<span className="sr-only">Info</span>} />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Market Cap</p>
                        <h3 className="text-xl font-bold text-[#111827] font-mono tracking-tight">{formatXLM(liveStats.total_coins)}</h3>
                    </div>
                </div>

                {/* Card 2: Volume */}
                <div className="bg-white rounded-xl p-4 border border-slate-100/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)]">
                    <div className="flex justify-between items-start mb-3">
                        <div className="w-8 h-8 bg-[#F6F7F9] rounded-lg flex items-center justify-center text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <InfoTooltip direction="bottom" content="Total value of XLM traded in the last 24h." label={<span className="sr-only">Info</span>} />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vol (24h)</p>
                        <h3 className="text-xl font-bold text-[#111827] font-mono tracking-tight">{formattedVolume}</h3>
                    </div>
                </div>

                {/* Card 3: Transactions */}
                <div className="bg-white rounded-xl p-4 border border-slate-100/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)]">
                    <div className="flex justify-between items-start mb-3">
                        <div className="w-8 h-8 bg-[#F6F7F9] rounded-lg flex items-center justify-center text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                            </svg>
                        </div>
                        <InfoTooltip direction="bottom" content="Successful transactions in the latest ledger." label={<span className="sr-only">Info</span>} />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Transactions</p>
                        <div className="flex items-baseline gap-2">
                            <h3 ref={tpsRef} className="text-xl font-bold text-[#111827] font-mono tracking-tight">{liveStats.latest_ledger.successful_transaction_count}</h3>
                            <span className="text-[10px] font-bold text-emerald-500">{tps} TPS</span>
                        </div>
                    </div>
                </div>

                {/* Card 4: Latest Ledger */}
                <div className="bg-white rounded-xl p-4 border border-slate-100/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)]">
                    <div className="flex justify-between items-start mb-3">
                        <div className="w-8 h-8 bg-[#F6F7F9] rounded-lg flex items-center justify-center text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 bg-[#F6F7F9] px-1.5 py-0.5 rounded">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            v{liveStats.protocol_version}
                        </div>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Latest Ledger</p>
                        <h3 ref={ledgerCountRef} className="text-xl font-bold text-[#111827] font-mono tracking-tight">{liveStats.ledger_count.toLocaleString()}</h3>
                    </div>
                </div>

            </div>

            {/* Feeds Layout - Compact */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Left Column (2/3): Recent Ledgers & Transactions */}
                <div className="xl:col-span-2 space-y-6">
                    {/* Recent Ledgers */}
                    <section>
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h2 className="text-sm font-bold text-[#111827]">Recent Ledgers</h2>
                            <Link href="/ledgers" className="text-slate-400 hover:text-slate-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                View All <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </Link>
                        </div>
                        <LiveLedgerFeed initialLedgers={initialLedgers} limit={5} />
                    </section>

                    {/* Recent Transactions */}
                    <section>
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h2 className="text-sm font-bold text-[#111827]">Recent Transactions</h2>
                            <Link href="/transactions" className="text-slate-400 hover:text-slate-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                View All <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </Link>
                        </div>
                        <LiveTransactionFeed initialTransactions={initialTransactions} limit={5} />
                    </section>
                </div>

                {/* Right Column (1/3): Recent Operations */}
                <div className="xl:col-span-1">
                    <section className="bg-white rounded-2xl p-4 border border-slate-100/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)] h-full">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold text-[#111827]">Recent Operations</h2>
                            <Link href="/operations" className="text-slate-400 hover:text-slate-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                View <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </Link>
                        </div>
                        <LiveOperationFeed initialOperations={initialOperations} limit={10} />
                    </section>
                </div>

            </div>
        </div>
    );
}
