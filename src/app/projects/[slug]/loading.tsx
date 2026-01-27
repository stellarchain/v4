export default function ProjectDetailLoading() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Back Link Skeleton */}
      <div className="h-5 w-32 bg-[var(--bg-tertiary)] animate-pulse rounded" />

      {/* Header Card Skeleton */}
      <div className="bg-[var(--bg-secondary)] rounded-2xl p-8 shadow-sm">
        <div className="flex items-start gap-6">
          {/* Logo */}
          <div className="w-20 h-20 bg-[var(--bg-tertiary)] animate-pulse rounded-2xl shrink-0" />

          <div className="flex-1 min-w-0">
            {/* Title and Category */}
            <div className="flex items-center gap-3 mb-3">
              <div className="h-7 w-40 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              <div className="h-6 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded-lg" />
            </div>

            {/* Description */}
            <div className="space-y-2 mb-4">
              <div className="h-4 w-full bg-[var(--bg-tertiary)] animate-pulse rounded" />
              <div className="h-4 w-3/4 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <div className="h-10 w-32 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
              <div className="h-10 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* SCF Award Card Skeleton */}
      <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          <div className="h-5 w-48 bg-[var(--bg-tertiary)] animate-pulse rounded" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-subtle)]">
              <div className="h-3 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded mb-2" />
              <div className="h-6 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Team Card Skeleton */}
      <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          <div className="h-5 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--bg-tertiary)] animate-pulse rounded-full" />
                <div className="flex-1">
                  <div className="h-4 w-28 bg-[var(--bg-tertiary)] animate-pulse rounded mb-1" />
                  <div className="h-3 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)]">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="w-7 h-7 bg-[var(--bg-tertiary)] animate-pulse rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resources Card Skeleton */}
      <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          <div className="h-5 w-36 bg-[var(--bg-tertiary)] animate-pulse rounded" />
        </div>

        <div className="flex flex-wrap gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-28 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
