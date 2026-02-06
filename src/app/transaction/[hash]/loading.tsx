export default function TransactionLoading() {
  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block min-h-screen bg-[var(--bg-primary)] ">
        <div className="mx-auto max-w-[1400px] px-4 py-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-4">
            <div className="h-4 w-20 bg-[var(--border-default)]  rounded animate-pulse" />
            <div className="h-4 w-4 bg-[var(--border-default)]  rounded animate-pulse" />
            <div className="h-4 w-32 bg-[var(--border-default)]  rounded animate-pulse" />
          </div>

          {/* Header Card */}
          <div className="bg-[var(--bg-secondary)]  rounded-2xl border border-[var(--border-default)]  shadow-sm p-4 mb-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              {/* Left: Transaction Identity */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[var(--border-default)]  rounded-xl animate-pulse" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-3 w-20 bg-[var(--border-default)]  rounded animate-pulse" />
                    <div className="h-5 w-16 bg-[var(--success-muted)] rounded animate-pulse" />
                  </div>
                  <div className="h-6 w-48 bg-[var(--border-default)]  rounded animate-pulse" />
                </div>
              </div>

              {/* Right: Quick Stats */}
              <div className="flex gap-3">
                <div className="p-3 rounded-xl bg-[var(--bg-primary)]  border border-[var(--border-subtle)]  min-w-[100px]">
                  <div className="h-3 w-12 bg-[var(--border-default)]  rounded animate-pulse mb-2" />
                  <div className="h-5 w-20 bg-[var(--border-default)]  rounded animate-pulse" />
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-primary)]  border border-[var(--border-subtle)]  min-w-[100px]">
                  <div className="h-3 w-16 bg-[var(--border-default)]  rounded animate-pulse mb-2" />
                  <div className="h-5 w-16 bg-[var(--border-default)]  rounded animate-pulse" />
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-primary)]  border border-[var(--border-subtle)]  min-w-[100px]">
                  <div className="h-3 w-12 bg-[var(--border-default)]  rounded animate-pulse mb-2" />
                  <div className="h-5 w-24 bg-[var(--border-default)]  rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
            {/* Left: Operations */}
            <div className="space-y-4">
              {/* Tabs */}
              <div className="flex items-center gap-4 border-b border-[var(--border-default)]  pb-3">
                <div className="h-4 w-20 bg-[var(--info-muted)] rounded animate-pulse" />
                <div className="h-4 w-16 bg-[var(--border-default)]  rounded animate-pulse" />
                <div className="h-4 w-14 bg-[var(--border-default)]  rounded animate-pulse" />
              </div>

              {/* Operations List */}
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-[var(--bg-secondary)]  rounded-xl border border-[var(--border-default)]  shadow-sm p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--border-default)]  animate-pulse" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-5 w-12 bg-[var(--border-default)]  rounded animate-pulse" />
                          <div className="h-4 w-24 bg-[var(--border-default)]  rounded animate-pulse" />
                        </div>
                        <div className="h-3 w-40 bg-[var(--border-default)]  rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="bg-[var(--bg-primary)]  rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="h-3 w-12 bg-[var(--border-default)]  rounded animate-pulse" />
                        <div className="h-4 w-32 bg-[var(--border-default)]  rounded animate-pulse" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="h-3 w-8 bg-[var(--border-default)]  rounded animate-pulse" />
                        <div className="h-4 w-32 bg-[var(--border-default)]  rounded animate-pulse" />
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-default)] ">
                        <div className="h-3 w-16 bg-[var(--border-default)]  rounded animate-pulse" />
                        <div className="h-5 w-28 bg-[var(--border-default)]  rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Details Sidebar */}
            <div className="space-y-4">
              {/* Transaction Info Card */}
              <div className="bg-[var(--bg-secondary)]  rounded-xl border border-[var(--border-default)]  shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border-subtle)] ">
                  <div className="h-4 w-32 bg-[var(--border-default)]  rounded animate-pulse" />
                </div>
                <div className="divide-y divide-[var(--border-subtle)]">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <div className="h-3 w-20 bg-[var(--border-default)]  rounded animate-pulse" />
                      <div className="h-4 w-24 bg-[var(--border-default)]  rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Accounts Card */}
              <div className="bg-[var(--bg-secondary)]  rounded-xl border border-[var(--border-default)]  shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border-subtle)] ">
                  <div className="h-4 w-24 bg-[var(--border-default)]  rounded animate-pulse" />
                </div>
                <div className="divide-y divide-[var(--border-subtle)]">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <div className="h-3 w-16 bg-[var(--border-default)]  rounded animate-pulse" />
                      <div className="h-4 w-28 bg-[var(--border-default)]  rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden min-h-screen bg-[var(--bg-primary)]  pb-24">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-[var(--bg-secondary)]  border-b border-[var(--border-default)]  px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[var(--border-default)]  animate-pulse" />
            <div className="h-6 w-28 rounded-md bg-[var(--border-default)]  animate-pulse" />
          </div>
          <div className="h-9 w-24 rounded-full bg-[var(--border-default)]  animate-pulse" />
        </header>

        {/* Main Content */}
        <main className="px-4 pt-4">
          {/* Meta Row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="h-4 w-24 rounded bg-[var(--border-default)]  animate-pulse" />
            <div className="h-5 w-20 rounded-full bg-[var(--success-muted)] animate-pulse" />
            <div className="h-5 w-24 rounded-full bg-[var(--border-default)]  animate-pulse" />
          </div>

          {/* Transaction Card */}
          <div className="bg-[var(--bg-secondary)]  rounded-2xl shadow-sm border border-[var(--border-default)]  p-4 mb-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="h-3 w-20 rounded bg-[var(--border-default)]  animate-pulse mb-2" />
                <div className="h-5 w-28 rounded bg-[var(--border-default)]  animate-pulse" />
              </div>
              <div className="text-right">
                <div className="h-3 w-12 rounded bg-[var(--border-default)]  animate-pulse mb-2" />
                <div className="h-4 w-20 rounded bg-[var(--border-default)]  animate-pulse" />
              </div>
            </div>

            {/* Summary Card */}
            <div className="bg-[var(--bg-primary)]  border border-[var(--border-default)]  rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--border-default)]  animate-pulse" />
                  <div className="h-3 w-12 rounded bg-[var(--border-default)]  animate-pulse" />
                </div>
                <div className="text-right">
                  <div className="h-4 w-24 rounded bg-[var(--border-default)]  animate-pulse mb-1" />
                  <div className="h-3 w-10 rounded bg-[var(--border-default)]  animate-pulse" />
                </div>
              </div>
              <div className="flex justify-center">
                <div className="w-6 h-6 rounded-full bg-[var(--border-default)]  animate-pulse" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--border-default)]  animate-pulse" />
                  <div className="h-3 w-16 rounded bg-[var(--border-default)]  animate-pulse" />
                </div>
                <div className="text-right">
                  <div className="h-4 w-20 rounded bg-[var(--border-default)]  animate-pulse mb-1" />
                  <div className="h-3 w-10 rounded bg-[var(--border-default)]  animate-pulse" />
                </div>
              </div>
            </div>

            {/* Fee */}
            <div className="mt-4 pt-4 border-t border-[var(--border-default)] ">
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 rounded bg-[var(--border-default)]  animate-pulse" />
                <div className="h-3 w-24 rounded bg-[var(--border-default)]  animate-pulse" />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-[var(--border-default)]  pb-3 mb-4">
            {['Operations', 'Effects', 'Details'].map((tab, i) => (
              <div key={tab} className={`h-4 rounded animate-pulse ${i === 0 ? 'w-20 bg-[var(--info-muted)]' : 'w-16 bg-[var(--border-default)]'}`} />
            ))}
          </div>

          {/* Operations */}
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-[var(--bg-secondary)]  rounded-2xl shadow-sm border border-[var(--border-default)]  p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--border-default)]  animate-pulse" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-5 w-12 rounded bg-[var(--border-default)]  animate-pulse" />
                      <div className="h-4 w-20 rounded bg-[var(--border-default)]  animate-pulse" />
                    </div>
                    <div className="h-3 w-32 rounded bg-[var(--border-default)]  animate-pulse" />
                  </div>
                </div>
                <div className="bg-[var(--bg-primary)]  rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-10 rounded bg-[var(--border-default)]  animate-pulse" />
                    <div className="h-3 w-28 rounded bg-[var(--border-default)]  animate-pulse" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-8 rounded bg-[var(--border-default)]  animate-pulse" />
                    <div className="h-3 w-28 rounded bg-[var(--border-default)]  animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
