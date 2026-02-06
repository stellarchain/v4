export default function AssetLoading() {
  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block min-h-screen bg-slate-50">
        <div className="mx-auto max-w-[1400px] px-6 py-6">
          {/* Main Grid: Left Sidebar + Right Content */}
          <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-6">
            {/* Left Sidebar */}
            <div className="space-y-4">
              {/* Asset Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse" />
                <div>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-24 bg-slate-200 rounded animate-pulse" />
                    <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" />
                    <div className="h-4 w-8 bg-slate-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Price */}
              <div>
                <div className="h-9 w-40 bg-slate-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
              </div>

              {/* Stats Card */}
              <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm divide-y divide-slate-100">
                {/* Market Cap */}
                <div className="p-3 flex items-center justify-between">
                  <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
                  <div className="h-5 w-24 bg-slate-200 rounded animate-pulse" />
                </div>
                {/* Volume */}
                <div className="p-3 grid grid-cols-2 gap-4">
                  <div>
                    <div className="h-3 w-16 bg-slate-200 rounded animate-pulse mb-2" />
                    <div className="h-5 w-20 bg-slate-200 rounded animate-pulse" />
                  </div>
                  <div>
                    <div className="h-3 w-16 bg-slate-200 rounded animate-pulse mb-2" />
                    <div className="h-5 w-16 bg-slate-200 rounded animate-pulse" />
                  </div>
                </div>
                {/* FDV */}
                <div className="p-3 flex items-center justify-between">
                  <div className="h-3 w-12 bg-slate-200 rounded animate-pulse" />
                  <div className="h-5 w-20 bg-slate-200 rounded animate-pulse" />
                </div>
                {/* Supply */}
                <div className="p-3 grid grid-cols-2 gap-4">
                  <div>
                    <div className="h-3 w-20 bg-slate-200 rounded animate-pulse mb-2" />
                    <div className="h-5 w-24 bg-slate-200 rounded animate-pulse" />
                  </div>
                  <div>
                    <div className="h-3 w-20 bg-slate-200 rounded animate-pulse mb-2" />
                    <div className="h-5 w-16 bg-slate-200 rounded animate-pulse" />
                  </div>
                </div>
                {/* Circulating Supply */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-3 w-28 bg-slate-200 rounded animate-pulse" />
                    <div className="h-3 w-12 bg-slate-200 rounded animate-pulse" />
                  </div>
                  <div className="h-2 w-full bg-slate-200 rounded-full animate-pulse mb-2" />
                  <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>

              {/* Links Card */}
              <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
                  <div className="h-7 w-28 bg-slate-200 rounded-lg animate-pulse" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-3 w-12 bg-slate-200 rounded animate-pulse" />
                  <div className="h-7 w-24 bg-slate-200 rounded-lg animate-pulse" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
                  <div className="h-5 w-16 bg-slate-200 rounded animate-pulse" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
                  <div className="h-5 w-16 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>

              {/* Converter */}
              <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-3">
                <div className="h-3 w-32 bg-slate-200 rounded animate-pulse mb-3" />
                <div className="space-y-2">
                  <div className="h-10 w-full bg-slate-100 rounded-lg animate-pulse" />
                  <div className="h-10 w-full bg-slate-100 rounded-lg animate-pulse" />
                </div>
              </div>

              {/* Price Performance */}
              <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-3 w-28 bg-slate-200 rounded animate-pulse" />
                  <div className="h-5 w-10 bg-slate-200 rounded animate-pulse" />
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full animate-pulse mb-2" />
                <div className="flex items-center justify-between">
                  <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                  <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
            </div>

            {/* Right Content Area */}
            <div className="space-y-5 min-w-0">
              {/* Tab Navigation */}
              <div className="flex items-center gap-6 border-b border-slate-200 pb-3">
                <div className="h-4 w-12 bg-sky-200 rounded animate-pulse" />
                <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
                <div className="h-4 w-14 bg-slate-200 rounded animate-pulse" />
                <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" />
              </div>

              {/* Chart Skeleton */}
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
                {/* Chart Header */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                      <div className="h-7 w-14 bg-white rounded-md animate-pulse" />
                      <div className="h-7 w-16 bg-slate-200 rounded-md animate-pulse" />
                    </div>
                    <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                  </div>
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                    <div className="h-6 w-10 bg-white rounded-md animate-pulse" />
                    <div className="h-6 w-10 bg-slate-200 rounded-md animate-pulse" />
                    <div className="h-6 w-10 bg-slate-200 rounded-md animate-pulse" />
                    <div className="h-6 w-10 bg-slate-200 rounded-md animate-pulse" />
                  </div>
                </div>

                {/* Chart Area */}
                <div className="w-full h-[400px] flex flex-col justify-end gap-1 px-2">
                  <div className="flex items-end justify-around h-[300px] gap-1">
                    {[65, 45, 70, 55, 80, 60, 75, 50, 85, 65, 70, 55, 60, 75, 68, 72, 58, 82, 63, 77, 55, 68, 72, 60].map((h, i) => (
                      <div key={i} className="flex flex-col items-center gap-0.5">
                        <div className="w-0.5 bg-slate-200 rounded animate-pulse" style={{ height: `${h * 0.15}px` }} />
                        <div className="w-3 bg-slate-200 rounded-sm animate-pulse" style={{ height: `${h}%` }} />
                        <div className="w-0.5 bg-slate-200 rounded animate-pulse" style={{ height: `${h * 0.1}px` }} />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-end justify-around h-[60px] gap-1">
                    {[20, 35, 25, 40, 30, 45, 28, 38, 32, 42, 26, 36, 30, 44, 34, 40, 28, 46, 32, 38, 25, 35, 40, 30].map((h, i) => (
                      <div key={i} className="w-3 bg-slate-200 rounded-sm opacity-50 animate-pulse" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Order Book Skeleton */}
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-24 bg-slate-200 rounded animate-pulse" />
                    <div className="flex gap-1">
                      <div className="h-6 w-6 bg-slate-200 rounded animate-pulse" />
                      <div className="h-6 w-6 bg-slate-200 rounded animate-pulse" />
                      <div className="h-6 w-6 bg-slate-200 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-2">
                  <div className="p-3 space-y-1">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="h-6 bg-emerald-50 rounded animate-pulse" style={{ opacity: 1 - i * 0.1 }} />
                    ))}
                  </div>
                  <div className="p-3 space-y-1 border-l border-slate-100">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="h-6 bg-rose-50 rounded animate-pulse" style={{ opacity: 1 - i * 0.1 }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden w-full bg-slate-50 min-h-screen pb-24">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
          <div className="px-3 py-3 flex items-center justify-between">
            <div className="w-5 h-5 bg-slate-200 animate-pulse rounded" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-200 animate-pulse" />
              <div className="w-14 h-5 bg-slate-200 animate-pulse rounded" />
            </div>
            <div className="w-6" />
          </div>
          <div className="px-4 pb-4">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-24 h-4 bg-slate-200 animate-pulse rounded" />
              <div className="w-8 h-4 bg-slate-200 animate-pulse rounded" />
            </div>
            <div className="flex items-center justify-between">
              <div className="w-32 h-9 bg-slate-200 animate-pulse rounded" />
              <div className="w-20 h-8 bg-slate-200 animate-pulse rounded-lg" />
            </div>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-3 py-3 space-y-3">
          {/* Chart Skeleton */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3">
            <div className="flex gap-1 mb-3">
              {['1H', '24H', '7D', '30D', '1Y'].map((tf, i) => (
                <div key={tf} className={`px-2.5 py-1 rounded-lg text-[11px] ${i === 1 ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>
                  {tf}
                </div>
              ))}
            </div>
            <div className="w-full h-[200px] flex items-end justify-around gap-1">
              {[65, 45, 70, 55, 80, 60, 75, 50, 85, 65, 70, 55, 60, 75].map((h, i) => (
                <div key={i} className="w-3 bg-slate-200 rounded-sm animate-pulse" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
                <div className="h-3 w-20 bg-slate-200 rounded animate-pulse mb-2" />
                <div className="h-5 w-16 bg-slate-200 rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="flex border-b border-slate-200">
              {['Trades', 'Holders', 'Markets'].map((tab, i) => (
                <button key={tab} className={`flex-1 py-3 text-sm font-semibold ${i === 0 ? 'text-sky-600 border-b-2 border-sky-600' : 'text-slate-400'}`}>
                  {tab}
                </button>
              ))}
            </div>
            <div className="p-3 space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
                    <div>
                      <div className="w-20 h-4 bg-slate-200 animate-pulse rounded mb-1" />
                      <div className="w-14 h-3 bg-slate-200 animate-pulse rounded" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-16 h-4 bg-slate-200 animate-pulse rounded mb-1" />
                    <div className="w-12 h-3 bg-slate-200 animate-pulse rounded" />
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
