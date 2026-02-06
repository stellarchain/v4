export default function AssetLoading() {
  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block min-h-screen bg-[var(--bg-primary)]">
        <div className="mx-auto max-w-[1400px] px-6 py-6">
          {/* Main Grid: Left Sidebar + Right Content */}
          <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-6">
            {/* Left Sidebar */}
            <div className="space-y-4">
              {/* Asset Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--border-default)] rounded-full animate-pulse" />
                <div>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-24 bg-[var(--border-default)] rounded animate-pulse" />
                    <div className="h-4 w-12 bg-[var(--border-default)] rounded animate-pulse" />
                    <div className="h-4 w-8 bg-[var(--border-default)] rounded animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Price */}
              <div>
                <div className="h-9 w-40 bg-[var(--border-default)] rounded animate-pulse mb-2" />
                <div className="h-4 w-24 bg-[var(--border-default)] rounded animate-pulse" />
              </div>

              {/* Stats Card */}
              <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-sm divide-y divide-[var(--border-subtle)]">
                {/* Market Cap */}
                <div className="p-3 flex items-center justify-between">
                  <div className="h-3 w-20 bg-[var(--border-default)] rounded animate-pulse" />
                  <div className="h-5 w-24 bg-[var(--border-default)] rounded animate-pulse" />
                </div>
                {/* Volume */}
                <div className="p-3 grid grid-cols-2 gap-4">
                  <div>
                    <div className="h-3 w-16 bg-[var(--border-default)] rounded animate-pulse mb-2" />
                    <div className="h-5 w-20 bg-[var(--border-default)] rounded animate-pulse" />
                  </div>
                  <div>
                    <div className="h-3 w-16 bg-[var(--border-default)] rounded animate-pulse mb-2" />
                    <div className="h-5 w-16 bg-[var(--border-default)] rounded animate-pulse" />
                  </div>
                </div>
                {/* FDV */}
                <div className="p-3 flex items-center justify-between">
                  <div className="h-3 w-12 bg-[var(--border-default)] rounded animate-pulse" />
                  <div className="h-5 w-20 bg-[var(--border-default)] rounded animate-pulse" />
                </div>
                {/* Supply */}
                <div className="p-3 grid grid-cols-2 gap-4">
                  <div>
                    <div className="h-3 w-20 bg-[var(--border-default)] rounded animate-pulse mb-2" />
                    <div className="h-5 w-24 bg-[var(--border-default)] rounded animate-pulse" />
                  </div>
                  <div>
                    <div className="h-3 w-20 bg-[var(--border-default)] rounded animate-pulse mb-2" />
                    <div className="h-5 w-16 bg-[var(--border-default)] rounded animate-pulse" />
                  </div>
                </div>
                {/* Circulating Supply */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-3 w-28 bg-[var(--border-default)] rounded animate-pulse" />
                    <div className="h-3 w-12 bg-[var(--border-default)] rounded animate-pulse" />
                  </div>
                  <div className="h-2 w-full bg-[var(--border-default)] rounded-full animate-pulse mb-2" />
                  <div className="h-5 w-32 bg-[var(--border-default)] rounded animate-pulse" />
                </div>
              </div>

              {/* Links Card */}
              <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-sm p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-16 bg-[var(--border-default)] rounded animate-pulse" />
                  <div className="h-7 w-28 bg-[var(--border-default)] rounded-lg animate-pulse" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-3 w-12 bg-[var(--border-default)] rounded animate-pulse" />
                  <div className="h-7 w-24 bg-[var(--border-default)] rounded-lg animate-pulse" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                  <div className="h-3 w-16 bg-[var(--border-default)] rounded animate-pulse" />
                  <div className="h-5 w-16 bg-[var(--border-default)] rounded animate-pulse" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-3 w-20 bg-[var(--border-default)] rounded animate-pulse" />
                  <div className="h-5 w-16 bg-[var(--border-default)] rounded animate-pulse" />
                </div>
              </div>

              {/* Converter */}
              <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-sm p-3">
                <div className="h-3 w-32 bg-[var(--border-default)] rounded animate-pulse mb-3" />
                <div className="space-y-2">
                  <div className="h-10 w-full bg-[var(--bg-tertiary)] rounded-lg animate-pulse" />
                  <div className="h-10 w-full bg-[var(--bg-tertiary)] rounded-lg animate-pulse" />
                </div>
              </div>

              {/* Price Performance */}
              <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-sm p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-3 w-28 bg-[var(--border-default)] rounded animate-pulse" />
                  <div className="h-5 w-10 bg-[var(--border-default)] rounded animate-pulse" />
                </div>
                <div className="h-2 w-full bg-[var(--border-default)] rounded-full animate-pulse mb-2" />
                <div className="flex items-center justify-between">
                  <div className="h-4 w-20 bg-[var(--border-default)] rounded animate-pulse" />
                  <div className="h-4 w-20 bg-[var(--border-default)] rounded animate-pulse" />
                </div>
              </div>
            </div>

            {/* Right Content Area */}
            <div className="space-y-5 min-w-0">
              {/* Tab Navigation */}
              <div className="flex items-center gap-6 border-b border-[var(--border-default)] pb-3">
                <div className="h-4 w-12 bg-[var(--info-muted)] rounded animate-pulse" />
                <div className="h-4 w-16 bg-[var(--border-default)] rounded animate-pulse" />
                <div className="h-4 w-14 bg-[var(--border-default)] rounded animate-pulse" />
                <div className="h-4 w-12 bg-[var(--border-default)] rounded animate-pulse" />
              </div>

              {/* Chart Skeleton */}
              <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)] shadow-sm p-5">
                {/* Chart Header */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex gap-1 bg-[var(--bg-tertiary)] p-1 rounded-lg">
                      <div className="h-7 w-14 bg-[var(--bg-secondary)] rounded-md animate-pulse" />
                      <div className="h-7 w-16 bg-[var(--border-default)] rounded-md animate-pulse" />
                    </div>
                    <div className="h-4 w-20 bg-[var(--border-default)] rounded animate-pulse" />
                  </div>
                  <div className="flex gap-1 bg-[var(--bg-tertiary)] p-1 rounded-lg">
                    <div className="h-6 w-10 bg-[var(--bg-secondary)] rounded-md animate-pulse" />
                    <div className="h-6 w-10 bg-[var(--border-default)] rounded-md animate-pulse" />
                    <div className="h-6 w-10 bg-[var(--border-default)] rounded-md animate-pulse" />
                    <div className="h-6 w-10 bg-[var(--border-default)] rounded-md animate-pulse" />
                  </div>
                </div>

                {/* Chart Area */}
                <div className="w-full h-[400px] flex flex-col justify-end gap-1 px-2">
                  <div className="flex items-end justify-around h-[300px] gap-1">
                    {[65, 45, 70, 55, 80, 60, 75, 50, 85, 65, 70, 55, 60, 75, 68, 72, 58, 82, 63, 77, 55, 68, 72, 60].map((h, i) => (
                      <div key={i} className="flex flex-col items-center gap-0.5">
                        <div className="w-0.5 bg-[var(--border-default)] rounded animate-pulse" style={{ height: `${h * 0.15}px` }} />
                        <div className="w-3 bg-[var(--border-default)] rounded-sm animate-pulse" style={{ height: `${h}%` }} />
                        <div className="w-0.5 bg-[var(--border-default)] rounded animate-pulse" style={{ height: `${h * 0.1}px` }} />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-end justify-around h-[60px] gap-1">
                    {[20, 35, 25, 40, 30, 45, 28, 38, 32, 42, 26, 36, 30, 44, 34, 40, 28, 46, 32, 38, 25, 35, 40, 30].map((h, i) => (
                      <div key={i} className="w-3 bg-[var(--border-default)] rounded-sm opacity-50 animate-pulse" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Order Book Skeleton */}
              <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)] shadow-sm overflow-hidden">
                <div className="p-4 border-b border-[var(--border-subtle)] flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-24 bg-[var(--border-default)] rounded animate-pulse" />
                    <div className="flex gap-1">
                      <div className="h-6 w-6 bg-[var(--border-default)] rounded animate-pulse" />
                      <div className="h-6 w-6 bg-[var(--border-default)] rounded animate-pulse" />
                      <div className="h-6 w-6 bg-[var(--border-default)] rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-4 w-32 bg-[var(--border-default)] rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-2">
                  <div className="p-3 space-y-1">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="h-6 bg-[var(--success-muted)] rounded animate-pulse" style={{ opacity: 1 - i * 0.1 }} />
                    ))}
                  </div>
                  <div className="p-3 space-y-1 border-l border-[var(--border-subtle)]">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="h-6 bg-[var(--error-muted)] rounded animate-pulse" style={{ opacity: 1 - i * 0.1 }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden w-full bg-[var(--bg-primary)] min-h-screen pb-24">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-[var(--bg-secondary)] border-b border-[var(--border-default)]">
          <div className="px-3 py-3 flex items-center justify-between">
            <div className="w-5 h-5 bg-[var(--border-default)] animate-pulse rounded" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[var(--border-default)] animate-pulse" />
              <div className="w-14 h-5 bg-[var(--border-default)] animate-pulse rounded" />
            </div>
            <div className="w-6" />
          </div>
          <div className="px-4 pb-4">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-24 h-4 bg-[var(--border-default)] animate-pulse rounded" />
              <div className="w-8 h-4 bg-[var(--border-default)] animate-pulse rounded" />
            </div>
            <div className="flex items-center justify-between">
              <div className="w-32 h-9 bg-[var(--border-default)] animate-pulse rounded" />
              <div className="w-20 h-8 bg-[var(--border-default)] animate-pulse rounded-lg" />
            </div>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-3 py-3 space-y-3">
          {/* Chart Skeleton */}
          <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-3">
            <div className="flex gap-1 mb-3">
              {['1H', '24H', '7D', '30D', '1Y'].map((tf, i) => (
                <div key={tf} className={`px-2.5 py-1 rounded-lg text-[11px] ${i === 1 ? 'bg-[var(--text-primary)] text-white' : 'bg-[var(--bg-tertiary)]'}`}>
                  {tf}
                </div>
              ))}
            </div>
            <div className="w-full h-[200px] flex items-end justify-around gap-1">
              {[65, 45, 70, 55, 80, 60, 75, 50, 85, 65, 70, 55, 60, 75].map((h, i) => (
                <div key={i} className="w-3 bg-[var(--border-default)] rounded-sm animate-pulse" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-default)] p-3">
                <div className="h-3 w-20 bg-[var(--border-default)] rounded animate-pulse mb-2" />
                <div className="h-5 w-16 bg-[var(--border-default)] rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)]">
            <div className="flex border-b border-[var(--border-default)]">
              {['Trades', 'Holders', 'Markets'].map((tab, i) => (
                <button key={tab} className={`flex-1 py-3 text-sm font-semibold ${i === 0 ? 'text-[var(--info)] border-b-2 border-[var(--info)]' : 'text-[var(--text-muted)]'}`}>
                  {tab}
                </button>
              ))}
            </div>
            <div className="p-3 space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--border-default)] animate-pulse" />
                    <div>
                      <div className="w-20 h-4 bg-[var(--border-default)] animate-pulse rounded mb-1" />
                      <div className="w-14 h-3 bg-[var(--border-default)] animate-pulse rounded" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-16 h-4 bg-[var(--border-default)] animate-pulse rounded mb-1" />
                    <div className="w-12 h-3 bg-[var(--border-default)] animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
