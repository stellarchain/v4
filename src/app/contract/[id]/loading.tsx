export default function ContractLoading() {
    const primaryColor = '#0F4C81';

    return (
        <div className="bg-[var(--bg-primary)] text-[var(--text-secondary)] min-h-screen flex flex-col font-sans pb-24">
            {/* Header - matching new layout */}
            <header className="sticky top-0 z-10 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
                    <div className="h-6 w-32 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                </div>
                <div className="w-[140px] h-9 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
            </header>

            <main className="px-4 pt-4 max-w-lg mx-auto w-full">
                {/* Metadata Row - badges */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <div
                        className="h-7 w-28 rounded-full animate-pulse"
                        style={{ backgroundColor: `${primaryColor}15` }}
                    />
                    <div className="h-5 w-12 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
                    <div className="h-5 w-10 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
                    <div className="h-5 w-24 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
                </div>

                {/* Summary Card */}
                <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-4 mb-5">
                    {/* Header row */}
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="h-3 w-16 rounded bg-[var(--bg-tertiary)] animate-pulse mb-2" />
                            <div className="h-5 w-32 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                        </div>
                        <div className="text-right">
                            <div className="h-3 w-12 rounded bg-[var(--bg-tertiary)] animate-pulse mb-2 ml-auto" />
                            <div className="h-4 w-20 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                        </div>
                    </div>

                    {/* Details section */}
                    <div className="mt-4 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-2xl p-4">
                        <div className="flex items-center justify-between">
                            <div className="h-3 w-16 rounded bg-[var(--bg-hover)] animate-pulse" />
                            <div className="h-5 w-8 rounded bg-[var(--bg-hover)] animate-pulse" />
                        </div>
                        <div className="my-3 border-t border-dashed border-[var(--border-subtle)]" />
                        <div className="h-10 w-full rounded bg-[var(--bg-hover)] animate-pulse" />
                    </div>

                    {/* Bottom info row */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-subtle)]">
                        <div className="h-3 w-16 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                        <div className="h-4 w-32 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex gap-4 border-b border-[var(--border-default)] pb-3 mb-4">
                    <div className="h-4 w-16 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                    <div className="flex items-center gap-1">
                        <div className="h-4 w-14 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                        <div className="h-4 w-5 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="h-4 w-12 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                        <div className="h-4 w-5 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
                    </div>
                    <div className="h-4 w-16 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                </div>

                {/* Content - Recent Activity Card */}
                <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="h-3 w-24 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                        <div className="h-3 w-16 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                    </div>
                    <div className="divide-y divide-[var(--border-subtle)]">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-3 py-3">
                                <div className="w-9 h-9 rounded-lg bg-[var(--bg-tertiary)] animate-pulse flex-shrink-0" />
                                <div className="flex-1">
                                    <div className="h-3 w-20 rounded bg-[var(--bg-tertiary)] animate-pulse mb-1.5" />
                                    <div className="h-2.5 w-16 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                </div>
                                <div className="text-right">
                                    <div className="h-3 w-12 rounded bg-[var(--bg-tertiary)] animate-pulse mb-1" />
                                    <div className="h-2 w-8 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                </div>
                                <div className="w-4 h-4 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Storage Card */}
                <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                            <div className="h-3 w-16 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                        </div>
                        <div className="h-3 w-16 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                    </div>
                    <div className="divide-y divide-[var(--border-subtle)]">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-5 w-16 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
                                    <div className="h-3 w-24 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                </div>
                                <div className="h-3 w-20 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
