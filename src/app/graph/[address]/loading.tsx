export default function GraphAddressLoading() {
  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
          <div>
            <div className="h-6 w-40 bg-[var(--bg-tertiary)] animate-pulse rounded-lg mb-1" />
            <div className="h-3 w-32 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="h-2.5 w-10 bg-[var(--bg-tertiary)] animate-pulse rounded mb-1" />
            <div className="h-4 w-8 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          </div>
          <div className="text-right">
            <div className="h-2.5 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded mb-1" />
            <div className="h-4 w-8 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          </div>
        </div>
      </div>

      {/* Legend Skeleton */}
      <div className="bg-[var(--bg-secondary)] rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-6 flex-wrap">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-[var(--bg-tertiary)] animate-pulse rounded-full" />
              <div className="h-3 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Graph Area Skeleton */}
      <div className="h-[600px] w-full max-w-full overflow-hidden rounded-2xl relative bg-[var(--bg-secondary)] shadow-sm">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div
              className="w-12 h-12 border-3 border-t-transparent rounded-full animate-spin mx-auto mb-4"
              style={{ borderColor: '#0F4C81', borderTopColor: 'transparent' }}
            />
            <div className="h-4 w-48 bg-[var(--bg-tertiary)] animate-pulse rounded mx-auto" />
          </div>
        </div>

        {/* Decorative graph nodes skeleton */}
        <div className="absolute inset-0 opacity-20">
          {/* Central node */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full animate-pulse"
            style={{ backgroundColor: '#0F4C81' }}
          />

          {/* Surrounding nodes - responsive positioning */}
          <div className="hidden sm:block">
            <div className="absolute top-1/4 left-1/4 w-8 h-8 bg-[var(--bg-tertiary)] rounded-full animate-pulse" />
            <div className="absolute top-1/4 right-1/4 w-10 h-10 bg-[var(--bg-tertiary)] rounded-full animate-pulse" />
            <div className="absolute bottom-1/4 left-1/3 w-6 h-6 bg-[var(--bg-tertiary)] rounded-full animate-pulse" />
            <div className="absolute bottom-1/3 right-1/4 w-8 h-8 bg-[var(--bg-tertiary)] rounded-full animate-pulse" />
            <div className="absolute top-1/3 left-1/5 w-5 h-5 bg-[var(--bg-tertiary)] rounded-full animate-pulse" />
            <div className="absolute bottom-1/4 right-1/3 w-7 h-7 bg-[var(--bg-tertiary)] rounded-full animate-pulse" />
          </div>

          {/* Mobile-friendly nodes */}
          <div className="sm:hidden">
            <div className="absolute top-1/4 left-1/4 w-6 h-6 bg-[var(--bg-tertiary)] rounded-full animate-pulse" />
            <div className="absolute top-1/4 right-1/4 w-8 h-8 bg-[var(--bg-tertiary)] rounded-full animate-pulse" />
            <div className="absolute bottom-1/4 left-1/4 w-5 h-5 bg-[var(--bg-tertiary)] rounded-full animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-6 h-6 bg-[var(--bg-tertiary)] rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
