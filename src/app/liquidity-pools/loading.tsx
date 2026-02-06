export default function LiquidityPoolsLoading() {
  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block min-h-screen bg-slate-50">
        <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
          {/* Header Card */}
          <div className="mb-5 rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-slate-200 rounded-xl animate-pulse" />
                <div>
                  <div className="h-3 w-24 bg-slate-200 rounded animate-pulse mb-2" />
                  <div className="h-6 w-32 bg-slate-200 rounded animate-pulse mb-1" />
                  <div className="h-4 w-56 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100 min-w-[110px]">
                  <div className="h-3 w-16 bg-sky-200 rounded animate-pulse mb-2" />
                  <div className="h-6 w-20 bg-sky-200 rounded animate-pulse" />
                </div>
                <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 min-w-[110px]">
                  <div className="h-3 w-20 bg-slate-200 rounded animate-pulse mb-2" />
                  <div className="h-6 w-24 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="flex gap-4 items-center mb-5">
            <div className="h-12 flex-1 max-w-md bg-white border border-slate-200 rounded-xl animate-pulse" />
            <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-7 gap-4 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="h-4 w-12 bg-slate-200 rounded animate-pulse col-span-2" />
              <div className="h-4 w-10 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
            </div>

            {/* Rows */}
            {[...Array(10)].map((_, i) => (
              <div key={i} className="grid grid-cols-7 gap-4 px-6 py-4 border-b border-slate-100 last:border-b-0 items-center">
                <div className="flex items-center gap-3 col-span-2">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse" />
                    <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse" />
                  </div>
                  <div>
                    <div className="h-4 w-24 bg-slate-200 rounded animate-pulse mb-1" />
                    <div className="h-3 w-12 bg-slate-200 rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" />
                <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
                <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                <div className="h-4 w-14 bg-slate-200 rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Load More */}
          <div className="flex justify-center mt-5">
            <div className="h-10 w-28 bg-slate-200 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden bg-slate-50 min-h-screen pb-24">
        <div className="px-4 py-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-200 animate-pulse rounded-xl" />
            <div>
              <div className="h-5 w-28 bg-slate-200 rounded animate-pulse mb-1" />
              <div className="h-4 w-44 bg-slate-200 animate-pulse rounded" />
            </div>
          </div>

          {/* Search */}
          <div className="h-10 w-full bg-white border border-slate-200 rounded-xl animate-pulse" />

          {/* Pool Cards */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 bg-slate-200 animate-pulse rounded-full" />
                    <div className="w-8 h-8 bg-slate-200 animate-pulse rounded-full" />
                  </div>
                  <div>
                    <div className="h-4 w-20 bg-slate-200 animate-pulse rounded mb-1" />
                    <div className="h-3 w-12 bg-slate-200 animate-pulse rounded" />
                  </div>
                </div>
                <div className="h-6 w-16 bg-sky-100 animate-pulse rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                <div>
                  <div className="h-3 w-12 bg-slate-200 animate-pulse rounded mb-1" />
                  <div className="h-4 w-20 bg-slate-200 animate-pulse rounded" />
                </div>
                <div>
                  <div className="h-3 w-12 bg-slate-200 animate-pulse rounded mb-1" />
                  <div className="h-4 w-20 bg-slate-200 animate-pulse rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
