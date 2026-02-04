export default function ProjectsLoading() {
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
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-6 w-36 bg-slate-200 rounded animate-pulse" />
                    <div className="h-5 w-16 bg-sky-100 rounded-full animate-pulse" />
                  </div>
                  <div className="h-4 w-64 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100 min-w-[110px]">
                  <div className="h-3 w-16 bg-sky-200 rounded animate-pulse mb-2" />
                  <div className="h-6 w-12 bg-sky-200 rounded animate-pulse" />
                </div>
                <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 min-w-[110px]">
                  <div className="h-3 w-20 bg-slate-200 rounded animate-pulse mb-2" />
                  <div className="h-6 w-16 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-4 items-center mb-5">
            <div className="h-12 flex-1 max-w-md bg-white border border-slate-200 rounded-xl animate-pulse" />
            <div className="flex gap-2 overflow-x-auto">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`h-10 w-24 rounded-xl shrink-0 animate-pulse ${i === 0 ? 'bg-sky-100' : 'bg-white border border-slate-200'}`} />
              ))}
            </div>
          </div>

          {/* Project Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                {/* Card Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 bg-slate-200 rounded-xl shrink-0 animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <div className="h-5 w-32 bg-slate-200 rounded animate-pulse mb-2" />
                    <div className="h-6 w-20 bg-sky-100 rounded-lg animate-pulse" />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2 mb-4">
                  <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
                </div>

                {/* SCF Award */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-5 h-5 bg-amber-200 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <div className="flex gap-2">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="w-8 h-8 bg-slate-200 rounded-lg animate-pulse" />
                    ))}
                  </div>
                  <div className="h-8 w-20 bg-sky-100 rounded-lg animate-pulse" />
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
              <div className="flex items-center gap-2">
                <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
                <div className="h-4 w-12 bg-sky-100 rounded-full animate-pulse" />
              </div>
              <div className="h-4 w-48 bg-slate-200 animate-pulse rounded mt-1" />
            </div>
          </div>

          {/* Search */}
          <div className="h-10 w-full bg-white border border-slate-200 rounded-xl animate-pulse" />

          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`h-8 w-20 rounded-lg shrink-0 animate-pulse ${i === 0 ? 'bg-sky-100' : 'bg-white border border-slate-200'}`} />
            ))}
          </div>

          {/* Project Cards */}
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 bg-slate-200 rounded-xl shrink-0 animate-pulse" />
                <div className="flex-1">
                  <div className="h-5 w-28 bg-slate-200 rounded animate-pulse mb-2" />
                  <div className="h-5 w-16 bg-sky-100 rounded-lg animate-pulse" />
                </div>
              </div>
              <div className="space-y-2 mb-3">
                <div className="h-3 w-full bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-slate-200 rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-4 h-4 bg-amber-200 rounded animate-pulse" />
                <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <div className="flex gap-2">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="w-7 h-7 bg-slate-200 rounded-lg animate-pulse" />
                  ))}
                </div>
                <div className="h-7 w-16 bg-sky-100 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
