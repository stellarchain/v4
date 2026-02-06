export default function LedgerLoading() {
  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block min-h-screen bg-[var(--bg-primary)] ">
        <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
          {/* Header Card */}
          <div className="mb-5 rounded-2xl border border-[var(--border-default)]  bg-[var(--bg-secondary)]  p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-5">
              {/* Left: Title & Meta */}
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-10 h-10 bg-[var(--info-muted)]  rounded-xl animate-pulse" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <div className="h-3 w-12 bg-[var(--border-default)]  rounded animate-pulse" />
                    <div className="h-5 w-10 bg-[var(--info-muted)] rounded animate-pulse" />
                    <div className="h-4 w-16 bg-[var(--success-muted)] rounded animate-pulse" />
                  </div>
                  <div className="h-7 w-36 bg-[var(--border-default)]  rounded animate-pulse mb-2" />
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-32 bg-[var(--border-default)]  rounded animate-pulse" />
                    <div className="h-4 w-20 bg-[var(--info-muted)]  rounded animate-pulse" />
                    <div className="h-4 w-28 bg-[var(--border-default)]  rounded animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Right: Quick Stats */}
              <div className="flex gap-3">
                {['Transactions', 'Operations', 'Base Fee', 'Reserve'].map((_, i) => (
                  <div key={i} className="p-3 rounded-xl bg-[var(--bg-primary)]/70 border border-[var(--border-subtle)]  min-w-[90px]">
                    <div className="h-3 w-16 bg-[var(--border-default)]  rounded animate-pulse mb-2" />
                    <div className="h-6 w-12 bg-[var(--border-default)]  rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="mb-5 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)]  border border-[var(--border-default)] ">
              <div className="w-8 h-8 bg-[var(--bg-tertiary)]  rounded-lg animate-pulse" />
              <div>
                <div className="h-3 w-12 bg-[var(--border-default)]  rounded animate-pulse mb-1" />
                <div className="h-5 w-24 bg-[var(--border-default)]  rounded animate-pulse" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-3 rounded-xl bg-[var(--bg-secondary)]  border border-[var(--border-default)] ">
              <div className="text-right">
                <div className="h-3 w-8 bg-[var(--border-default)]  rounded animate-pulse mb-1 ml-auto" />
                <div className="h-5 w-24 bg-[var(--border-default)]  rounded animate-pulse" />
              </div>
              <div className="w-8 h-8 bg-[var(--bg-tertiary)]  rounded-lg animate-pulse" />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-4 px-1 border-b border-[var(--border-default)]  pb-2 mb-5">
            <div className="h-4 w-16 bg-[var(--info-muted)] rounded animate-pulse" />
            <div className="h-4 w-24 bg-[var(--border-default)]  rounded animate-pulse" />
            <div className="h-4 w-20 bg-[var(--border-default)]  rounded animate-pulse" />
          </div>

          {/* Overview Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Ledger Details */}
            <div className="lg:col-span-7 rounded-2xl border border-[var(--border-default)]  bg-[var(--bg-secondary)]  shadow-sm">
              <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                <div className="w-9 h-9 bg-[var(--info-muted)]  rounded-lg animate-pulse" />
                <div>
                  <div className="h-4 w-28 bg-[var(--border-default)]  rounded animate-pulse mb-1" />
                  <div className="h-3 w-12 bg-[var(--success-muted)] rounded animate-pulse" />
                </div>
              </div>
              <div className="p-4 space-y-3">
                {/* Hash */}
                <div className="p-3 rounded-xl bg-[var(--bg-primary)]/70 border border-[var(--border-subtle)] ">
                  <div className="h-3 w-10 bg-[var(--border-default)]  rounded animate-pulse mb-2" />
                  <div className="h-4 w-full bg-[var(--border-default)]  rounded animate-pulse" />
                </div>
                {/* Previous Hash */}
                <div className="p-3 rounded-xl bg-[var(--bg-primary)]/70 border border-[var(--border-subtle)] ">
                  <div className="h-3 w-20 bg-[var(--border-default)]  rounded animate-pulse mb-2" />
                  <div className="h-4 w-full bg-[var(--border-default)]  rounded animate-pulse" />
                </div>
                {/* Grid Stats */}
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`p-3 rounded-xl border ${i === 3 ? 'border-[var(--info)]/20 bg-[var(--info-muted)] ' : 'border-[var(--border-subtle)]  bg-[var(--bg-secondary)] '}`}>
                      <div className="h-3 w-16 bg-[var(--border-default)]  rounded animate-pulse mb-2" />
                      <div className="h-6 w-20 bg-[var(--border-default)]  rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Ledger Activity */}
            <div className="lg:col-span-5 rounded-2xl border border-[var(--border-default)]  bg-[var(--bg-secondary)]  shadow-sm">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[var(--success-muted)] rounded-lg animate-pulse" />
                  <div className="h-4 w-28 bg-[var(--border-default)]  rounded animate-pulse" />
                </div>
                <div className="h-5 w-12 bg-[var(--bg-tertiary)]  rounded animate-pulse" />
              </div>
              <div className="p-4 space-y-3">
                {/* Successful / Failed */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-[var(--success)]/20 bg-[var(--success-muted)]/50">
                    <div className="h-3 w-16 bg-[var(--success-muted)] rounded animate-pulse mb-2" />
                    <div className="h-6 w-8 bg-[var(--success-muted)] rounded animate-pulse" />
                  </div>
                  <div className="p-3 rounded-xl border border-[var(--error)]/20 bg-[var(--error-muted)]/50">
                    <div className="h-3 w-12 bg-[var(--error-muted)] rounded animate-pulse mb-2" />
                    <div className="h-6 w-6 bg-[var(--error-muted)] rounded animate-pulse" />
                  </div>
                </div>
                {/* Operations */}
                <div className="p-3 rounded-xl border border-[var(--border-subtle)]  bg-[var(--bg-primary)]/70">
                  <div className="h-3 w-20 bg-[var(--border-default)]  rounded animate-pulse mb-2" />
                  <div className="h-6 w-10 bg-[var(--border-default)]  rounded animate-pulse" />
                </div>
                {/* Total Coins */}
                <div className="p-3 rounded-xl border border-[var(--violet)]/20 bg-[var(--violet-muted)]/50">
                  <div className="h-3 w-16 bg-[var(--violet-muted)] rounded animate-pulse mb-2" />
                  <div className="h-6 w-32 bg-[var(--violet-muted)] rounded animate-pulse" />
                </div>
                {/* Fee Pool */}
                <div className="p-3 rounded-xl border border-[var(--warning)]/20 bg-[var(--warning-muted)]/50">
                  <div className="h-3 w-14 bg-[var(--warning-muted)] rounded animate-pulse mb-2" />
                  <div className="h-6 w-28 bg-[var(--warning-muted)] rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden min-h-screen bg-[var(--bg-primary)]  pb-24">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-[var(--bg-secondary)]  border-b border-[var(--border-default)]  px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[var(--info-muted)]  animate-pulse rounded-lg" />
              <div>
                <div className="w-12 h-3 bg-[var(--border-default)]  animate-pulse rounded mb-1" />
                <div className="w-24 h-5 bg-[var(--border-default)]  animate-pulse rounded" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-6 bg-[var(--success-muted)] animate-pulse rounded-full" />
            </div>
          </div>
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[var(--border-default)]  animate-pulse rounded-lg" />
              <div className="w-20 h-4 bg-[var(--border-default)]  animate-pulse rounded" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-20 h-4 bg-[var(--border-default)]  animate-pulse rounded" />
              <div className="w-7 h-7 bg-[var(--border-default)]  animate-pulse rounded-lg" />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-4 pt-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[var(--bg-secondary)]  border border-[var(--border-default)]  rounded-xl p-3">
                <div className="w-16 h-3 bg-[var(--border-default)]  animate-pulse rounded mb-2" />
                <div className="w-12 h-5 bg-[var(--border-default)]  animate-pulse rounded" />
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-[var(--border-default)]  pb-3 mb-4">
            <div className="h-4 w-16 bg-[var(--info-muted)] rounded animate-pulse" />
            <div className="h-4 w-24 bg-[var(--border-default)]  rounded animate-pulse" />
            <div className="h-4 w-20 bg-[var(--border-default)]  rounded animate-pulse" />
          </div>

          {/* Content Card */}
          <div className="bg-[var(--bg-secondary)]  rounded-2xl shadow-sm border border-[var(--border-default)]  p-4 space-y-3">
            {/* Hash */}
            <div className="p-3 bg-[var(--bg-primary)]  rounded-xl">
              <div className="w-10 h-3 bg-[var(--border-default)]  animate-pulse rounded mb-2" />
              <div className="w-full h-4 bg-[var(--border-default)]  animate-pulse rounded" />
            </div>
            {/* Previous Hash */}
            <div className="p-3 bg-[var(--bg-primary)]  rounded-xl">
              <div className="w-20 h-3 bg-[var(--border-default)]  animate-pulse rounded mb-2" />
              <div className="w-full h-4 bg-[var(--border-default)]  animate-pulse rounded" />
            </div>
            {/* Grid Stats */}
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-3 bg-[var(--bg-primary)]  rounded-xl">
                  <div className="w-14 h-3 bg-[var(--border-default)]  animate-pulse rounded mb-2" />
                  <div className="w-16 h-5 bg-[var(--border-default)]  animate-pulse rounded" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
