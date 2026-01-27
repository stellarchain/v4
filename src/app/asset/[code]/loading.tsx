export default function AssetLoading() {
  const primaryColor = '#0F4C81';

  return (
    <div className="w-full bg-[var(--bg-primary)] min-h-screen pb-24 font-sans relative">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[var(--bg-secondary)] border-b border-[var(--border-default)]">
        {/* Top Bar */}
        <div className="px-3 py-3 flex items-center justify-between">
          {/* Back button skeleton */}
          <div className="w-5 h-5 bg-[var(--bg-tertiary)] animate-pulse rounded" />

          <div className="flex items-center gap-2">
            {/* Asset icon skeleton */}
            <div className="w-6 h-6 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
            {/* Asset code skeleton */}
            <div className="w-14 h-5 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            <span className="text-[var(--text-muted)] text-sm font-medium">/ USD</span>
          </div>

          <div className="w-6" /> {/* Spacer for centering */}
        </div>

        {/* Price Section */}
        <div className="px-4 pb-4">
          {/* Asset name and rank */}
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-24 h-4 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            <div className="w-8 h-4 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          </div>

          {/* Price and change */}
          <div className="flex items-center justify-between">
            <div className="w-32 h-9 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            <div className="w-20 h-8 bg-[var(--bg-tertiary)] animate-pulse rounded-lg" />
          </div>

          {/* XLM price and issuer */}
          <div className="flex items-center justify-between mt-1">
            <div className="w-24 h-4 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            <div className="w-32 h-4 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-3 py-3 space-y-3">

        {/* Chart Section */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-2">
          {/* Timeframe Selector */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1">
              {['1H', '24H', '7D', '30D', '1Y'].map((tf) => (
                <div
                  key={tf}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                    tf === '24H'
                      ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                      : 'bg-[var(--bg-primary)] text-[var(--text-tertiary)]'
                  }`}
                >
                  {tf}
                </div>
              ))}
            </div>
          </div>

          {/* Chart Skeleton */}
          <div className="w-full h-[240px] animate-pulse">
            <div className="h-full flex flex-col justify-end gap-1 px-2">
              {/* Fake candlesticks */}
              <div className="flex items-end justify-around h-[180px] gap-1">
                {[65, 45, 70, 55, 80, 60, 75, 50, 85, 65, 70, 55, 60, 75, 68, 72, 58, 82, 63, 77].map((h, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5">
                    <div
                      className="w-0.5 bg-[var(--bg-tertiary)] rounded"
                      style={{ height: `${h * 0.15}px` }}
                    />
                    <div
                      className="w-2 bg-[var(--bg-tertiary)] rounded-sm"
                      style={{ height: `${h}px` }}
                    />
                    <div
                      className="w-0.5 bg-[var(--bg-tertiary)] rounded"
                      style={{ height: `${h * 0.1}px` }}
                    />
                  </div>
                ))}
              </div>
              {/* Volume bars */}
              <div className="flex items-end justify-around h-[40px] gap-1">
                {[20, 35, 25, 40, 30, 45, 28, 38, 32, 42, 26, 36, 30, 44, 34, 40, 28, 46, 32, 38].map((h, i) => (
                  <div
                    key={i}
                    className="w-2 bg-[var(--bg-tertiary)] rounded-sm opacity-50"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Price Change Row */}
          <div className="flex justify-between pt-3 mt-2 border-t border-[var(--border-subtle)]">
            {['24 hours', '7 days', '30 days', '90 days', 'YTD'].map((label) => (
              <div key={label} className="text-center flex-1">
                <p className="text-[10px] text-[var(--text-tertiary)] mb-0.5">{label}</p>
                <div className="h-4 w-10 bg-[var(--bg-tertiary)] animate-pulse rounded mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Order Book Section */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-3">
          {/* Section Title */}
          <div className="flex items-center justify-between mb-3">
            <div className="w-24 h-5 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            <div className="flex gap-1">
              {['Both', 'Bids', 'Asks'].map((label) => (
                <div
                  key={label}
                  className={`px-2 py-1 rounded text-[10px] font-medium ${
                    label === 'Both'
                      ? 'bg-[var(--bg-primary)]'
                      : ''
                  } bg-[var(--bg-tertiary)] animate-pulse`}
                  style={{ width: '40px', height: '22px' }}
                />
              ))}
            </div>
          </div>

          {/* Order Book Grid Skeleton */}
          <div className="grid grid-cols-2 gap-2">
            {/* Bids side */}
            <div className="space-y-1">
              <div className="grid grid-cols-3 gap-1 text-[9px] text-[var(--text-muted)] px-1 mb-1">
                <span>Price</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Total</span>
              </div>
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-5 bg-[var(--bg-tertiary)] animate-pulse rounded opacity-70" style={{ opacity: 1 - i * 0.1 }} />
              ))}
            </div>
            {/* Asks side */}
            <div className="space-y-1">
              <div className="grid grid-cols-3 gap-1 text-[9px] text-[var(--text-muted)] px-1 mb-1">
                <span>Price</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Total</span>
              </div>
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-5 bg-[var(--bg-tertiary)] animate-pulse rounded opacity-70" style={{ opacity: 1 - i * 0.1 }} />
              ))}
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)]">
          <div className="flex border-b border-[var(--border-subtle)]">
            {['Trades', 'Holders', 'Markets'].map((tab, index) => (
              <button
                key={tab}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  index === 0
                    ? 'border-b-2 text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)]'
                }`}
                style={index === 0 ? { borderColor: primaryColor, color: primaryColor } : {}}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content List Skeleton */}
          <div className="p-3 space-y-2">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
                  <div className="space-y-1.5">
                    <div className="w-20 h-4 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                    <div className="w-14 h-3 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                  </div>
                </div>
                <div className="text-right space-y-1.5">
                  <div className="w-16 h-4 bg-[var(--bg-tertiary)] animate-pulse rounded ml-auto" />
                  <div className="w-12 h-3 bg-[var(--bg-tertiary)] animate-pulse rounded ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
