export default function ContractsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
          <div>
            <h1 className="text-xl font-semibold" style={{ color: '#0F4C81' }}>Contracts</h1>
            <div className="h-4 w-48 bg-[var(--bg-tertiary)] animate-pulse rounded mt-1" />
          </div>
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-[var(--bg-secondary)] rounded-xl p-4 shadow-sm">
            <div className="h-3 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded mb-2" />
            <div className="h-6 w-12 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          </div>
        ))}
      </div>

      {/* Filter and Search Skeleton */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="h-10 flex-1 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
          ))}
        </div>
      </div>

      {/* Contract Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-[var(--bg-secondary)] rounded-2xl p-5 shadow-sm">
            {/* Card Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
                <div>
                  <div className="h-5 w-32 bg-[var(--bg-tertiary)] animate-pulse rounded mb-1" />
                  <div className="h-3 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                </div>
              </div>
              <div className="h-6 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded-lg" />
            </div>

            {/* Contract ID */}
            <div className="h-4 w-full bg-[var(--bg-tertiary)] animate-pulse rounded mb-4" />

            {/* Stats Row */}
            <div className="flex justify-between items-center pt-4 border-t border-[var(--border-default)]">
              <div>
                <div className="h-3 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded mb-1" />
                <div className="h-4 w-12 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              </div>
              <div>
                <div className="h-3 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded mb-1" />
                <div className="h-4 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              </div>
            </div>
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
