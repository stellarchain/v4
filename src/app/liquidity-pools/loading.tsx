export default function LiquidityPoolsLoading() {
  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
          <div>
            <h1 className="text-xl font-semibold" style={{ color: '#0F4C81' }}>Liquidity Pools</h1>
            <div className="h-4 w-44 bg-[var(--bg-tertiary)] animate-pulse rounded mt-1" />
          </div>
        </div>

        {/* Mobile Pool Row Skeletons */}
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[var(--bg-secondary)] rounded-xl p-4 shadow-sm">
              {/* Pool Pair */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 bg-[var(--bg-tertiary)] animate-pulse rounded-full" />
                    <div className="w-8 h-8 bg-[var(--bg-tertiary)] animate-pulse rounded-full" />
                  </div>
                  <div>
                    <div className="h-4 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded mb-1" />
                    <div className="h-3 w-12 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                  </div>
                </div>
                <div className="h-6 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded-lg" />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--border-default)]">
                <div>
                  <div className="h-3 w-12 bg-[var(--bg-tertiary)] animate-pulse rounded mb-1" />
                  <div className="h-4 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                </div>
                <div>
                  <div className="h-3 w-12 bg-[var(--bg-tertiary)] animate-pulse rounded mb-1" />
                  <div className="h-4 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
          <div>
            <h1 className="text-xl font-semibold" style={{ color: '#0F4C81' }}>Liquidity Pools</h1>
            <div className="h-4 w-64 bg-[var(--bg-tertiary)] animate-pulse rounded mt-1" />
          </div>
        </div>

        {/* Search Skeleton */}
        <div className="h-10 w-full max-w-md bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />

        {/* Pool List Skeleton */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-6 gap-4 px-6 py-4 border-b border-[var(--border-default)] bg-[var(--bg-tertiary)]/50">
            <div className="h-4 w-12 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            <div className="h-4 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            <div className="h-4 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            <div className="h-4 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            <div className="h-4 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            <div className="h-4 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          </div>

          {/* Pool Row Skeletons */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-6 gap-4 px-6 py-4 border-b border-[var(--border-default)] last:border-b-0"
            >
              {/* Pool Pair */}
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  <div className="w-6 h-6 bg-[var(--bg-tertiary)] animate-pulse rounded-full" />
                  <div className="w-6 h-6 bg-[var(--bg-tertiary)] animate-pulse rounded-full" />
                </div>
                <div className="h-4 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              </div>
              {/* TVL */}
              <div className="h-4 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              {/* Volume 24h */}
              <div className="h-4 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              {/* Fee */}
              <div className="h-4 w-12 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              {/* Reserves */}
              <div className="h-4 w-28 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              {/* Participants */}
              <div className="h-4 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            </div>
          ))}
        </div>

        {/* Load More Button Skeleton */}
        <div className="flex justify-center">
          <div className="h-12 w-32 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
        </div>
      </div>
    </>
  );
}
