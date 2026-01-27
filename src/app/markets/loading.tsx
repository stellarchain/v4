export default function MarketsLoading() {
  return (
    <>
      {/* Mobile View */}
      <div className="block md:hidden space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
          <div>
            <h1 className="text-xl font-semibold" style={{ color: '#0F4C81' }}>Markets</h1>
            <div className="h-4 w-40 bg-[var(--bg-tertiary)] animate-pulse rounded mt-1" />
          </div>
        </div>

        {/* Search Skeleton */}
        <div className="h-10 w-full bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />

        {/* Mobile Market Row Skeletons */}
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[var(--bg-secondary)] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--bg-tertiary)] animate-pulse rounded-full" />
                  <div>
                    <div className="h-4 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded mb-1" />
                    <div className="h-3 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="h-4 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded mb-1" />
                  <div className="h-3 w-12 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                </div>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-[var(--border-default)]">
                <div className="h-3 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                <div className="h-3 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
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
            <h1 className="text-xl font-semibold" style={{ color: '#0F4C81' }}>Markets</h1>
            <div className="h-4 w-56 bg-[var(--bg-tertiary)] animate-pulse rounded mt-1" />
          </div>
        </div>

        {/* Search and Filter Skeleton */}
        <div className="flex gap-4">
          <div className="h-10 flex-1 max-w-md bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
          <div className="h-10 w-32 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
        </div>

        {/* Market List Skeleton */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-6 gap-4 px-6 py-4 border-b border-[var(--border-default)] bg-[var(--bg-tertiary)]/50">
            <div className="h-4 w-12 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            <div className="h-4 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            <div className="h-4 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            <div className="h-4 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            <div className="h-4 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            <div className="h-4 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          </div>

          {/* Market Row Skeletons */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-6 gap-4 px-6 py-4 border-b border-[var(--border-default)] last:border-b-0"
            >
              {/* Asset */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[var(--bg-tertiary)] animate-pulse rounded-full" />
                <div className="h-4 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              </div>
              {/* Price */}
              <div className="h-4 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              {/* Change */}
              <div className="h-4 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              {/* Volume */}
              <div className="h-4 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              {/* Market Cap */}
              <div className="h-4 w-28 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              {/* Holders */}
              <div className="h-4 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
