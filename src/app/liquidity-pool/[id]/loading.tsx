export default function LiquidityPoolLoading() {
  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block min-h-screen bg-[var(--bg-primary)]">
        <div className="mx-auto max-w-[1400px] px-6 py-6">
          {/* Header */}
          <div className="mb-5">
            <div className="flex items-center gap-4 mb-3">
              <div className="h-9 w-9 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-default)] animate-pulse" />
              <div>
                <div className="h-7 w-36 bg-[var(--bg-tertiary)] rounded-lg animate-pulse mb-1.5" />
                <div className="h-4 w-24 bg-[var(--bg-tertiary)] rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <div className="h-8 w-24 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] animate-pulse" />
                <div className="h-8 w-32 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] animate-pulse" />
              </div>
            </div>
            <div className="h-10 w-full bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] animate-pulse" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Reserve Assets Card */}
              <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] p-4">
                <div className="h-4 w-28 bg-[var(--bg-tertiary)] rounded animate-pulse mb-3" />

                <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="h-4 w-10 bg-[var(--border-default)] rounded animate-pulse" />
                    <div className="h-4 w-16 bg-[var(--border-default)] rounded animate-pulse" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-24 bg-[var(--border-default)] rounded animate-pulse" />
                    <div className="h-3 w-20 bg-[var(--border-default)] rounded animate-pulse" />
                  </div>
                </div>

                <div className="flex justify-center my-2">
                  <div className="w-7 h-7 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
                </div>

                <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="h-4 w-12 bg-[var(--border-default)] rounded animate-pulse" />
                    <div className="h-4 w-16 bg-[var(--border-default)] rounded animate-pulse" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-28 bg-[var(--border-default)] rounded animate-pulse" />
                    <div className="h-3 w-20 bg-[var(--border-default)] rounded animate-pulse" />
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                  <div className="h-3 w-20 bg-[var(--bg-tertiary)] rounded animate-pulse mb-2" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-48 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                    <div className="h-4 w-44 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Pool Information Card */}
              <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] p-4">
                <div className="h-4 w-28 bg-[var(--bg-tertiary)] rounded animate-pulse mb-3" />
                <div className="divide-y divide-[var(--border-subtle)]">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5">
                      <div className="h-3.5 w-20 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                      <div className="h-3.5 w-28 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5 min-w-0">
              {/* Tab Bar */}
              <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] px-4">
                <div className="flex items-center gap-1 py-3">
                  <div className="h-4 w-20 bg-[var(--info-muted)] rounded animate-pulse" />
                  <div className="h-4 w-16 bg-[var(--bg-tertiary)] rounded animate-pulse ml-4" />
                  <div className="h-4 w-16 bg-[var(--bg-tertiary)] rounded animate-pulse ml-4" />
                  <div className="h-4 w-24 bg-[var(--bg-tertiary)] rounded animate-pulse ml-4" />
                  <div className="h-4 w-20 bg-[var(--bg-tertiary)] rounded animate-pulse ml-4" />
                </div>
              </div>

              {/* Tab Content */}
              <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] overflow-hidden">
                <div className="p-4 border-b border-[var(--border-subtle)]">
                  <div className="h-5 w-40 bg-[var(--bg-tertiary)] rounded animate-pulse mb-1.5" />
                  <div className="h-3 w-32 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-[var(--bg-tertiary)]">
                      <div className="h-3 w-28 bg-[var(--border-default)] rounded animate-pulse mb-2" />
                      <div className="h-6 w-32 bg-[var(--border-default)] rounded animate-pulse mb-1" />
                      <div className="h-4 w-24 bg-[var(--border-default)] rounded animate-pulse" />
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--bg-tertiary)]">
                      <div className="h-3 w-28 bg-[var(--border-default)] rounded animate-pulse mb-2" />
                      <div className="h-6 w-20 bg-[var(--border-default)] rounded animate-pulse mb-1" />
                      <div className="h-4 w-16 bg-[var(--border-default)] rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden min-h-screen bg-[var(--bg-primary)] pb-24">
        <header className="sticky top-0 z-10 bg-[var(--bg-secondary)] border-b border-[var(--border-default)] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
            <div className="h-6 w-28 rounded-md bg-[var(--bg-tertiary)] animate-pulse" />
          </div>
          <div className="h-9 w-24 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
        </header>

        <main className="px-4 pt-4">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="h-7 w-28 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
            <div className="h-6 w-20 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
          </div>

          <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)] p-4 mb-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="h-3 w-16 rounded bg-[var(--bg-tertiary)] animate-pulse mb-2" />
                <div className="h-5 w-24 rounded bg-[var(--bg-tertiary)] animate-pulse" />
              </div>
              <div className="text-right">
                <div className="h-3 w-16 rounded bg-[var(--bg-tertiary)] animate-pulse mb-2" />
                <div className="h-5 w-12 rounded bg-[var(--bg-tertiary)] animate-pulse" />
              </div>
            </div>

            <div className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-12 rounded bg-[var(--border-default)] animate-pulse" />
                <div className="h-5 w-24 rounded bg-[var(--border-default)] animate-pulse" />
              </div>
              <div className="border-t border-dashed border-[var(--border-subtle)]" />
              <div className="flex items-center justify-between">
                <div className="h-4 w-12 rounded bg-[var(--border-default)] animate-pulse" />
                <div className="h-5 w-24 rounded bg-[var(--border-default)] animate-pulse" />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                <div className="h-4 w-32 rounded bg-[var(--bg-tertiary)] animate-pulse" />
              </div>
            </div>
          </div>

          <div className="flex gap-4 border-b border-[var(--border-subtle)] pb-3 mb-4">
            <div className="h-4 w-20 bg-[var(--info-muted)] rounded animate-pulse" />
            <div className="h-4 w-16 bg-[var(--bg-tertiary)] rounded animate-pulse" />
            <div className="h-4 w-18 bg-[var(--bg-tertiary)] rounded animate-pulse" />
          </div>

          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 w-20 rounded bg-[var(--bg-tertiary)] animate-pulse mb-1" />
                    <div className="h-3 w-28 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                  </div>
                  <div className="h-4 w-16 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
