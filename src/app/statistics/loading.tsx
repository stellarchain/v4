export default function StatisticsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#0F4C81' }}>Network Statistics</h1>
          <div className="h-4 w-64 bg-[var(--bg-tertiary)] animate-pulse rounded mt-1" />
        </div>
      </div>

      {/* Main Stats Grid Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[var(--bg-secondary)] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-[var(--bg-tertiary)] animate-pulse rounded-lg" />
              <div className="h-3 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            </div>
            <div className="h-8 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded mb-1" />
            <div className="h-3 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          </div>
        ))}
      </div>

      {/* Secondary Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-[var(--bg-secondary)] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[var(--bg-tertiary)] animate-pulse rounded-lg" />
                <div className="h-4 w-28 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              </div>
              <div className="h-6 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded-lg" />
            </div>

            {/* Mini Chart Placeholder */}
            <div className="h-20 bg-[var(--bg-tertiary)] animate-pulse rounded-xl mb-3" />

            {/* Stats Row */}
            <div className="flex justify-between">
              <div>
                <div className="h-3 w-12 bg-[var(--bg-tertiary)] animate-pulse rounded mb-1" />
                <div className="h-5 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              </div>
              <div>
                <div className="h-3 w-12 bg-[var(--bg-tertiary)] animate-pulse rounded mb-1" />
                <div className="h-5 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart Section Skeleton */}
      <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-32 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 w-12 bg-[var(--bg-tertiary)] animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
        <div className="h-64 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
      </div>
    </div>
  );
}
