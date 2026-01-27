export default function GraphLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
        <div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-28 bg-[var(--bg-tertiary)] animate-pulse rounded-lg" />
            <div className="h-5 w-10 bg-[var(--bg-tertiary)] animate-pulse rounded-full" />
          </div>
          <div className="h-3 w-64 bg-[var(--bg-tertiary)] animate-pulse rounded mt-1" />
        </div>
      </div>

      {/* Search Card Skeleton */}
      <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <div className="h-3 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded mb-2" />
            <div className="h-12 w-full bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
          </div>
          <div
            className="h-12 w-full rounded-xl animate-pulse"
            style={{ backgroundColor: '#0F4C81', opacity: 0.5 }}
          />
        </div>
      </div>

      {/* Showcase Card Skeleton */}
      <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="h-5 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded-md" />
            <div>
              <div className="h-5 w-32 bg-[var(--bg-tertiary)] animate-pulse rounded mb-1" />
              <div className="h-3 w-40 bg-[var(--bg-tertiary)] animate-pulse rounded mb-3" />
              <div className="h-3 w-full max-w-md bg-[var(--bg-tertiary)] animate-pulse rounded" />
            </div>
          </div>
          <div className="w-5 h-5 bg-[var(--bg-tertiary)] animate-pulse rounded" />
        </div>
      </div>

      {/* Info Skeleton */}
      <div className="flex justify-center">
        <div className="h-3 w-72 bg-[var(--bg-tertiary)] animate-pulse rounded" />
      </div>
    </div>
  );
}
