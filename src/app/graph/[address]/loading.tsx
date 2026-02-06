export default function GraphAddressLoading() {
  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block min-h-screen bg-[var(--bg-primary)]">
        <div className="mx-auto max-w-[1400px] p-4 lg:p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--border-default)] rounded-xl animate-pulse" />
              <div>
                <div className="h-6 w-40 bg-[var(--border-default)] rounded-lg animate-pulse mb-1" />
                <div className="h-3 w-32 bg-[var(--border-default)] rounded animate-pulse" />
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="h-3 w-12 bg-[var(--border-default)] rounded animate-pulse mb-1" />
                <div className="h-5 w-8 bg-[var(--border-default)] rounded animate-pulse" />
              </div>
              <div className="text-right">
                <div className="h-3 w-16 bg-[var(--border-default)] rounded animate-pulse mb-1" />
                <div className="h-5 w-8 bg-[var(--border-default)] rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)] p-4 shadow-sm mb-4">
            <div className="flex items-center gap-4 flex-wrap">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${
                    i === 1 ? 'bg-[var(--info)]' : i === 2 ? 'bg-[var(--success)]' : i === 3 ? 'bg-[var(--warning)]' : 'bg-[var(--text-muted)]'
                  }`} />
                  <div className="h-3 w-16 bg-[var(--border-default)] rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          {/* Graph Area */}
          <div className="h-[600px] w-full rounded-2xl relative bg-[var(--bg-secondary)] border border-[var(--border-default)] shadow-sm overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-3 border-[var(--info)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <div className="h-4 w-48 bg-[var(--border-default)] rounded animate-pulse mx-auto" />
              </div>
            </div>

            {/* Decorative graph nodes */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-[var(--info)] rounded-full animate-pulse" />
              <div className="absolute top-1/4 left-1/4 w-8 h-8 bg-[var(--border-strong)] rounded-full animate-pulse" />
              <div className="absolute top-1/4 right-1/4 w-10 h-10 bg-[var(--border-strong)] rounded-full animate-pulse" />
              <div className="absolute bottom-1/4 left-1/3 w-6 h-6 bg-[var(--border-strong)] rounded-full animate-pulse" />
              <div className="absolute bottom-1/3 right-1/4 w-8 h-8 bg-[var(--border-strong)] rounded-full animate-pulse" />
              <div className="absolute top-1/3 left-[20%] w-5 h-5 bg-[var(--border-strong)] rounded-full animate-pulse" />
              <div className="absolute bottom-1/4 right-1/3 w-7 h-7 bg-[var(--border-strong)] rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden bg-[var(--bg-primary)] min-h-screen pb-24">
        <div className="px-4 py-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--border-default)] rounded-xl animate-pulse" />
              <div>
                <div className="h-5 w-32 bg-[var(--border-default)] rounded-lg animate-pulse mb-1" />
                <div className="h-3 w-24 bg-[var(--border-default)] rounded animate-pulse" />
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="h-2 w-8 bg-[var(--border-default)] rounded animate-pulse mb-1" />
                <div className="h-4 w-6 bg-[var(--border-default)] rounded animate-pulse" />
              </div>
              <div className="text-right">
                <div className="h-2 w-10 bg-[var(--border-default)] rounded animate-pulse mb-1" />
                <div className="h-4 w-6 bg-[var(--border-default)] rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] p-3 shadow-sm">
            <div className="flex items-center gap-4 flex-wrap">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                    i === 1 ? 'bg-[var(--info)]' : i === 2 ? 'bg-[var(--success)]' : i === 3 ? 'bg-[var(--warning)]' : 'bg-[var(--text-muted)]'
                  }`} />
                  <div className="h-3 w-12 bg-[var(--border-default)] rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          {/* Graph Area */}
          <div className="h-[400px] w-full rounded-xl relative bg-[var(--bg-secondary)] border border-[var(--border-default)] shadow-sm overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-10 h-10 border-2 border-[var(--info)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <div className="h-3 w-36 bg-[var(--border-default)] rounded animate-pulse mx-auto" />
              </div>
            </div>

            {/* Decorative graph nodes */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-[var(--info)] rounded-full animate-pulse" />
              <div className="absolute top-1/4 left-1/4 w-6 h-6 bg-[var(--border-strong)] rounded-full animate-pulse" />
              <div className="absolute top-1/4 right-1/4 w-8 h-8 bg-[var(--border-strong)] rounded-full animate-pulse" />
              <div className="absolute bottom-1/4 left-1/4 w-5 h-5 bg-[var(--border-strong)] rounded-full animate-pulse" />
              <div className="absolute bottom-1/4 right-1/4 w-6 h-6 bg-[var(--border-strong)] rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
