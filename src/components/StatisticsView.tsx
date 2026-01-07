'use client';

import { useState } from 'react';
import { StatisticsData, StatItem } from '@/lib/stellar';
import StatCard from '@/components/StatCard';
import DetailedChart from '@/components/DetailedChart';

interface StatisticsViewProps {
    stats: StatisticsData;
}

export default function StatisticsView({ stats }: StatisticsViewProps) {
    const [selectedStat, setSelectedStat] = useState<StatItem | null>(null);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 rounded flex items-center justify-center">
                    <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Statistics</h1>
                        <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-pulse-soft" />
                    </div>
                    <p className="text-[var(--text-muted)] text-xs">Real-time Stellar network metrics and market data</p>
                </div>
            </div>

            {/* Market Section */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-4 bg-[var(--primary)] rounded-full" />
                    <h2 className="text-sm font-medium text-[#777] uppercase tracking-wider">Market</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    <StatCard stat={stats.market.price} onClick={() => setSelectedStat(stats.market.price)} />
                    <StatCard stat={stats.market.rank} onClick={() => setSelectedStat(stats.market.rank)} />
                    <StatCard stat={stats.market.marketCap} onClick={() => setSelectedStat(stats.market.marketCap)} />
                    <StatCard stat={stats.market.volume} onClick={() => setSelectedStat(stats.market.volume)} />
                    <StatCard stat={stats.market.circulatingSupply} onClick={() => setSelectedStat(stats.market.circulatingSupply)} />
                </div>
            </section>

            {/* Blockchain Section */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-4 bg-blue-400 rounded-full" />
                    <h2 className="text-sm font-medium text-[#777] uppercase tracking-wider">Blockchain</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    <StatCard stat={stats.blockchain.totalLedgers} onClick={() => setSelectedStat(stats.blockchain.totalLedgers)} />
                    <StatCard stat={stats.blockchain.tps} onClick={() => setSelectedStat(stats.blockchain.tps)} />
                    <StatCard stat={stats.blockchain.ops} onClick={() => setSelectedStat(stats.blockchain.ops)} />
                    <StatCard stat={stats.blockchain.txPerLedger} onClick={() => setSelectedStat(stats.blockchain.txPerLedger)} />
                    <StatCard stat={stats.blockchain.successfulTx} onClick={() => setSelectedStat(stats.blockchain.successfulTx)} />
                </div>
            </section>

            {/* Network Section */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-4 bg-purple-400 rounded-full" />
                    <h2 className="text-sm font-medium text-[#777] uppercase tracking-wider">Network</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    <StatCard stat={stats.network.totalAccounts} onClick={() => setSelectedStat(stats.network.totalAccounts)} />
                    <StatCard stat={stats.network.totalAssets} onClick={() => setSelectedStat(stats.network.totalAssets)} />
                    <StatCard stat={stats.network.outputValue} onClick={() => setSelectedStat(stats.network.outputValue)} />
                    <StatCard stat={stats.network.activeAddresses} onClick={() => setSelectedStat(stats.network.activeAddresses)} />
                    <StatCard stat={stats.network.contractInvocations} onClick={() => setSelectedStat(stats.network.contractInvocations)} />
                </div>
            </section>

            {/* Info Card */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded p-4">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[var(--bg-tertiary)] rounded flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-xs text-[var(--text-muted)]">
                            Data is aggregated from multiple sources including CoinGecko, Stellar Horizon, and StellarExpert APIs.
                            Statistics are updated every 60 seconds. Blockchain metrics are calculated from the last 50 ledgers.
                        </p>
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedStat && (
                <DetailedChart stat={selectedStat} onClose={() => setSelectedStat(null)} />
            )}
        </div>
    );
}
