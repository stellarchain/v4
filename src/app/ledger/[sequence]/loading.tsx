export default function LedgerLoading() {
  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block min-h-screen bg-slate-50 dark:bg-[#0a0f1a]">
        <div className="mx-auto max-w-[1600px] p-6 lg:p-8">
          {/* Header Card */}
          <div className="mb-5 rounded-2xl border border-slate-200 dark:border-gray-800/60 bg-white dark:bg-[#111827] p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-5">
              {/* Left: Title & Meta */}
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-xl animate-pulse" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <div className="h-3 w-12 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                    <div className="h-5 w-10 bg-sky-200 dark:bg-sky-800/50 rounded animate-pulse" />
                    <div className="h-4 w-16 bg-emerald-100 dark:bg-emerald-900/30 rounded animate-pulse" />
                  </div>
                  <div className="h-7 w-36 bg-slate-200 dark:bg-gray-800 rounded animate-pulse mb-2" />
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-32 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                    <div className="h-4 w-20 bg-sky-100 dark:bg-sky-900/30 rounded animate-pulse" />
                    <div className="h-4 w-28 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Right: Quick Stats */}
              <div className="flex gap-3">
                {['Transactions', 'Operations', 'Base Fee', 'Reserve'].map((_, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-[#0a0f1a]/70 border border-slate-100 dark:border-gray-800 min-w-[90px]">
                    <div className="h-3 w-16 bg-slate-200 dark:bg-gray-800 rounded animate-pulse mb-2" />
                    <div className="h-6 w-12 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="mb-5 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-gray-800/60">
              <div className="w-8 h-8 bg-slate-100 dark:bg-gray-800 rounded-lg animate-pulse" />
              <div>
                <div className="h-3 w-12 bg-slate-200 dark:bg-gray-800 rounded animate-pulse mb-1" />
                <div className="h-5 w-24 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-3 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-gray-800/60">
              <div className="text-right">
                <div className="h-3 w-8 bg-slate-200 dark:bg-gray-800 rounded animate-pulse mb-1 ml-auto" />
                <div className="h-5 w-24 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
              </div>
              <div className="w-8 h-8 bg-slate-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-4 px-1 border-b border-slate-200 dark:border-gray-800/60 pb-2 mb-5">
            <div className="h-4 w-16 bg-sky-200 dark:bg-sky-800/50 rounded animate-pulse" />
            <div className="h-4 w-24 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-4 w-20 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
          </div>

          {/* Overview Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Ledger Details */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-gray-800/60 bg-white dark:bg-[#111827] shadow-sm">
              <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                <div className="w-9 h-9 bg-sky-100 dark:bg-sky-900/30 rounded-lg animate-pulse" />
                <div>
                  <div className="h-4 w-28 bg-slate-200 dark:bg-gray-800 rounded animate-pulse mb-1" />
                  <div className="h-3 w-12 bg-emerald-100 dark:bg-emerald-900/30 rounded animate-pulse" />
                </div>
              </div>
              <div className="p-4 space-y-3">
                {/* Hash */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0a0f1a]/70 border border-slate-100 dark:border-gray-800">
                  <div className="h-3 w-10 bg-slate-200 dark:bg-gray-800 rounded animate-pulse mb-2" />
                  <div className="h-4 w-full bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                </div>
                {/* Previous Hash */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0a0f1a]/70 border border-slate-100 dark:border-gray-800">
                  <div className="h-3 w-20 bg-slate-200 dark:bg-gray-800 rounded animate-pulse mb-2" />
                  <div className="h-4 w-full bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                </div>
                {/* Grid Stats */}
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`p-3 rounded-xl border ${i === 3 ? 'border-sky-100 bg-sky-50/50 dark:bg-sky-900/20' : 'border-slate-100 dark:border-gray-800 bg-white dark:bg-[#111827]'}`}>
                      <div className="h-3 w-16 bg-slate-200 dark:bg-gray-800 rounded animate-pulse mb-2" />
                      <div className="h-6 w-20 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Ledger Activity */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-gray-800/60 bg-white dark:bg-[#111827] shadow-sm">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg animate-pulse" />
                  <div className="h-4 w-28 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                </div>
                <div className="h-5 w-12 bg-slate-100 dark:bg-gray-800 rounded animate-pulse" />
              </div>
              <div className="p-4 space-y-3">
                {/* Successful / Failed */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/30 bg-emerald-50/50 dark:bg-emerald-900/20">
                    <div className="h-3 w-16 bg-emerald-200 dark:bg-emerald-800/50 rounded animate-pulse mb-2" />
                    <div className="h-6 w-8 bg-emerald-200 dark:bg-emerald-800/50 rounded animate-pulse" />
                  </div>
                  <div className="p-3 rounded-xl border border-rose-100 dark:border-rose-800/30 bg-rose-50/50 dark:bg-rose-900/20">
                    <div className="h-3 w-12 bg-rose-200 dark:bg-rose-800/50 rounded animate-pulse mb-2" />
                    <div className="h-6 w-6 bg-rose-200 dark:bg-rose-800/50 rounded animate-pulse" />
                  </div>
                </div>
                {/* Operations */}
                <div className="p-3 rounded-xl border border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-[#0a0f1a]/70">
                  <div className="h-3 w-20 bg-slate-200 dark:bg-gray-800 rounded animate-pulse mb-2" />
                  <div className="h-6 w-10 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
                </div>
                {/* Total Coins */}
                <div className="p-3 rounded-xl border border-violet-100 dark:border-violet-800/30 bg-violet-50/50 dark:bg-violet-900/20">
                  <div className="h-3 w-16 bg-violet-200 dark:bg-violet-800/50 rounded animate-pulse mb-2" />
                  <div className="h-6 w-32 bg-violet-200 dark:bg-violet-800/50 rounded animate-pulse" />
                </div>
                {/* Fee Pool */}
                <div className="p-3 rounded-xl border border-amber-100 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-900/20">
                  <div className="h-3 w-14 bg-amber-200 dark:bg-amber-800/50 rounded animate-pulse mb-2" />
                  <div className="h-6 w-28 bg-amber-200 dark:bg-amber-800/50 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden min-h-screen bg-slate-50 dark:bg-[#0a0f1a] pb-24">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-gray-800 px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-sky-100 dark:bg-sky-900/30 animate-pulse rounded-lg" />
              <div>
                <div className="w-12 h-3 bg-slate-200 dark:bg-gray-800 animate-pulse rounded mb-1" />
                <div className="w-24 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-6 bg-emerald-100 dark:bg-emerald-900/30 animate-pulse rounded-full" />
            </div>
          </div>
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-slate-200 dark:bg-gray-800 animate-pulse rounded-lg" />
              <div className="w-20 h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-20 h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
              <div className="w-7 h-7 bg-slate-200 dark:bg-gray-800 animate-pulse rounded-lg" />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-4 pt-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-gray-800 rounded-xl p-3">
                <div className="w-16 h-3 bg-slate-200 dark:bg-gray-800 animate-pulse rounded mb-2" />
                <div className="w-12 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-slate-200 dark:border-gray-800 pb-3 mb-4">
            <div className="h-4 w-16 bg-sky-200 dark:bg-sky-800/50 rounded animate-pulse" />
            <div className="h-4 w-24 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-4 w-20 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
          </div>

          {/* Content Card */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 p-4 space-y-3">
            {/* Hash */}
            <div className="p-3 bg-slate-50 dark:bg-[#0a0f1a] rounded-xl">
              <div className="w-10 h-3 bg-slate-200 dark:bg-gray-800 animate-pulse rounded mb-2" />
              <div className="w-full h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
            </div>
            {/* Previous Hash */}
            <div className="p-3 bg-slate-50 dark:bg-[#0a0f1a] rounded-xl">
              <div className="w-20 h-3 bg-slate-200 dark:bg-gray-800 animate-pulse rounded mb-2" />
              <div className="w-full h-4 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
            </div>
            {/* Grid Stats */}
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-3 bg-slate-50 dark:bg-[#0a0f1a] rounded-xl">
                  <div className="w-14 h-3 bg-slate-200 dark:bg-gray-800 animate-pulse rounded mb-2" />
                  <div className="w-16 h-5 bg-slate-200 dark:bg-gray-800 animate-pulse rounded" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
