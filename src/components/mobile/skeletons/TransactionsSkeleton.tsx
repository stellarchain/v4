'use client';

export default function TransactionsSkeleton() {
  return (
    <div className="px-3 mt-4">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-28 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          <div className="h-5 w-16 bg-[var(--success)]/10 animate-pulse rounded" />
        </div>
        <div className="w-5 h-5 bg-[var(--bg-tertiary)] animate-pulse rounded" />
      </div>

      {/* Transaction Cards Skeleton */}
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-[var(--bg-secondary)] rounded-xl p-3 border border-[var(--border-subtle)]"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[var(--bg-tertiary)] animate-pulse rounded-lg" />
                <div>
                  <div className="h-4 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded mb-1" />
                  <div className="h-3 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                </div>
              </div>
              <div className="text-right">
                <div className="h-4 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded mb-1" />
                <div className="h-3 w-12 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="h-3 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              <div className="h-3 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Load More Skeleton */}
      <div className="mt-3 text-center">
        <div className="inline-block h-10 w-36 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
      </div>
    </div>
  );
}
