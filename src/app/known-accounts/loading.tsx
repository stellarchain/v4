export default function KnownAccountsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#0F4C81' }}>Known Accounts</h1>
          <div className="h-4 w-56 bg-[var(--bg-tertiary)] animate-pulse rounded mt-1" />
        </div>
      </div>

      {/* Search and Filter Skeleton */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="h-10 flex-1 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
          ))}
        </div>
      </div>

      {/* Account List Skeleton */}
      <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-5 gap-4 px-6 py-4 border-b border-[var(--border-default)] bg-[var(--bg-tertiary)]/50">
          <div className="h-4 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          <div className="h-4 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          <div className="h-4 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          <div className="h-4 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          <div className="h-4 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
        </div>

        {/* Account Row Skeletons */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col md:grid md:grid-cols-5 gap-2 md:gap-4 px-4 md:px-6 py-4 border-b border-[var(--border-default)] last:border-b-0"
          >
            {/* Account */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--bg-tertiary)] animate-pulse rounded-full" />
              <div>
                <div className="h-4 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded mb-1" />
                <div className="h-3 w-32 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              </div>
            </div>
            {/* Label */}
            <div className="h-6 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded-lg" />
            {/* Category */}
            <div className="h-6 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded-lg" />
            {/* Balance */}
            <div className="h-4 w-28 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            {/* Status */}
            <div className="h-6 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded-lg" />
          </div>
        ))}
      </div>

      {/* Pagination Skeleton */}
      <div className="flex justify-center gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 w-10 bg-[var(--bg-tertiary)] animate-pulse rounded-lg" />
        ))}
      </div>
    </div>
  );
}
