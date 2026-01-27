export default function AccountLoading() {
  const primaryColor = '#0F4C81';

  return (
    <>
      {/* Desktop View */}
      <div className="hidden lg:block">
        <div className="w-full bg-[var(--bg-primary)] min-h-screen pb-24 font-sans">
          <div className="max-w-7xl mx-auto px-6 pt-8">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                {/* Back button skeleton */}
                <div className="w-10 h-10 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
                {/* Title skeleton */}
                <div className="h-8 w-32 bg-[var(--bg-tertiary)] animate-pulse rounded-lg" />
              </div>
              {/* Account address skeleton */}
              <div className="flex items-center gap-3">
                <div className="h-6 w-48 bg-[var(--bg-tertiary)] animate-pulse rounded-lg" />
                <div className="w-9 h-9 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
              </div>
            </div>

            {/* Stats Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* Total Value Card */}
              <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] p-6">
                <div className="h-4 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded mb-3" />
                <div className="h-10 w-36 bg-[var(--bg-tertiary)] animate-pulse rounded-lg mb-2" />
                <div className="h-4 w-40 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              </div>
              {/* XLM Balance Card */}
              <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] p-6">
                <div className="h-4 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded mb-3" />
                <div className="h-10 w-32 bg-[var(--bg-tertiary)] animate-pulse rounded-lg mb-2" />
                <div className="h-4 w-28 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              </div>
              {/* Assets Count Card */}
              <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] p-6">
                <div className="h-4 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded mb-3" />
                <div className="h-10 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded-lg mb-2" />
                <div className="h-4 w-32 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              </div>
            </div>

            {/* Tabs Skeleton */}
            <div className="flex gap-6 mb-6 border-b border-[var(--border-default)] pb-3">
              <div className="h-5 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              <div className="h-5 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              <div className="h-5 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            </div>

            {/* Content Area - Asset List Skeletons */}
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Asset icon skeleton */}
                      <div className="w-12 h-12 bg-[var(--bg-tertiary)] animate-pulse rounded-full" />
                      <div>
                        {/* Asset code skeleton */}
                        <div className="h-5 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded mb-2" />
                        {/* Issuer skeleton */}
                        <div className="h-4 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                      </div>
                    </div>
                    <div className="text-right">
                      {/* Balance skeleton */}
                      <div className="h-5 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded mb-2" />
                      {/* Value skeleton */}
                      <div className="h-4 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block lg:hidden">
        <div className="w-full bg-[var(--bg-primary)] min-h-screen pb-24 font-sans">
          {/* Header */}
          <header className="pt-8 px-3 pb-2 sticky top-0 z-20 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-default)]">
            {/* Title Row */}
            <div className="flex items-center justify-between mb-6">
              {/* Account title */}
              <div
                className="h-7 w-24 animate-pulse rounded-lg"
                style={{ backgroundColor: `${primaryColor}20` }}
              />
              <div className="flex items-center gap-2">
                {/* Shortened address skeleton */}
                <div className="h-5 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                {/* Copy button skeleton */}
                <div className="w-9 h-9 bg-[var(--bg-tertiary)] animate-pulse rounded-xl" />
              </div>
            </div>

            {/* Est. Total Value Section */}
            <div className="mb-6">
              {/* Label */}
              <div className="h-4 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded mb-3" />
              {/* Value */}
              <div className="h-10 w-40 bg-[var(--bg-tertiary)] animate-pulse rounded-lg mb-2" />
              {/* 24h change */}
              <div className="h-4 w-48 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            </div>

            {/* Divider line before tabs */}
            <div className="border-t border-[var(--border-default)] mb-3" />

            {/* Tabs */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex gap-6">
                {/* Active tab with underline effect */}
                <div className="relative">
                  <div
                    className="h-4 w-14 animate-pulse rounded"
                    style={{ backgroundColor: `${primaryColor}30` }}
                  />
                  <div
                    className="absolute -bottom-3 left-0 right-0 h-0.5 rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                </div>
                <div className="h-4 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                <div className="h-4 w-14 bg-[var(--bg-tertiary)] animate-pulse rounded" />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="px-3">
            <div className="space-y-2 pt-2">
              {/* XLM Card Skeleton */}
              <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {/* XLM icon skeleton */}
                    <div className="w-10 h-10 bg-[var(--bg-tertiary)] animate-pulse rounded-full" />
                    <div>
                      {/* Asset code */}
                      <div className="h-4 w-10 bg-[var(--bg-tertiary)] animate-pulse rounded mb-1.5" />
                      {/* Asset name */}
                      <div className="h-3 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                    </div>
                  </div>
                  <div className="text-right">
                    {/* Balance */}
                    <div className="h-5 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded mb-1.5" />
                    {/* USD value */}
                    <div className="h-3 w-12 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                  </div>
                </div>
                {/* Bottom row - PNL and Price */}
                <div className="flex items-center justify-between pl-[52px]">
                  <div className="h-3 w-28 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                  <div className="h-3 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                </div>
              </div>

              {/* Other Asset Card Skeletons */}
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {/* Asset icon skeleton with varying colors */}
                      <div
                        className="w-10 h-10 animate-pulse rounded-full"
                        style={{
                          backgroundColor: [
                            'rgba(59, 130, 246, 0.2)',
                            'rgba(168, 85, 247, 0.2)',
                            'rgba(34, 197, 94, 0.2)',
                            'rgba(249, 115, 22, 0.2)',
                          ][i % 4],
                        }}
                      />
                      <div>
                        {/* Asset code */}
                        <div className="h-4 w-12 bg-[var(--bg-tertiary)] animate-pulse rounded mb-1.5" />
                        {/* Issuer */}
                        <div className="h-3 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                      </div>
                    </div>
                    <div className="text-right">
                      {/* Balance */}
                      <div className="h-5 w-14 bg-[var(--bg-tertiary)] animate-pulse rounded mb-1.5" />
                      {/* USD value */}
                      <div className="h-3 w-10 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                    </div>
                  </div>
                  {/* Bottom row - PNL and Price */}
                  <div className="flex items-center justify-between pl-[52px]">
                    <div className="h-3 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                    <div className="h-3 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
