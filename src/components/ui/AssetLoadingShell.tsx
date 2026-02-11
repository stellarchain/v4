'use client';

export default function AssetLoadingShell() {
  return (
    <>
      <div className="hidden md:block min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <div className="mx-auto max-w-[1400px] px-4 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-4">
            <div className="space-y-4">
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-3">
                <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide mb-2">Asset price</div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-block h-10 w-10 rounded-full bg-[var(--border-default)] animate-pulse" />
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Asset / USD</div>
                    <div className="h-4 w-20 rounded bg-[var(--border-default)] animate-pulse mt-2" />
                  </div>
                </div>
                <div className="h-8 w-44 rounded bg-[var(--border-default)] animate-pulse" />
                <div className="text-xs text-[var(--text-muted)] mt-2">(24h)</div>
              </div>

              <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-3 divide-y divide-[var(--border-subtle)]">
                {['Market cap', 'Volume (24h)', 'Vol/Mkt Cap', 'FDV', 'Total supply', 'Max. supply', 'Circulating supply'].map((label) => (
                  <div key={label} className="flex items-center justify-between py-2">
                    <span className="text-xs text-[var(--text-tertiary)]">{label}</span>
                    <span className="inline-block h-4 w-24 rounded bg-[var(--border-default)] animate-pulse" />
                  </div>
                ))}
              </div>

              <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-tertiary)]">Issuer</span>
                  <span className="inline-block h-4 w-32 rounded bg-[var(--border-default)] animate-pulse" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-tertiary)]">Holders</span>
                  <span className="inline-block h-4 w-16 rounded bg-[var(--border-default)] animate-pulse" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-tertiary)]">Trades (24h)</span>
                  <span className="inline-block h-4 w-16 rounded bg-[var(--border-default)] animate-pulse" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-2 flex gap-2">
                {['Chart', 'Markets', 'Trades', 'Holders', 'About'].map((tab) => (
                  <div key={tab} className="h-8 flex-1 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-xs text-[var(--text-muted)] font-medium">
                    {tab}
                  </div>
                ))}
              </div>

              <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Chart</h3>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span>15m</span>
                    <span>1h</span>
                    <span>24h</span>
                    <span>7d</span>
                  </div>
                </div>
                <div className="h-[320px] rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] p-3">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="h-3 rounded bg-[var(--border-default)] animate-pulse mb-5" />
                  ))}
                </div>
              </div>

              <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-3">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Order Book</h3>
                <div className="grid grid-cols-3 gap-4 text-[11px] text-[var(--text-muted)] uppercase tracking-wide mb-2">
                  <span>Amount</span>
                  <span>Price</span>
                  <span className="text-right">Amount</span>
                </div>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-3 gap-4 py-1.5">
                    <div className="h-3 rounded bg-[var(--border-default)] animate-pulse" />
                    <div className="h-3 rounded bg-[var(--border-default)] animate-pulse" />
                    <div className="h-3 rounded bg-[var(--border-default)] animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="block md:hidden min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] px-4 py-4">
        <div className="bg-[var(--header-bg)] text-white rounded-2xl p-4 mb-3">
          <div className="text-[11px] text-white/60 uppercase tracking-wide mb-2">Asset price</div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-block h-8 w-8 rounded-full bg-white/20 animate-pulse" />
              <div>
                <div className="text-sm font-semibold">Asset / USD</div>
                <div className="h-3 w-16 rounded bg-white/20 animate-pulse mt-2" />
              </div>
            </div>
            <span className="text-xs text-white/60">Rank</span>
          </div>
          <div className="h-8 w-36 rounded bg-white/20 animate-pulse mt-3" />
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-3 mb-3">
          <div className="grid grid-cols-3 gap-3">
            {['Market Cap', 'Volume 24H', 'Holders'].map((label) => (
              <div key={label} className="text-center">
                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1">{label}</div>
                <span className="inline-block h-4 w-16 rounded bg-[var(--border-default)] animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-2 flex gap-2 mb-3">
          {['Overview', 'Trades', 'Markets', 'Holders', 'Convert'].map((tab) => (
            <div key={tab} className="h-8 flex-1 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[11px] text-[var(--text-muted)] font-medium">
              {tab}
            </div>
          ))}
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Chart</h3>
            <div className="flex gap-2 text-[10px] text-[var(--text-muted)]">
              <span>15m</span>
              <span>1h</span>
              <span>24h</span>
              <span>7d</span>
            </div>
          </div>
          <div className="h-[220px] rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-3 rounded bg-[var(--border-default)] animate-pulse mb-4" />
            ))}
          </div>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Order Book</h3>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-3 gap-3 py-1.5">
              <div className="h-3 rounded bg-[var(--border-default)] animate-pulse" />
              <div className="h-3 rounded bg-[var(--border-default)] animate-pulse" />
              <div className="h-3 rounded bg-[var(--border-default)] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
