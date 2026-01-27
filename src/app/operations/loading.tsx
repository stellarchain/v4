export default function OperationsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold" style={{ color: '#0F4C81' }}>Operations</h1>
            <div className="w-1.5 h-1.5 bg-[var(--bg-tertiary)] animate-pulse rounded-full" />
          </div>
          <div className="h-4 w-56 bg-[var(--bg-tertiary)] animate-pulse rounded mt-1" />
        </div>
      </div>

      {/* Operation List Skeleton */}
      <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm overflow-hidden">
        {/* Operation Row Skeletons */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 px-4 md:px-6 py-4 border-b border-[var(--border-default)] last:border-b-0"
          >
            {/* Type Badge */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
              <div>
                <div className="h-4 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded mb-1" />
                <div className="h-3 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 md:flex md:items-center md:gap-6">
              {/* Source Account */}
              <div className="flex items-center gap-2 mb-2 md:mb-0">
                <div className="w-6 h-6 bg-[var(--bg-tertiary)] animate-pulse rounded-full" />
                <div className="h-4 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              </div>

              {/* Arrow */}
              <div className="hidden md:block h-4 w-4 bg-[var(--bg-tertiary)] animate-pulse rounded" />

              {/* Destination */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[var(--bg-tertiary)] animate-pulse rounded-full" />
                <div className="h-4 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              </div>
            </div>

            {/* Amount & Time */}
            <div className="flex justify-between md:flex-col md:items-end gap-2">
              <div className="h-5 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              <div className="h-3 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            </div>
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
