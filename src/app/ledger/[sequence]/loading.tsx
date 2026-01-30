export default function LedgerLoading() {
    return (
        <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-[calc(100vh+1px)] flex flex-col font-sans pb-24">
            <main className="flex-1 px-3 pt-2 pb-8 max-w-lg mx-auto w-full">

                {/* Header / Back Link Skeleton */}
                <div className="flex items-center justify-between mb-4 mt-1">
                    <div className="flex items-center">
                        <div className="w-4 h-4 bg-[var(--bg-tertiary)] animate-pulse rounded mr-1"></div>
                        <div className="w-10 h-3 bg-[var(--bg-tertiary)] animate-pulse rounded"></div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="w-20 h-6 bg-[var(--primary-blue)] animate-pulse rounded-full"></div>
                        <div className="w-14 h-6 bg-[var(--success)]/10 animate-pulse rounded-full"></div>
                    </div>
                </div>

                {/* Ledger Main Card Skeleton */}
                <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-3 mb-2 relative overflow-hidden">
                    <div className="relative z-10 flex flex-col gap-3">
                        <div className="flex items-start justify-between relative z-20">
                            <div>
                                {/* Ledger Sequence label */}
                                <div className="w-24 h-2.5 bg-[var(--bg-tertiary)] animate-pulse rounded mb-2"></div>
                                {/* Navigation + Ledger number */}
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-7 h-7 bg-[var(--bg-tertiary)] animate-pulse rounded-lg"></div>
                                    <div className="w-32 h-7 bg-[var(--primary-blue)]/20 animate-pulse rounded"></div>
                                    <div className="w-7 h-7 bg-[var(--bg-tertiary)] animate-pulse rounded-lg"></div>
                                </div>
                                {/* Timestamp */}
                                <div className="flex items-center gap-2 mt-1.5">
                                    <div className="w-3.5 h-3.5 bg-[var(--bg-tertiary)] animate-pulse rounded"></div>
                                    <div className="w-44 h-3 bg-[var(--bg-tertiary)] animate-pulse rounded"></div>
                                </div>
                            </div>

                            {/* Success/Failed badges */}
                            <div className="flex flex-col gap-1.5">
                                <div className="w-16 h-9 bg-[var(--success)]/10 animate-pulse rounded-lg"></div>
                                <div className="w-16 h-9 bg-[var(--error)]/10 animate-pulse rounded-lg"></div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl p-2 text-center">
                                    <div className="w-6 h-2 bg-[var(--bg-primary)] animate-pulse rounded mx-auto mb-1"></div>
                                    <div className="w-10 h-4 bg-[var(--bg-primary)] animate-pulse rounded mx-auto"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tabs Navigation Skeleton - Glider Style */}
                <div className="relative flex items-center bg-[var(--bg-secondary)] p-1 rounded-xl shadow-sm border border-[var(--border-subtle)] mb-2">
                    <div className="flex-1 py-1.5 flex items-center justify-center">
                        <div className="w-14 h-3 bg-[var(--bg-tertiary)] animate-pulse rounded"></div>
                    </div>
                    <div className="flex-1 py-1.5 flex items-center justify-center gap-1">
                        <div className="w-18 h-3 bg-[var(--bg-tertiary)] animate-pulse rounded"></div>
                        <div className="w-[18px] h-[18px] bg-[var(--bg-tertiary)] animate-pulse rounded-full"></div>
                    </div>
                    <div className="flex-1 py-1.5 flex items-center justify-center gap-1">
                        <div className="w-16 h-3 bg-[var(--bg-tertiary)] animate-pulse rounded"></div>
                        <div className="w-[18px] h-[18px] bg-[var(--bg-tertiary)] animate-pulse rounded-full"></div>
                    </div>
                </div>

                {/* Tab Content Skeleton - Overview/Details Card */}
                <div className="min-h-[200px] space-y-2">
                    <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-3">
                        <div className="w-24 h-3 bg-[var(--bg-tertiary)] animate-pulse rounded mb-3"></div>
                        <div className="space-y-3">
                            {/* Hash row */}
                            <div className="flex flex-col gap-1 border-b border-[var(--border-subtle)] pb-2.5">
                                <div className="w-10 h-2 bg-[var(--bg-tertiary)] animate-pulse rounded"></div>
                                <div className="w-full h-10 bg-[var(--bg-tertiary)] animate-pulse rounded-lg"></div>
                            </div>
                            {/* Detail rows */}
                            {[1, 2, 3].map((i) => (
                                <div key={i} className={`flex items-center justify-between gap-4 ${i < 3 ? 'border-b border-[var(--border-subtle)] pb-2.5' : ''}`}>
                                    <div className="w-24 h-2 bg-[var(--bg-tertiary)] animate-pulse rounded"></div>
                                    <div className="w-20 h-3 bg-[var(--bg-tertiary)] animate-pulse rounded"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
