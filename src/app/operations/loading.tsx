export default function OperationsLoading() {
  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block min-h-screen bg-[var(--bg-primary)]">
        <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
          {/* Header Card */}
          <div className="mb-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[var(--border-default)] rounded-xl animate-pulse" />
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-6 w-28 bg-[var(--border-default)] rounded animate-pulse" />
                    <div className="w-2 h-2 bg-[var(--success)] rounded-full animate-pulse" />
                  </div>
                  <div className="h-4 w-56 bg-[var(--border-default)] rounded animate-pulse" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="p-3 rounded-xl bg-[var(--info-muted)] border border-[var(--info)]/20 min-w-[110px]">
                  <div className="h-3 w-20 bg-[var(--info-muted)] rounded animate-pulse mb-2" />
                  <div className="h-6 w-24 bg-[var(--info-muted)] rounded animate-pulse" />
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-primary)]/70 border border-[var(--border-subtle)] min-w-[110px]">
                  <div className="h-3 w-16 bg-[var(--border-default)] rounded animate-pulse mb-2" />
                  <div className="h-6 w-16 bg-[var(--border-default)] rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`h-9 w-24 rounded-xl animate-pulse ${i === 0 ? 'bg-[var(--info-muted)]' : 'bg-[var(--bg-secondary)] border border-[var(--border-default)]'}`} />
            ))}
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-sm overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-6 gap-4 px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/50">
              <div className="h-4 w-16 bg-[var(--border-default)] rounded animate-pulse" />
              <div className="h-4 w-20 bg-[var(--border-default)] rounded animate-pulse" />
              <div className="h-4 w-24 bg-[var(--border-default)] rounded animate-pulse" />
              <div className="h-4 w-24 bg-[var(--border-default)] rounded animate-pulse" />
              <div className="h-4 w-20 bg-[var(--border-default)] rounded animate-pulse" />
              <div className="h-4 w-16 bg-[var(--border-default)] rounded animate-pulse" />
            </div>

            {/* Rows */}
            {[...Array(10)].map((_, i) => (
              <div key={i} className="grid grid-cols-6 gap-4 px-6 py-4 border-b border-[var(--border-subtle)] last:border-b-0 items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--border-default)] rounded-xl animate-pulse" />
                  <div>
                    <div className="h-4 w-20 bg-[var(--border-default)] rounded animate-pulse mb-1" />
                    <div className="h-3 w-12 bg-[var(--border-default)] rounded animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-[var(--border-default)] rounded-full animate-pulse" />
                  <div className="h-4 w-20 bg-[var(--border-default)] rounded animate-pulse" />
                </div>
                <div className="h-4 w-4 bg-[var(--border-default)] rounded animate-pulse mx-auto" />
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-[var(--border-default)] rounded-full animate-pulse" />
                  <div className="h-4 w-20 bg-[var(--border-default)] rounded animate-pulse" />
                </div>
                <div className="h-5 w-24 bg-[var(--border-default)] rounded animate-pulse" />
                <div className="h-4 w-16 bg-[var(--border-default)] rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Load More */}
          <div className="flex justify-center mt-5">
            <div className="h-10 w-28 bg-[var(--border-default)] rounded-xl animate-pulse" />
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden bg-[var(--bg-primary)] min-h-screen pb-24">
        <div className="px-4 py-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--border-default)] animate-pulse rounded-xl" />
            <div>
              <div className="flex items-center gap-2">
                <div className="h-5 w-24 bg-[var(--border-default)] rounded animate-pulse" />
                <div className="w-2 h-2 bg-[var(--success)] rounded-full animate-pulse" />
              </div>
              <div className="h-4 w-48 bg-[var(--border-default)] animate-pulse rounded mt-1" />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`h-8 w-20 rounded-lg shrink-0 animate-pulse ${i === 0 ? 'bg-[var(--info-muted)]' : 'bg-[var(--bg-secondary)] border border-[var(--border-default)]'}`} />
            ))}
          </div>

          {/* Operation Cards */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[var(--bg-secondary)] rounded-xl p-4 shadow-sm border border-[var(--border-default)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[var(--border-default)] animate-pulse rounded-xl" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-[var(--border-default)] animate-pulse rounded mb-1" />
                  <div className="h-3 w-16 bg-[var(--border-default)] animate-pulse rounded" />
                </div>
                <div className="h-4 w-16 bg-[var(--border-default)] animate-pulse rounded" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-[var(--border-default)] rounded-full animate-pulse" />
                <div className="h-3 w-20 bg-[var(--border-default)] rounded animate-pulse" />
                <div className="h-4 w-4 bg-[var(--border-default)] rounded animate-pulse" />
                <div className="w-6 h-6 bg-[var(--border-default)] rounded-full animate-pulse" />
                <div className="h-3 w-20 bg-[var(--border-default)] rounded animate-pulse" />
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-[var(--border-subtle)]">
                <div className="h-4 w-24 bg-[var(--border-default)] animate-pulse rounded" />
                <div className="h-3 w-20 bg-[var(--border-default)] animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
