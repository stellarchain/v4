export default function LiquidityPoolLoading() {
  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block min-h-screen bg-slate-50">
        <div className="mx-auto max-w-[1400px] px-6 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-5">
            <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-4 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
          </div>

          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 mb-5">
            <div className="flex flex-wrap items-start justify-between gap-5">
              {/* Left: Pool Identity */}
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  <div className="w-12 h-12 bg-slate-200 rounded-full animate-pulse" />
                  <div className="w-12 h-12 bg-slate-200 rounded-full animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
                    <div className="h-5 w-16 bg-sky-100 rounded animate-pulse" />
                  </div>
                  <div className="h-6 w-32 bg-slate-200 rounded animate-pulse mb-1" />
                  <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>

              {/* Right: Quick Stats */}
              <div className="flex gap-3">
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 min-w-[100px]">
                  <div className="h-3 w-12 bg-sky-200 rounded animate-pulse mb-2" />
                  <div className="h-5 w-20 bg-sky-200 rounded animate-pulse" />
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 min-w-[100px]">
                  <div className="h-3 w-16 bg-slate-200 rounded animate-pulse mb-2" />
                  <div className="h-5 w-16 bg-slate-200 rounded animate-pulse" />
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 min-w-[100px]">
                  <div className="h-3 w-20 bg-slate-200 rounded animate-pulse mb-2" />
                  <div className="h-5 w-12 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
            {/* Left: Content Area */}
            <div className="space-y-4">
              {/* Tabs */}
              <div className="flex items-center gap-6 border-b border-slate-200 pb-3">
                <div className="h-4 w-20 bg-sky-200 rounded animate-pulse" />
                <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
                <div className="h-4 w-18 bg-slate-200 rounded animate-pulse" />
              </div>

              {/* Reserves Card */}
              <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4">
                <div className="h-4 w-24 bg-slate-200 rounded animate-pulse mb-4" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse" />
                      <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
                    </div>
                    <div className="h-5 w-28 bg-slate-200 rounded animate-pulse" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse" />
                      <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
                    </div>
                    <div className="h-5 w-28 bg-slate-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Operations List */}
              <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                </div>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0">
                    <div className="w-9 h-9 bg-slate-200 rounded-lg animate-pulse" />
                    <div className="flex-1">
                      <div className="h-4 w-24 bg-slate-200 rounded animate-pulse mb-1" />
                      <div className="h-3 w-32 bg-slate-200 rounded animate-pulse" />
                    </div>
                    <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Details Sidebar */}
            <div className="space-y-4">
              {/* Pool Info Card */}
              <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                </div>
                <div className="divide-y divide-slate-100">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
                      <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Exchange Rate Card */}
              <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4">
                <div className="h-4 w-28 bg-slate-200 rounded animate-pulse mb-3" />
                <div className="h-6 w-full bg-sky-50 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden min-h-screen bg-slate-50 pb-24">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-200 animate-pulse" />
            <div className="h-6 w-28 rounded-md bg-slate-200 animate-pulse" />
          </div>
          <div className="h-9 w-24 rounded-full bg-slate-200 animate-pulse" />
        </header>

        {/* Main Content */}
        <main className="px-4 pt-4">
          {/* Meta Row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="h-7 w-28 rounded-full bg-sky-100 animate-pulse" />
            <div className="h-6 w-20 rounded-full bg-slate-200 animate-pulse" />
          </div>

          {/* Pool Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="h-3 w-16 rounded bg-slate-200 animate-pulse mb-2" />
                <div className="h-5 w-24 rounded bg-slate-200 animate-pulse" />
              </div>
              <div className="text-right">
                <div className="h-3 w-16 rounded bg-slate-200 animate-pulse mb-2" />
                <div className="h-5 w-12 rounded bg-slate-200 animate-pulse" />
              </div>
            </div>

            {/* Reserves */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
                  <div className="h-4 w-12 rounded bg-slate-200 animate-pulse" />
                </div>
                <div className="h-5 w-24 rounded bg-slate-200 animate-pulse" />
              </div>
              <div className="border-t border-dashed border-slate-200" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
                  <div className="h-4 w-12 rounded bg-slate-200 animate-pulse" />
                </div>
                <div className="h-5 w-24 rounded bg-slate-200 animate-pulse" />
              </div>
            </div>

            {/* Exchange Rate */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
                <div className="h-4 w-32 rounded bg-sky-100 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-slate-200 pb-3 mb-4">
            <div className="h-4 w-20 bg-sky-200 rounded animate-pulse" />
            <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-18 bg-slate-200 rounded animate-pulse" />
          </div>

          {/* Operations */}
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 w-20 rounded bg-slate-200 animate-pulse mb-1" />
                    <div className="h-3 w-28 rounded bg-slate-200 animate-pulse" />
                  </div>
                  <div className="h-4 w-16 rounded bg-slate-200 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
