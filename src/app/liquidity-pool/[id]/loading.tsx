export default function Loading() {
    const primaryColor = '#0F4C81';

    return (
        <div className="bg-[var(--bg-primary)] text-[var(--text-secondary)] min-h-screen flex flex-col font-sans pb-24">
            {/* Header Skeleton */}
            <header className="sticky top-0 z-10 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Back button skeleton */}
                    <div className="w-9 h-9 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
                    {/* Title skeleton */}
                    <div
                        className="h-6 w-32 rounded-md animate-pulse"
                        style={{ backgroundColor: `${primaryColor}20` }}
                    />
                </div>
                {/* Search bar skeleton */}
                <div className="flex-1 max-w-[180px] ml-auto">
                    <div className="h-9 w-full rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
                </div>
            </header>

            <main className="px-4 pt-4 max-w-lg mx-auto w-full">
                {/* Metadata Row Skeleton - Pool Pair, Fee, ID */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                    {/* Pool pair badge skeleton */}
                    <div
                        className="h-7 w-28 rounded-full animate-pulse"
                        style={{ backgroundColor: `${primaryColor}15` }}
                    />
                    {/* Fee badge skeleton */}
                    <div className="h-6 w-20 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
                    {/* Pool ID skeleton */}
                    <div className="h-6 w-24 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
                </div>

                {/* Summary Card Skeleton - Reserve Assets */}
                <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-4 mb-5">
                    {/* Pool Type and Trustlines row */}
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="h-3 w-16 rounded bg-[var(--bg-tertiary)] animate-pulse mb-2" />
                            <div className="h-5 w-32 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                        </div>
                        <div className="text-right">
                            <div className="h-3 w-16 rounded bg-[var(--bg-tertiary)] animate-pulse mb-2 ml-auto" />
                            <div className="h-5 w-12 rounded bg-[var(--bg-tertiary)] animate-pulse ml-auto" />
                        </div>
                    </div>

                    {/* Reserve Assets Display Skeleton */}
                    <div className="mt-4 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-2xl p-4">
                        {/* Reserve A */}
                        <div className="flex items-center justify-between">
                            <div className="h-3 w-20 rounded bg-[var(--bg-secondary)] animate-pulse" />
                            <div className="h-5 w-28 rounded bg-[var(--bg-secondary)] animate-pulse" />
                        </div>

                        {/* Divider */}
                        <div className="my-3 border-t border-dashed border-[var(--border-subtle)]" />

                        {/* Reserve B */}
                        <div className="flex items-center justify-between">
                            <div className="h-3 w-20 rounded bg-[var(--bg-secondary)] animate-pulse" />
                            <div className="h-5 w-28 rounded bg-[var(--bg-secondary)] animate-pulse" />
                        </div>
                    </div>

                    {/* Exchange Rate Skeleton */}
                    <div className="mt-4 pt-4 border-t border-[var(--border-default)]/50">
                        <div className="flex items-center justify-between">
                            <div className="h-4 w-24 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                            <div
                                className="h-4 w-36 rounded animate-pulse"
                                style={{ backgroundColor: `${primaryColor}20` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Tabs Navigation Skeleton */}
                <div className="flex gap-4 overflow-x-auto no-scrollbar border-b border-[var(--border-default)] pb-3 mb-4 -mx-4 px-4">
                    {[1, 2, 3, 4].map((tab) => (
                        <div key={tab} className="flex items-center gap-1.5">
                            <div
                                className="h-4 rounded animate-pulse"
                                style={{
                                    width: tab === 1 ? '48px' : tab === 2 ? '52px' : tab === 3 ? '80px' : '72px',
                                    backgroundColor: tab === 1 ? `${primaryColor}30` : 'var(--bg-tertiary)'
                                }}
                            />
                            <div className="h-4 w-6 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
                        </div>
                    ))}
                </div>

                {/* Content List Skeleton */}
                <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                    <div className="divide-y divide-[var(--border-subtle)]">
                        {[1, 2, 3, 4, 5, 6].map((item) => (
                            <div key={item} className="flex items-center gap-3 p-3">
                                {/* Icon skeleton */}
                                <div className="w-9 h-9 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />

                                {/* Content skeleton */}
                                <div className="flex-1 min-w-0">
                                    <div className="h-4 w-32 rounded bg-[var(--bg-tertiary)] animate-pulse mb-1.5" />
                                    <div className="h-3 w-20 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                </div>

                                {/* Right side skeleton */}
                                <div className="text-right flex-shrink-0">
                                    <div className="h-3 w-16 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                </div>

                                {/* Chevron skeleton */}
                                <div className="w-4 h-4 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
