export default function LedgerLoading() {
    const primaryColor = '#0F4C81';

    return (
        <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen flex flex-col font-sans pb-24">
            <main className="flex-1 px-6 pt-2 pb-8 max-w-lg mx-auto w-full">

                {/* Header / Back Link Skeleton */}
                <div className="flex items-center justify-between mb-4 mt-1">
                    <div className="flex items-center">
                        <div className="w-4 h-4 bg-[var(--bg-tertiary)] animate-pulse rounded mr-1"></div>
                        <div className="w-10 h-3 bg-[var(--bg-tertiary)] animate-pulse rounded"></div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="w-20 h-6 bg-[var(--bg-tertiary)] animate-pulse rounded-full"></div>
                        <div className="w-14 h-6 bg-[var(--bg-tertiary)] animate-pulse rounded-full"></div>
                    </div>
                </div>

                {/* Ledger Main Card Skeleton */}
                <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-4 mb-5 relative overflow-hidden">
                    <div className="relative z-10 flex flex-col gap-4">
                        <div className="flex items-start justify-between relative z-20">
                            <div>
                                {/* Ledger Sequence label */}
                                <div className="w-24 h-3 bg-[var(--bg-tertiary)] animate-pulse rounded mb-2"></div>
                                {/* Ledger number */}
                                <div
                                    className="w-36 h-8 animate-pulse rounded"
                                    style={{ backgroundColor: `${primaryColor}20` }}
                                ></div>
                                {/* Timestamp */}
                                <div className="flex items-center gap-2 mt-3">
                                    <div className="w-3.5 h-3.5 bg-[var(--bg-tertiary)] animate-pulse rounded"></div>
                                    <div className="w-40 h-3 bg-[var(--bg-tertiary)] animate-pulse rounded"></div>
                                </div>
                            </div>

                            {/* Success/Failed badges */}
                            <div className="flex flex-col gap-1.5">
                                <div className="w-14 h-9 bg-[var(--bg-tertiary)] animate-pulse rounded-lg"></div>
                                <div className="w-14 h-9 bg-[var(--bg-tertiary)] animate-pulse rounded-lg"></div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-2 mt-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl p-2 text-center">
                                    <div className="w-8 h-2 bg-[var(--bg-primary)] animate-pulse rounded mx-auto mb-1.5"></div>
                                    <div className="w-10 h-4 bg-[var(--bg-primary)] animate-pulse rounded mx-auto"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tabs Navigation Skeleton */}
                <div className="flex gap-6 border-b border-[var(--border-default)] pb-4 mb-4">
                    <div className="w-16 h-4 bg-[var(--bg-tertiary)] animate-pulse rounded"></div>
                    <div className="flex items-center gap-1">
                        <div className="w-20 h-4 bg-[var(--bg-tertiary)] animate-pulse rounded"></div>
                        <div className="w-6 h-4 bg-[var(--bg-tertiary)] animate-pulse rounded-full"></div>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-18 h-4 bg-[var(--bg-tertiary)] animate-pulse rounded"></div>
                        <div className="w-6 h-4 bg-[var(--bg-tertiary)] animate-pulse rounded-full"></div>
                    </div>
                </div>

                {/* Tab Content Skeleton - Overview/Details Card */}
                <div className="min-h-[200px] space-y-4">
                    <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-4">
                        <div className="w-24 h-3 bg-[var(--bg-tertiary)] animate-pulse rounded mb-3"></div>
                        <div className="space-y-3">
                            {/* Hash row */}
                            <div className="flex flex-col gap-1 border-b border-[var(--border-subtle)] pb-2.5">
                                <div className="w-10 h-2 bg-[var(--bg-tertiary)] animate-pulse rounded"></div>
                                <div className="w-full h-10 bg-[var(--bg-tertiary)] animate-pulse rounded-lg"></div>
                            </div>
                            {/* Detail rows */}
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-2.5 last:border-b-0">
                                    <div className="w-24 h-2 bg-[var(--bg-tertiary)] animate-pulse rounded"></div>
                                    <div className="w-16 h-3 bg-[var(--bg-tertiary)] animate-pulse rounded"></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Navigation Links Skeleton */}
                    <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-3 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between px-3 py-2.5 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)]">
                            <div className="flex items-center gap-2">
                                <div className="w-3.5 h-3.5 bg-[var(--bg-primary)] animate-pulse rounded"></div>
                                <div className="w-24 h-3 bg-[var(--bg-primary)] animate-pulse rounded"></div>
                            </div>
                            <div className="w-20 h-3 bg-[var(--bg-primary)] animate-pulse rounded"></div>
                        </div>
                        <div className="flex items-center justify-between px-3 py-2.5 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)]">
                            <div className="flex items-center gap-2">
                                <div className="w-20 h-3 bg-[var(--bg-primary)] animate-pulse rounded"></div>
                                <div className="w-3.5 h-3.5 bg-[var(--bg-primary)] animate-pulse rounded"></div>
                            </div>
                            <div className="w-20 h-3 bg-[var(--bg-primary)] animate-pulse rounded"></div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
