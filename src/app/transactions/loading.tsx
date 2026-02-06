import SkeletonBlock from '@/components/ui/SkeletonBlock';

export default function TransactionsLoading() {
  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block min-h-screen bg-[var(--bg-primary)] ">
        <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
          {/* Header Card */}
          <div className="mb-5 rounded-2xl border border-[var(--border-default)]  bg-[var(--bg-secondary)]  p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex items-start gap-4">
                <SkeletonBlock className="w-10 h-10" rounded="xl" />
                <div>
                  <SkeletonBlock className="h-3 w-24 mb-2" />
                  <SkeletonBlock className="h-6 w-32 mb-1" />
                  <SkeletonBlock className="h-4 w-48" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="p-3 rounded-xl bg-[var(--info-muted)] border border-[var(--info)]/20  min-w-[110px]">
                  <SkeletonBlock className="h-3 w-16 mb-2" />
                  <SkeletonBlock className="h-6 w-20" />
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-primary)]/70 border border-[var(--border-subtle)]  min-w-[110px]">
                  <SkeletonBlock className="h-3 w-14 mb-2" />
                  <SkeletonBlock className="h-6 w-16" />
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-[var(--border-default)]  bg-[var(--bg-secondary)]  shadow-sm overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-6 gap-4 px-6 py-4 border-b border-[var(--border-subtle)]  bg-[var(--bg-primary)]/50">
              <SkeletonBlock className="h-4 w-20" />
              <SkeletonBlock className="h-4 w-16" />
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-4 w-20" />
              <SkeletonBlock className="h-4 w-16" />
              <SkeletonBlock className="h-4 w-20" />
            </div>

            {/* Rows */}
            {[...Array(10)].map((_, i) => (
              <div key={i} className="grid grid-cols-6 gap-4 px-6 py-4 border-b border-[var(--border-subtle)]  last:border-b-0">
                <div className="flex items-center gap-2">
                  <SkeletonBlock className="w-8 h-8" rounded="lg" />
                  <SkeletonBlock className="h-4 w-24" />
                </div>
                <SkeletonBlock className="h-4 w-16" />
                <div className="flex gap-1">
                  <SkeletonBlock className="h-6 w-16" rounded="lg" />
                  <SkeletonBlock className="h-6 w-12" rounded="lg" />
                </div>
                <SkeletonBlock className="h-4 w-24" />
                <SkeletonBlock className="h-4 w-20" />
                <SkeletonBlock className="h-4 w-16" />
              </div>
            ))}
          </div>

          {/* Load More */}
          <div className="flex justify-center mt-5">
            <SkeletonBlock className="h-10 w-28" rounded="xl" />
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden bg-[var(--bg-primary)]  min-h-screen pb-24">
        <div className="px-4 py-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <SkeletonBlock className="w-10 h-10" rounded="xl" />
            <div>
              <SkeletonBlock className="h-5 w-28 mb-1" />
              <SkeletonBlock className="h-4 w-40" />
            </div>
          </div>

          {/* Cards */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[var(--bg-secondary)]  rounded-xl p-4 shadow-sm border border-[var(--border-default)] ">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <SkeletonBlock className="w-10 h-10" rounded="lg" />
                  <div>
                    <SkeletonBlock className="h-4 w-24 mb-1" />
                    <SkeletonBlock className="h-3 w-16" />
                  </div>
                </div>
                <div className="text-right">
                  <SkeletonBlock className="h-4 w-16 mb-1" />
                  <SkeletonBlock className="h-3 w-20" />
                </div>
              </div>
              <div className="flex gap-1">
                <SkeletonBlock className="h-6 w-16" rounded="lg" />
                <SkeletonBlock className="h-6 w-12" rounded="lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
