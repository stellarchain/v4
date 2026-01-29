'use client';

export function ContractHeaderSkeleton() {
  return (
    <div className="bg-[var(--bg-primary)] min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[var(--bg-tertiary)] animate-pulse rounded-full" />
          <div className="h-6 w-32 bg-[var(--bg-tertiary)] animate-pulse rounded" />
        </div>
        <div className="w-[180px] h-9 bg-[var(--bg-tertiary)] animate-pulse rounded-full" />
      </header>

      <main className="px-4 pt-4 max-w-lg mx-auto w-full">
        {/* Metadata Row */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="h-6 w-28 bg-[var(--bg-tertiary)] animate-pulse rounded-full" />
          <div className="h-5 w-12 bg-[var(--bg-tertiary)] animate-pulse rounded-full" />
        </div>

        {/* Summary Card Skeleton */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-4 mb-5">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="h-6 w-40 bg-[var(--bg-tertiary)] animate-pulse rounded mb-2" />
              <div className="h-4 w-32 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            </div>
            <div className="text-right">
              <div className="h-3 w-12 bg-[var(--bg-tertiary)] animate-pulse rounded mb-1" />
              <div className="h-4 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            </div>
          </div>

          <div className="mt-4 bg-[var(--bg-tertiary)] rounded-2xl p-4">
            <div className="flex justify-between items-center">
              <div className="h-3 w-16 bg-[var(--bg-hover)] animate-pulse rounded" />
              <div className="h-5 w-8 bg-[var(--bg-hover)] animate-pulse rounded" />
            </div>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded-full flex-shrink-0" />
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-subtle)]">
              <div className="flex items-center justify-between mb-3">
                <div className="h-4 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                <div className="h-4 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              </div>
              <div className="h-3 w-full bg-[var(--bg-tertiary)] animate-pulse rounded mb-2" />
              <div className="h-3 w-3/4 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export function ContractEventsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[var(--bg-tertiary)] animate-pulse rounded-lg" />
              <div>
                <div className="h-4 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded mb-1" />
                <div className="h-3 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              </div>
            </div>
            <div className="h-3 w-12 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          </div>
          <div className="h-3 w-full bg-[var(--bg-tertiary)] animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}

export function ContractInvocationsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between mb-2">
            <div className="h-5 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            <div className="h-4 w-16 bg-[var(--success)]/20 animate-pulse rounded-full" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-3 w-32 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          </div>
          <div className="h-3 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}

export function ContractStorageSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between mb-3">
            <div className="h-4 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            <div className="h-4 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full bg-[var(--bg-tertiary)] animate-pulse rounded" />
            <div className="h-3 w-2/3 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
