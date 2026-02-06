export default function GraphLoading() {
  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block min-h-screen bg-[var(--bg-primary)]">
        <div className="mx-auto max-w-3xl px-6 py-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[var(--border-default)] rounded-xl animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-32 bg-[var(--border-default)] rounded-lg animate-pulse" />
                <div className="h-5 w-10 bg-[var(--info-muted)] rounded-full animate-pulse" />
              </div>
              <div className="h-4 w-64 bg-[var(--border-default)] rounded animate-pulse mt-1" />
            </div>
          </div>

          {/* Search Card */}
          <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)] p-6 shadow-sm mb-6">
            <div className="space-y-4">
              <div>
                <div className="h-3 w-24 bg-[var(--border-default)] rounded animate-pulse mb-2" />
                <div className="h-12 w-full bg-[var(--bg-tertiary)] rounded-xl animate-pulse" />
              </div>
              <div className="h-12 w-full bg-[var(--info-muted)] rounded-xl animate-pulse" />
            </div>
          </div>

          {/* Showcase Card */}
          <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)] p-6 shadow-sm mb-6">
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <div className="h-5 w-20 bg-[var(--info-muted)] rounded-md animate-pulse" />
                <div>
                  <div className="h-5 w-32 bg-[var(--border-default)] rounded animate-pulse mb-1" />
                  <div className="h-3 w-40 bg-[var(--border-default)] rounded animate-pulse mb-3" />
                  <div className="h-3 w-full max-w-md bg-[var(--border-default)] rounded animate-pulse" />
                </div>
              </div>
              <div className="w-5 h-5 bg-[var(--border-default)] rounded animate-pulse" />
            </div>
          </div>

          {/* Info */}
          <div className="flex justify-center">
            <div className="h-3 w-72 bg-[var(--border-default)] rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden bg-[var(--bg-primary)] min-h-screen pb-24">
        <div className="px-4 py-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--border-default)] rounded-xl animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <div className="h-5 w-28 bg-[var(--border-default)] rounded-lg animate-pulse" />
                <div className="h-4 w-10 bg-[var(--info-muted)] rounded-full animate-pulse" />
              </div>
              <div className="h-3 w-48 bg-[var(--border-default)] rounded animate-pulse mt-1" />
            </div>
          </div>

          {/* Search Card */}
          <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] p-4 shadow-sm">
            <div className="space-y-3">
              <div>
                <div className="h-3 w-20 bg-[var(--border-default)] rounded animate-pulse mb-2" />
                <div className="h-10 w-full bg-[var(--bg-tertiary)] rounded-xl animate-pulse" />
              </div>
              <div className="h-10 w-full bg-[var(--info-muted)] rounded-xl animate-pulse" />
            </div>
          </div>

          {/* Showcase Card */}
          <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-4 w-16 bg-[var(--info-muted)] rounded-md animate-pulse" />
                <div>
                  <div className="h-4 w-28 bg-[var(--border-default)] rounded animate-pulse mb-1" />
                  <div className="h-3 w-36 bg-[var(--border-default)] rounded animate-pulse mb-2" />
                  <div className="h-3 w-full bg-[var(--border-default)] rounded animate-pulse" />
                </div>
              </div>
              <div className="w-4 h-4 bg-[var(--border-default)] rounded animate-pulse" />
            </div>
          </div>

          {/* Info */}
          <div className="flex justify-center">
            <div className="h-3 w-56 bg-[var(--border-default)] rounded animate-pulse" />
          </div>
        </div>
      </div>
    </>
  );
}
