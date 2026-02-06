export default function AccountLoading() {
  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block min-h-screen bg-[var(--bg-primary)] ">
        <div className="mx-auto max-w-[1400px] px-6 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-5">
            <div className="h-4 w-20 bg-[var(--border-default)]  rounded animate-pulse" />
            <div className="h-4 w-4 bg-[var(--border-default)]  rounded animate-pulse" />
            <div className="h-4 w-24 bg-[var(--border-default)]  rounded animate-pulse" />
          </div>

          {/* Header Card */}
          <div className="bg-[var(--bg-secondary)]  rounded-2xl border border-[var(--border-default)]  shadow-sm p-5 mb-5">
            <div className="flex flex-wrap items-start justify-between gap-5">
              {/* Left: Account Identity */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[var(--border-default)]  rounded-full animate-pulse" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-6 w-24 bg-[var(--border-default)]  rounded animate-pulse" />
                    <div className="h-5 w-16 bg-[var(--info-muted)]  rounded animate-pulse" />
                  </div>
                  <div className="h-4 w-48 bg-[var(--border-default)]  rounded animate-pulse" />
                </div>
              </div>

              {/* Right: Copy Button */}
              <div className="flex items-center gap-3">
                <div className="h-6 w-48 bg-[var(--bg-tertiary)]  rounded-lg animate-pulse" />
                <div className="w-9 h-9 bg-[var(--border-default)]  rounded-xl animate-pulse" />
              </div>
            </div>
          </div>

          {/* Stats Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            {/* Total Value Card */}
            <div className="bg-[var(--bg-secondary)]  rounded-2xl border border-[var(--border-default)]  p-5 shadow-sm">
              <div className="h-3 w-24 bg-[var(--border-default)]  rounded animate-pulse mb-3" />
              <div className="h-10 w-36 bg-[var(--border-default)]  rounded-lg animate-pulse mb-2" />
              <div className="h-4 w-40 bg-[var(--success-muted)] rounded animate-pulse" />
            </div>
            {/* XLM Balance Card */}
            <div className="bg-[var(--bg-secondary)]  rounded-2xl border border-[var(--border-default)]  p-5 shadow-sm">
              <div className="h-3 w-20 bg-[var(--border-default)]  rounded animate-pulse mb-3" />
              <div className="h-10 w-32 bg-[var(--border-default)]  rounded-lg animate-pulse mb-2" />
              <div className="h-4 w-28 bg-[var(--border-default)]  rounded animate-pulse" />
            </div>
            {/* Assets Count Card */}
            <div className="bg-[var(--bg-secondary)]  rounded-2xl border border-[var(--border-default)]  p-5 shadow-sm">
              <div className="h-3 w-16 bg-[var(--border-default)]  rounded animate-pulse mb-3" />
              <div className="h-10 w-20 bg-[var(--border-default)]  rounded-lg animate-pulse mb-2" />
              <div className="h-4 w-32 bg-[var(--border-default)]  rounded animate-pulse" />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-6 border-b border-[var(--border-default)]  pb-3 mb-5">
            <div className="h-4 w-16 bg-[var(--info-muted)] rounded animate-pulse" />
            <div className="h-4 w-20 bg-[var(--border-default)]  rounded animate-pulse" />
            <div className="h-4 w-16 bg-[var(--border-default)]  rounded animate-pulse" />
          </div>

          {/* Asset List */}
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-[var(--bg-secondary)]  rounded-xl border border-[var(--border-default)]  p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[var(--border-default)]  rounded-full animate-pulse" />
                    <div>
                      <div className="h-5 w-16 bg-[var(--border-default)]  rounded animate-pulse mb-2" />
                      <div className="h-4 w-24 bg-[var(--border-default)]  rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="h-5 w-20 bg-[var(--border-default)]  rounded animate-pulse mb-2" />
                    <div className="h-4 w-16 bg-[var(--border-default)]  rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden min-h-screen bg-[var(--bg-primary)]  pb-24">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-[var(--bg-secondary)]  border-b border-[var(--border-default)]  px-4 py-3">
          {/* Title Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="h-7 w-24 bg-[var(--info-muted)]  rounded-lg animate-pulse" />
            <div className="flex items-center gap-2">
              <div className="h-5 w-20 bg-[var(--border-default)]  rounded animate-pulse" />
              <div className="w-9 h-9 bg-[var(--border-default)]  rounded-xl animate-pulse" />
            </div>
          </div>

          {/* Est. Total Value Section */}
          <div className="mb-4">
            <div className="h-4 w-24 bg-[var(--border-default)]  rounded animate-pulse mb-2" />
            <div className="h-10 w-40 bg-[var(--border-default)]  rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-48 bg-[var(--success-muted)] rounded animate-pulse" />
          </div>

          {/* Tabs */}
          <div className="flex gap-6 border-t border-[var(--border-default)]  pt-3">
            <div className="h-4 w-14 bg-[var(--info-muted)] rounded animate-pulse" />
            <div className="h-4 w-16 bg-[var(--border-default)]  rounded animate-pulse" />
            <div className="h-4 w-14 bg-[var(--border-default)]  rounded animate-pulse" />
          </div>
        </header>

        {/* Main Content */}
        <main className="px-4 pt-4">
          <div className="space-y-3">
            {/* XLM Card */}
            <div className="bg-[var(--bg-secondary)]  rounded-xl shadow-sm border border-[var(--border-default)]  px-4 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--text-primary)] rounded-full animate-pulse" />
                  <div>
                    <div className="h-4 w-10 bg-[var(--border-default)]  rounded animate-pulse mb-1" />
                    <div className="h-3 w-24 bg-[var(--border-default)]  rounded animate-pulse" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="h-5 w-16 bg-[var(--border-default)]  rounded animate-pulse mb-1" />
                  <div className="h-3 w-12 bg-[var(--border-default)]  rounded animate-pulse" />
                </div>
              </div>
              <div className="flex items-center justify-between pl-[52px]">
                <div className="h-3 w-28 bg-[var(--success-muted)] rounded animate-pulse" />
                <div className="h-3 w-20 bg-[var(--border-default)]  rounded animate-pulse" />
              </div>
            </div>

            {/* Other Asset Cards */}
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-[var(--bg-secondary)]  rounded-xl shadow-sm border border-[var(--border-default)]  px-4 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--border-default)] animate-pulse" />
                    <div>
                      <div className="h-4 w-12 bg-[var(--border-default)]  rounded animate-pulse mb-1" />
                      <div className="h-3 w-20 bg-[var(--border-default)]  rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="h-5 w-14 bg-[var(--border-default)]  rounded animate-pulse mb-1" />
                    <div className="h-3 w-10 bg-[var(--border-default)]  rounded animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center justify-between pl-[52px]">
                  <div className="h-3 w-24 bg-[var(--border-default)]  rounded animate-pulse" />
                  <div className="h-3 w-16 bg-[var(--border-default)]  rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
