'use client';

export default function StatsCardsSkeleton() {
  return (
    <div className="px-3 mt-2 relative z-20">
      <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-xl rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-t border-white/10 border-x border-b border-white/5 ring-1 ring-white/5">
        <div className="grid grid-cols-2 gap-3">
          {/* Market Cap Skeleton */}
          <div className="bg-[var(--bg-tertiary)] p-3 rounded-xl">
            <div className="flex justify-between items-start mb-2">
              <div className="h-3 w-16 bg-[var(--bg-hover)] animate-pulse rounded" />
              <div className="h-3 w-10 bg-[var(--bg-hover)] animate-pulse rounded" />
            </div>
            <div className="flex items-end justify-between">
              <div className="h-6 w-16 bg-[var(--bg-hover)] animate-pulse rounded" />
              <div className="w-16 h-8 bg-[var(--bg-hover)] animate-pulse rounded" />
            </div>
          </div>

          {/* Volume Skeleton */}
          <div className="bg-[var(--bg-tertiary)] p-3 rounded-xl">
            <div className="flex justify-between items-start mb-2">
              <div className="h-3 w-14 bg-[var(--bg-hover)] animate-pulse rounded" />
              <div className="h-3 w-10 bg-[var(--bg-hover)] animate-pulse rounded" />
            </div>
            <div className="flex items-end justify-between">
              <div className="h-6 w-16 bg-[var(--bg-hover)] animate-pulse rounded" />
              <div className="w-16 h-8 bg-[var(--bg-hover)] animate-pulse rounded" />
            </div>
          </div>

          {/* TX Count Skeleton */}
          <div className="bg-[var(--bg-tertiary)] p-3 rounded-xl">
            <div className="flex justify-between items-start mb-2">
              <div className="h-3 w-14 bg-[var(--bg-hover)] animate-pulse rounded" />
              <div className="h-3 w-12 bg-[var(--bg-hover)] animate-pulse rounded" />
            </div>
            <div className="flex items-end justify-between">
              <div className="h-6 w-12 bg-[var(--bg-hover)] animate-pulse rounded" />
              <div className="w-16 h-8 bg-[var(--bg-hover)] animate-pulse rounded" />
            </div>
          </div>

          {/* Ledger Skeleton */}
          <div className="bg-[var(--bg-tertiary)] p-3 rounded-xl">
            <div className="flex justify-between items-start mb-2">
              <div className="h-3 w-12 bg-[var(--bg-hover)] animate-pulse rounded" />
            </div>
            <div className="flex items-end justify-between mt-2">
              <div className="h-6 w-20 bg-[var(--bg-hover)] animate-pulse rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
