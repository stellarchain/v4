export default function StatisticsLoading() {
  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block min-h-screen bg-[var(--bg-primary)]">
        <div className="mx-auto max-w-[1400px] p-4 lg:p-4">
          {/* Header Card */}
          <div className="mb-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[var(--border-default)] rounded-xl animate-pulse" />
                <div>
                  <div className="h-3 w-24 bg-[var(--border-default)] rounded animate-pulse mb-2" />
                  <div className="h-6 w-36 bg-[var(--border-default)] rounded animate-pulse mb-1" />
                  <div className="h-4 w-64 bg-[var(--border-default)] rounded animate-pulse" />
                </div>
              </div>
              <div className="flex gap-2">
                {['1D', '7D', '30D', '1Y'].map((_, i) => (
                  <div key={i} className={`h-9 w-12 rounded-lg animate-pulse ${i === 0 ? 'bg-[var(--info-muted)]' : 'bg-[var(--bg-tertiary)]'}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)] p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-[var(--info-muted)] rounded-lg animate-pulse" />
                  <div className="h-3 w-20 bg-[var(--border-default)] rounded animate-pulse" />
                </div>
                <div className="h-8 w-28 bg-[var(--border-default)] rounded animate-pulse mb-1" />
                <div className="h-4 w-20 bg-emerald-100 rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Secondary Stats Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)] p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[var(--border-default)] rounded-lg animate-pulse" />
                    <div className="h-4 w-28 bg-[var(--border-default)] rounded animate-pulse" />
                  </div>
                  <div className="h-6 w-16 bg-emerald-100 rounded-lg animate-pulse" />
                </div>

                {/* Mini Chart Placeholder */}
                <div className="h-20 bg-[var(--bg-tertiary)] rounded-xl animate-pulse mb-3" />

                {/* Stats Row */}
                <div className="flex justify-between">
                  <div>
                    <div className="h-3 w-12 bg-[var(--border-default)] rounded animate-pulse mb-1" />
                    <div className="h-5 w-16 bg-[var(--border-default)] rounded animate-pulse" />
                  </div>
                  <div>
                    <div className="h-3 w-12 bg-[var(--border-default)] rounded animate-pulse mb-1" />
                    <div className="h-5 w-16 bg-[var(--border-default)] rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Large Chart Section */}
          <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="h-5 w-32 bg-[var(--border-default)] rounded animate-pulse" />
              <div className="flex gap-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`h-8 w-16 rounded-lg animate-pulse ${i === 0 ? 'bg-[var(--info-muted)]' : 'bg-[var(--bg-tertiary)]'}`} />
                ))}
              </div>
            </div>
            <div className="h-80 bg-[var(--bg-tertiary)] rounded-xl animate-pulse" />
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
              <div className="h-5 w-32 bg-[var(--border-default)] rounded animate-pulse mb-1" />
              <div className="h-4 w-48 bg-[var(--border-default)] animate-pulse rounded" />
            </div>
          </div>

          {/* Time Range Pills */}
          <div className="flex gap-2">
            {['1D', '7D', '30D', '1Y'].map((_, i) => (
              <div key={i} className={`h-8 w-12 rounded-lg animate-pulse ${i === 0 ? 'bg-[var(--info-muted)]' : 'bg-[var(--bg-secondary)] border border-[var(--border-default)]'}`} />
            ))}
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-[var(--bg-secondary)] rounded-xl p-4 shadow-sm border border-[var(--border-default)]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-[var(--info-muted)] rounded-lg animate-pulse" />
                  <div className="h-3 w-16 bg-[var(--border-default)] rounded animate-pulse" />
                </div>
                <div className="h-6 w-20 bg-[var(--border-default)] rounded animate-pulse mb-1" />
                <div className="h-3 w-14 bg-emerald-100 rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Chart Card */}
          <div className="bg-[var(--bg-secondary)] rounded-xl p-4 shadow-sm border border-[var(--border-default)]">
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 w-28 bg-[var(--border-default)] rounded animate-pulse" />
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-6 w-10 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                ))}
              </div>
            </div>
            <div className="h-48 bg-[var(--bg-tertiary)] rounded-xl animate-pulse" />
          </div>

          {/* Secondary Stats Cards */}
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[var(--bg-secondary)] rounded-xl p-4 shadow-sm border border-[var(--border-default)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-[var(--border-default)] rounded-lg animate-pulse" />
                  <div className="h-4 w-24 bg-[var(--border-default)] rounded animate-pulse" />
                </div>
                <div className="h-5 w-14 bg-emerald-100 rounded-lg animate-pulse" />
              </div>
              <div className="h-16 bg-[var(--bg-tertiary)] rounded-xl animate-pulse mb-3" />
              <div className="flex justify-between">
                <div>
                  <div className="h-3 w-10 bg-[var(--border-default)] rounded animate-pulse mb-1" />
                  <div className="h-4 w-14 bg-[var(--border-default)] rounded animate-pulse" />
                </div>
                <div>
                  <div className="h-3 w-10 bg-[var(--border-default)] rounded animate-pulse mb-1" />
                  <div className="h-4 w-14 bg-[var(--border-default)] rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
