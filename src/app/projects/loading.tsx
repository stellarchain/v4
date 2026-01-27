export default function ProjectsLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold" style={{ color: '#0F4C81' }}>Ecosystem Projects</h1>
            <div className="h-5 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded-full" />
          </div>
          <div className="h-4 w-64 bg-[var(--bg-tertiary)] animate-pulse rounded mt-1" />
        </div>
      </div>

      {/* Search and Filter Skeleton */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="h-10 flex-1 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
        <div className="flex gap-2 overflow-x-auto">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded-xl shrink-0" />
          ))}
        </div>
      </div>

      {/* Project Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-[var(--bg-secondary)] rounded-2xl p-5 shadow-sm">
            {/* Card Header */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 bg-[var(--bg-tertiary)] animate-pulse rounded-xl shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="h-5 w-32 bg-[var(--bg-tertiary)] animate-pulse rounded mb-2" />
                <div className="h-6 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded-lg" />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2 mb-4">
              <div className="h-4 w-full bg-[var(--bg-tertiary)] animate-pulse rounded" />
              <div className="h-4 w-3/4 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            </div>

            {/* SCF Award */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              <div className="h-4 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-4 border-t border-[var(--border-default)]">
              <div className="flex gap-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="w-8 h-8 bg-[var(--bg-tertiary)] animate-pulse rounded-lg" />
                ))}
              </div>
              <div className="h-8 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded-lg" />
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
