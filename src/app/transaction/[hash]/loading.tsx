export default function TransactionLoading() {
  const primaryColor = '#0F4C81';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-secondary)] pb-24">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Back button skeleton */}
          <div className="w-9 h-9 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
          {/* Title skeleton */}
          <div className="h-6 w-32 rounded-md bg-[var(--bg-tertiary)] animate-pulse" />
        </div>
        {/* Search skeleton */}
        <div className="flex-1 max-w-[180px] ml-auto">
          <div className="h-9 w-full rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pt-4 max-w-lg mx-auto w-full">
        {/* Meta Data Row */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Timestamp skeleton */}
          <div className="h-4 w-28 rounded bg-[var(--bg-tertiary)] animate-pulse" />
          {/* Status badge skeleton */}
          <div className="h-5 w-20 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
          {/* Hash badge skeleton */}
          <div className="h-5 w-24 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
        </div>

        {/* Transaction Type Card */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-4 mb-5">
          <div className="flex justify-between items-start">
            <div>
              <div className="h-3 w-24 rounded bg-[var(--bg-tertiary)] animate-pulse mb-2" />
              <div className="h-5 w-32 rounded bg-[var(--bg-tertiary)] animate-pulse mt-1" />
            </div>
            <div className="text-right">
              <div className="h-3 w-16 rounded bg-[var(--bg-tertiary)] animate-pulse mb-2" />
              <div className="h-4 w-20 rounded bg-[var(--bg-tertiary)] animate-pulse mt-1" />
            </div>
          </div>

          {/* Contract Address skeleton */}
          <div className="mt-3 pt-3 border-t border-[var(--border-default)]/50">
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 rounded bg-[var(--bg-tertiary)] animate-pulse" />
              <div className="h-4 w-28 rounded bg-[var(--bg-tertiary)] animate-pulse" />
            </div>
          </div>

          {/* Summary Card skeleton */}
          <div className="mt-4 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--bg-tertiary)] rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none opacity-50" />
            <div className="relative z-10 space-y-4">
              {/* Sent Row skeleton */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] animate-pulse" />
                  <div className="h-3 w-12 rounded bg-[var(--bg-secondary)] animate-pulse" />
                </div>
                <div className="text-right">
                  <div className="h-4 w-24 rounded bg-[var(--bg-secondary)] animate-pulse mb-1" />
                  <div className="h-3 w-10 rounded bg-[var(--bg-secondary)] animate-pulse" />
                </div>
              </div>

              {/* Connector Arrow skeleton */}
              <div className="flex justify-center -my-1">
                <div className="w-6 h-6 rounded-full bg-[var(--bg-secondary)] animate-pulse" />
              </div>

              {/* Received Row skeleton */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] animate-pulse" />
                  <div className="h-3 w-16 rounded bg-[var(--bg-secondary)] animate-pulse" />
                </div>
                <div className="text-right">
                  <div className="h-4 w-20 rounded bg-[var(--bg-secondary)] animate-pulse mb-1" />
                  <div className="h-3 w-10 rounded bg-[var(--bg-secondary)] animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Network Fee skeleton */}
          <div className="mt-4 pt-4 border-t border-[var(--border-default)]/50">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded bg-[var(--bg-tertiary)] animate-pulse" />
              <div className="h-3 w-24 rounded bg-[var(--bg-tertiary)] animate-pulse" />
            </div>
          </div>
        </div>

        {/* Tabs Navigation skeleton */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar border-b border-[var(--border-default)] pb-3 mb-4 mt-6 -mx-4 px-4">
          {['Operations', 'Effects', 'Details', 'Raw'].map((tab, i) => (
            <div key={tab} className="flex items-center gap-1">
              <div
                className="h-4 rounded bg-[var(--bg-tertiary)] animate-pulse"
                style={{ width: `${tab.length * 8 + 16}px` }}
              />
              {i === 0 && (
                <div className="h-4 w-6 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
              )}
            </div>
          ))}
        </div>

        {/* Operations List skeleton */}
        <div className="space-y-3 min-h-[200px]">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] overflow-hidden p-4"
            >
              {/* Operation Header */}
              <div className="flex items-center gap-3 mb-4">
                {/* Icon skeleton */}
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] animate-pulse" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {/* OP badge skeleton */}
                    <div className="h-5 w-12 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                    {/* Operation title skeleton */}
                    <div className="h-4 w-20 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                  </div>
                  {/* Description skeleton */}
                  <div className="h-3 w-32 rounded bg-[var(--bg-tertiary)] animate-pulse mt-1.5" />
                </div>
              </div>

              {/* Operation Details */}
              <div className="space-y-2 bg-[var(--bg-tertiary)] rounded-xl p-3">
                {/* From row */}
                <div className="flex items-center justify-between">
                  <div className="h-3 w-10 rounded bg-[var(--bg-secondary)] animate-pulse" />
                  <div className="h-3 w-28 rounded bg-[var(--bg-secondary)] animate-pulse" />
                </div>
                {/* To row */}
                <div className="flex items-center justify-between">
                  <div className="h-3 w-8 rounded bg-[var(--bg-secondary)] animate-pulse" />
                  <div className="h-3 w-28 rounded bg-[var(--bg-secondary)] animate-pulse" />
                </div>
                {/* Amount row */}
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-[var(--border-default)]">
                  <div className="h-3 w-14 rounded bg-[var(--bg-secondary)] animate-pulse" />
                  <div className="h-4 w-24 rounded bg-[var(--bg-secondary)] animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Mobile Navigation placeholder */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-[var(--bg-primary)] border-t border-[var(--border-subtle)]" />
    </div>
  );
}
