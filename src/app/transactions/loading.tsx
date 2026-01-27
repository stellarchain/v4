export default function TransactionsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#0F4C81' }}>Transactions</h1>
          <div className="h-4 w-48 bg-[var(--bg-tertiary)] animate-pulse rounded mt-1" />
        </div>
      </div>

      {/* Tab Buttons Skeleton */}
      <div className="flex gap-2">
        <div className="h-10 w-32 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
        <div className="h-10 w-32 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
      </div>

      {/* Transaction List Skeleton */}
      <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-5 gap-4 px-6 py-4 border-b border-[var(--border-default)] bg-[var(--bg-tertiary)]/50">
          <div className="h-4 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          <div className="h-4 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          <div className="h-4 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          <div className="h-4 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          <div className="h-4 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
        </div>

        {/* Transaction Row Skeletons */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col md:grid md:grid-cols-5 gap-2 md:gap-4 px-4 md:px-6 py-4 border-b border-[var(--border-default)] last:border-b-0"
          >
            {/* Hash */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[var(--bg-tertiary)] animate-pulse rounded-lg" />
              <div className="h-4 w-24 md:w-32 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            </div>
            {/* Ledger */}
            <div className="h-4 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            {/* Operations */}
            <div className="flex gap-1">
              <div className="h-6 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded-lg" />
              <div className="h-6 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded-lg" />
            </div>
            {/* Fee */}
            <div className="h-4 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            {/* Time */}
            <div className="h-4 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          </div>
        ))}
      </div>

      {/* Load More Button Skeleton */}
      <div className="flex justify-center">
        <div className="h-12 w-32 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
      </div>
    </div>
  );
}
