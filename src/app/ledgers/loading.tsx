export default function LedgersLoading() {
  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block min-h-screen bg-[var(--bg-primary)] ">
        <div className="mx-auto max-w-[1400px] p-4 lg:p-4">
          {/* Header Card */}
          <div className="mb-4 rounded-2xl border border-[var(--border-default)]  bg-[var(--bg-secondary)]  p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[var(--border-default)]  rounded-xl animate-pulse" />
                <div>
                  <div className="h-3 w-20 bg-[var(--border-default)]  rounded animate-pulse mb-2" />
                  <div className="h-6 w-28 bg-[var(--border-default)]  rounded animate-pulse mb-1" />
                  <div className="h-4 w-56 bg-[var(--border-default)]  rounded animate-pulse" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="p-3 rounded-xl bg-[var(--info-muted)] border border-[var(--info)]/20  min-w-[110px]">
                  <div className="h-3 w-20 bg-[var(--info-muted)] rounded animate-pulse mb-2" />
                  <div className="h-6 w-24 bg-[var(--info-muted)] rounded animate-pulse" />
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-primary)]/70 border border-[var(--border-subtle)]  min-w-[110px]">
                  <div className="h-3 w-16 bg-[var(--border-default)]  rounded animate-pulse mb-2" />
                  <div className="h-6 w-20 bg-[var(--border-default)]  rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-[var(--border-default)]  bg-[var(--bg-secondary)]  shadow-sm overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-6 gap-4 px-4 py-4 border-b border-[var(--border-subtle)]  bg-[var(--bg-primary)]/50">
              <div className="h-4 w-16 bg-[var(--border-default)]  rounded animate-pulse" />
              <div className="h-4 w-20 bg-[var(--border-default)]  rounded animate-pulse" />
              <div className="h-4 w-24 bg-[var(--border-default)]  rounded animate-pulse" />
              <div className="h-4 w-20 bg-[var(--border-default)]  rounded animate-pulse" />
              <div className="h-4 w-24 bg-[var(--border-default)]  rounded animate-pulse" />
              <div className="h-4 w-20 bg-[var(--border-default)]  rounded animate-pulse" />
            </div>

            {/* Rows */}
            {[...Array(10)].map((_, i) => (
              <div key={i} className="grid grid-cols-6 gap-4 px-4 py-4 border-b border-[var(--border-subtle)]  last:border-b-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[var(--border-default)]  rounded-lg animate-pulse" />
                  <div className="h-5 w-20 bg-[var(--border-default)]  rounded animate-pulse" />
                </div>
                <div className="h-4 w-24 bg-[var(--border-default)]  rounded animate-pulse" />
                <div className="h-4 w-16 bg-[var(--border-default)]  rounded animate-pulse" />
                <div className="h-4 w-16 bg-[var(--border-default)]  rounded animate-pulse" />
                <div className="h-4 w-12 bg-[var(--border-default)]  rounded animate-pulse" />
                <div className="h-4 w-20 bg-[var(--border-default)]  rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Load More */}
          <div className="flex justify-center mt-4">
            <div className="h-10 w-28 bg-[var(--border-default)]  rounded-xl animate-pulse" />
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden bg-[var(--bg-primary)]  min-h-screen pb-24">
        <div className="px-4 py-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--border-default)]  animate-pulse rounded-xl" />
            <div>
              <div className="h-5 w-24 bg-[var(--border-default)]  rounded animate-pulse mb-1" />
              <div className="h-4 w-48 bg-[var(--border-default)]  animate-pulse rounded" />
            </div>
          </div>

          {/* Cards */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[var(--bg-secondary)]  rounded-xl p-4 shadow-sm border border-[var(--border-default)] ">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--border-default)]  animate-pulse rounded-lg" />
                  <div>
                    <div className="h-5 w-20 bg-[var(--border-default)]  animate-pulse rounded mb-1" />
                    <div className="h-3 w-24 bg-[var(--border-default)]  animate-pulse rounded" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="h-4 w-20 bg-[var(--border-default)]  animate-pulse rounded mb-1" />
                  <div className="h-3 w-16 bg-[var(--border-default)]  animate-pulse rounded" />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm pt-3 border-t border-[var(--border-subtle)] ">
                <div className="h-3 w-16 bg-[var(--border-default)]  animate-pulse rounded" />
                <div className="h-3 w-20 bg-[var(--border-default)]  animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
