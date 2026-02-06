export default function ProjectDetailLoading() {
  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block min-h-screen bg-[var(--bg-primary)]">
        <div className="mx-auto max-w-4xl px-6 py-6">
          {/* Back Link */}
          <div className="h-5 w-32 bg-[var(--border-default)] rounded animate-pulse mb-5" />

          {/* Header Card */}
          <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)] p-8 shadow-sm mb-5">
            <div className="flex items-start gap-6">
              {/* Logo */}
              <div className="w-20 h-20 bg-[var(--border-default)] rounded-2xl shrink-0 animate-pulse" />

              <div className="flex-1 min-w-0">
                {/* Title and Category */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-7 w-40 bg-[var(--border-default)] rounded animate-pulse" />
                  <div className="h-6 w-20 bg-[var(--info-muted)] rounded-lg animate-pulse" />
                </div>

                {/* Description */}
                <div className="space-y-2 mb-4">
                  <div className="h-4 w-full bg-[var(--border-default)] rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-[var(--border-default)] rounded animate-pulse" />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <div className="h-10 w-32 bg-[var(--info-muted)] rounded-xl animate-pulse" />
                  <div className="h-10 w-24 bg-[var(--border-default)] rounded-xl animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* SCF Award Card */}
          <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)] p-6 shadow-sm mb-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 bg-[var(--warning-muted)] rounded animate-pulse" />
              <div className="h-5 w-48 bg-[var(--border-default)] rounded animate-pulse" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                  <div className="h-3 w-20 bg-[var(--border-default)] rounded animate-pulse mb-2" />
                  <div className="h-6 w-24 bg-[var(--border-default)] rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          {/* Team Card */}
          <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)] p-6 shadow-sm mb-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 bg-[var(--border-default)] rounded animate-pulse" />
              <div className="h-5 w-24 bg-[var(--border-default)] rounded animate-pulse" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[var(--border-default)] rounded-full animate-pulse" />
                    <div className="flex-1">
                      <div className="h-4 w-28 bg-[var(--border-default)] rounded animate-pulse mb-1" />
                      <div className="h-3 w-20 bg-[var(--border-default)] rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)]">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="w-7 h-7 bg-[var(--border-default)] rounded-lg animate-pulse" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resources Card */}
          <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)] p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 bg-[var(--border-default)] rounded animate-pulse" />
              <div className="h-5 w-36 bg-[var(--border-default)] rounded animate-pulse" />
            </div>

            <div className="flex flex-wrap gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 w-28 bg-[var(--bg-tertiary)] rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden bg-[var(--bg-primary)] min-h-screen pb-24">
        <div className="px-4 py-4 space-y-4">
          {/* Back Link */}
          <div className="h-4 w-24 bg-[var(--border-default)] rounded animate-pulse" />

          {/* Header Card */}
          <div className="bg-[var(--bg-secondary)] rounded-xl p-4 shadow-sm border border-[var(--border-default)]">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 bg-[var(--border-default)] rounded-xl shrink-0 animate-pulse" />
              <div className="flex-1">
                <div className="h-5 w-32 bg-[var(--border-default)] rounded animate-pulse mb-2" />
                <div className="h-5 w-16 bg-[var(--info-muted)] rounded-lg animate-pulse" />
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="h-3 w-full bg-[var(--border-default)] rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-[var(--border-default)] rounded animate-pulse" />
            </div>
            <div className="flex gap-3">
              <div className="h-9 w-28 bg-[var(--info-muted)] rounded-xl animate-pulse" />
              <div className="h-9 w-20 bg-[var(--border-default)] rounded-xl animate-pulse" />
            </div>
          </div>

          {/* SCF Award Card */}
          <div className="bg-[var(--bg-secondary)] rounded-xl p-4 shadow-sm border border-[var(--border-default)]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-4 h-4 bg-[var(--warning-muted)] rounded animate-pulse" />
              <div className="h-4 w-40 bg-[var(--border-default)] rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                  <div className="h-3 w-14 bg-[var(--border-default)] rounded animate-pulse mb-1" />
                  <div className="h-5 w-16 bg-[var(--border-default)] rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          {/* Team Card */}
          <div className="bg-[var(--bg-secondary)] rounded-xl p-4 shadow-sm border border-[var(--border-default)]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-4 h-4 bg-[var(--border-default)] rounded animate-pulse" />
              <div className="h-4 w-20 bg-[var(--border-default)] rounded animate-pulse" />
            </div>
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[var(--border-default)] rounded-full animate-pulse" />
                    <div className="flex-1">
                      <div className="h-4 w-24 bg-[var(--border-default)] rounded animate-pulse mb-1" />
                      <div className="h-3 w-16 bg-[var(--border-default)] rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resources Card */}
          <div className="bg-[var(--bg-secondary)] rounded-xl p-4 shadow-sm border border-[var(--border-default)]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-4 h-4 bg-[var(--border-default)] rounded animate-pulse" />
              <div className="h-4 w-28 bg-[var(--border-default)] rounded animate-pulse" />
            </div>
            <div className="flex flex-wrap gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 w-24 bg-[var(--bg-tertiary)] rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
