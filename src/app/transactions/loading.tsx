export default function TransactionsLoading() {
  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block min-h-screen bg-slate-50 dark:bg-[#0a0f1a]">
        <div className="mx-auto max-w-[1600px] p-6 lg:p-8">
          {/* Header Card */}
          <div className="mb-5 rounded-2xl border border-slate-200 dark:border-gray-800/60 bg-white dark:bg-[#111827] p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-slate-200 dark:bg-gray-800 rounded-xl animate-pulse" />
                <div>
                  <div className="h-3 w-24 bg-slate-200 dark:bg-gray-800 rounded animate-pulse mb-2" />
                  <div className="h-6 w-32 bg-slate-200 dark:bg-gray-800 rounded animate-pulse mb-1" />
                  <div className="h-4 w-48 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800/30 min-w-[110px]">
                  <div className="h-3 w-16 bg-sky-200 dark:bg-sky-800/50 rounded animate-pulse mb-2" />
                  <div className="h-6 w-20 bg-sky-200 dark:bg-sky-800/50 rounded animate-pulse" />
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0a0f1a]/70 border border-slate-100 dark:border-gray-800 min-w-[110px]">
                  <div className="h-3 w-14 bg-slate-200 dark:bg-gray-800 rounded animate-pulse mb-2" />
                  <div className="h-6 w-16 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-gray-800/60 bg-white dark:bg-[#111827] shadow-sm overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-6 gap-4 px-6 py-4 border-b border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-[#0a0f1a]/50">
              <div className="h-4 w-20 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
              <div className="h-4 w-16 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
              <div className="h-4 w-24 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
              <div className="h-4 w-20 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
              <div className="h-4 w-16 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
              <div className="h-4 w-20 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
            </div>

            {/* Rows */}
            {[...Array(10)].map((_, i) => (
              <div key={i} className="grid grid-cols-6 gap-4 px-6 py-4 border-b border-slate-100 dark:border-gray-800 last:border-b-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-200 dark:bg-gray-800 rounded-lg animate-pulse" />
                  <div className="h-4 w-24 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                </div>
                <div className="h-4 w-16 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                <div className="flex gap-1">
                  <div className="h-6 w-16 bg-slate-200 dark:bg-gray-800 rounded-lg animate-pulse" />
                  <div className="h-6 w-12 bg-slate-200 dark:bg-gray-800 rounded-lg animate-pulse" />
                </div>
                <div className="h-4 w-24 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-4 w-20 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-4 w-16 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Load More */}
          <div className="flex justify-center mt-5">
            <div className="h-10 w-28 bg-slate-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden bg-slate-50 dark:bg-[#0a0f1a] min-h-screen pb-24">
        <div className="px-4 py-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-200 dark:bg-gray-800 animate-pulse rounded-xl" />
            <div>
              <div className="h-5 w-28 bg-slate-200 dark:bg-gray-800 rounded animate-pulse mb-1" />
              <div className="h-4 w-40 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
            </div>
          </div>

          {/* Cards */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#111827] rounded-xl p-4 shadow-sm border border-slate-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 dark:bg-gray-800 animate-pulse rounded-lg" />
                  <div>
                    <div className="h-4 w-24 bg-slate-200 dark:bg-gray-800 animate-pulse rounded mb-1" />
                    <div className="h-3 w-16 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="h-4 w-16 bg-slate-200 dark:bg-gray-800 animate-pulse rounded mb-1" />
                  <div className="h-3 w-20 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                </div>
              </div>
              <div className="flex gap-1">
                <div className="h-6 w-16 bg-slate-200 dark:bg-gray-800 animate-pulse rounded-lg" />
                <div className="h-6 w-12 bg-slate-200 dark:bg-gray-800 animate-pulse rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
