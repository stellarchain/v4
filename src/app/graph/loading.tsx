export default function GraphLoading() {
  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl px-6 py-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-slate-200 rounded-xl animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-32 bg-slate-200 rounded-lg animate-pulse" />
                <div className="h-5 w-10 bg-sky-100 rounded-full animate-pulse" />
              </div>
              <div className="h-4 w-64 bg-slate-200 rounded animate-pulse mt-1" />
            </div>
          </div>

          {/* Search Card */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm mb-6">
            <div className="space-y-4">
              <div>
                <div className="h-3 w-24 bg-slate-200 rounded animate-pulse mb-2" />
                <div className="h-12 w-full bg-slate-100 rounded-xl animate-pulse" />
              </div>
              <div className="h-12 w-full bg-sky-100 rounded-xl animate-pulse" />
            </div>
          </div>

          {/* Showcase Card */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm mb-6">
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <div className="h-5 w-20 bg-sky-100 rounded-md animate-pulse" />
                <div>
                  <div className="h-5 w-32 bg-slate-200 rounded animate-pulse mb-1" />
                  <div className="h-3 w-40 bg-slate-200 rounded animate-pulse mb-3" />
                  <div className="h-3 w-full max-w-md bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
              <div className="w-5 h-5 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>

          {/* Info */}
          <div className="flex justify-center">
            <div className="h-3 w-72 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden bg-slate-50 min-h-screen pb-24">
        <div className="px-4 py-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-200 rounded-xl animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <div className="h-5 w-28 bg-slate-200 rounded-lg animate-pulse" />
                <div className="h-4 w-10 bg-sky-100 rounded-full animate-pulse" />
              </div>
              <div className="h-3 w-48 bg-slate-200 rounded animate-pulse mt-1" />
            </div>
          </div>

          {/* Search Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="space-y-3">
              <div>
                <div className="h-3 w-20 bg-slate-200 rounded animate-pulse mb-2" />
                <div className="h-10 w-full bg-slate-100 rounded-xl animate-pulse" />
              </div>
              <div className="h-10 w-full bg-sky-100 rounded-xl animate-pulse" />
            </div>
          </div>

          {/* Showcase Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-4 w-16 bg-sky-100 rounded-md animate-pulse" />
                <div>
                  <div className="h-4 w-28 bg-slate-200 rounded animate-pulse mb-1" />
                  <div className="h-3 w-36 bg-slate-200 rounded animate-pulse mb-2" />
                  <div className="h-3 w-full bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
              <div className="w-4 h-4 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>

          {/* Info */}
          <div className="flex justify-center">
            <div className="h-3 w-56 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </>
  );
}
