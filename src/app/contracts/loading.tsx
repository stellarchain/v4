export default function ContractsLoading() {
  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block min-h-screen bg-slate-50">
        <div className="mx-auto max-w-[1600px] p-6 lg:p-8">
          {/* Header Card */}
          <div className="mb-5 rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-slate-200 rounded-xl animate-pulse" />
                <div>
                  <div className="h-3 w-20 bg-slate-200 rounded animate-pulse mb-2" />
                  <div className="h-6 w-28 bg-slate-200 rounded animate-pulse mb-1" />
                  <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100 min-w-[110px]">
                  <div className="h-3 w-20 bg-sky-200 rounded animate-pulse mb-2" />
                  <div className="h-6 w-16 bg-sky-200 rounded animate-pulse" />
                </div>
                <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 min-w-[110px]">
                  <div className="h-3 w-16 bg-slate-200 rounded animate-pulse mb-2" />
                  <div className="h-6 w-20 bg-slate-200 rounded animate-pulse" />
                </div>
                <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 min-w-[110px]">
                  <div className="h-3 w-14 bg-slate-200 rounded animate-pulse mb-2" />
                  <div className="h-6 w-12 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-4 items-center mb-5">
            <div className="h-12 flex-1 max-w-md bg-white border border-slate-200 rounded-xl animate-pulse" />
            <div className="flex gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 w-20 bg-white border border-slate-200 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>

          {/* Contract Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-200 rounded-xl animate-pulse" />
                    <div>
                      <div className="h-5 w-32 bg-slate-200 rounded animate-pulse mb-1" />
                      <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-6 w-16 bg-emerald-100 rounded-lg animate-pulse" />
                </div>

                {/* Contract ID */}
                <div className="h-4 w-full bg-slate-100 rounded animate-pulse mb-4" />

                {/* Stats Row */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <div>
                    <div className="h-3 w-16 bg-slate-200 rounded animate-pulse mb-1" />
                    <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" />
                  </div>
                  <div>
                    <div className="h-3 w-16 bg-slate-200 rounded animate-pulse mb-1" />
                    <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                  </div>
                </div>
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
              <div className="h-5 w-24 bg-slate-200 rounded animate-pulse mb-1" />
              <div className="h-4 w-40 bg-slate-200 animate-pulse rounded" />
            </div>
          </div>

          {/* Search */}
          <div className="h-10 w-full bg-white border border-slate-200 rounded-xl animate-pulse" />

          {/* Contract Cards */}
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 animate-pulse rounded-xl" />
                  <div>
                    <div className="h-4 w-28 bg-slate-200 animate-pulse rounded mb-1" />
                    <div className="h-3 w-16 bg-slate-200 animate-pulse rounded" />
                  </div>
                </div>
                <div className="h-5 w-14 bg-emerald-100 animate-pulse rounded-lg" />
              </div>
              <div className="h-3 w-full bg-slate-100 rounded animate-pulse mb-3" />
              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <div className="h-3 w-20 bg-slate-200 animate-pulse rounded" />
                <div className="h-3 w-16 bg-slate-200 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
