import { getAssetDetails, getMarketAssets, shortenAddress, AssetDetails } from '@/lib/stellar';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import AssetCandlestickChart from '@/components/AssetCandlestickChart';
import AssetOrderBook from '@/components/AssetOrderBook';
import AssetConverter from '@/components/AssetConverter';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ issuer?: string }>;
}

function formatNumber(num: number): string {
  if (num === 0 || isNaN(num)) return '0';
  const absNum = Math.abs(num);
  if (absNum >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (absNum >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (absNum >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (absNum >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatPrice(price: number): string {
  if (price >= 1000) return '$' + price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (price >= 1) return '$' + price.toFixed(2);
  if (price >= 0.01) return '$' + price.toFixed(4);
  if (price >= 0.0001) return '$' + price.toFixed(6);
  return '$' + price.toFixed(8);
}

function StatCard({ label, value, subValue, tooltip }: { label: string; value: string; subValue?: string; tooltip?: string }) {
  return (
    <div className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl p-4 hover:border-[var(--border-default)] transition-all">
      <div className="flex items-center gap-1 mb-1">
        <span className="text-[var(--text-tertiary)] text-[11px] uppercase tracking-wider font-medium">{label}</span>
        {tooltip && (
          <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 16v-4m0-4h.01" />
          </svg>
        )}
      </div>
      <p className="text-[var(--text-primary)] font-semibold text-lg font-mono">{value}</p>
      {subValue && <p className="text-[var(--text-tertiary)] text-[12px] mt-0.5">{subValue}</p>}
    </div>
  );
}

function ChangeIndicator({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  const isPositive = value >= 0;
  const sizeClasses = {
    sm: 'text-[12px]',
    md: 'text-[14px]',
    lg: 'text-[18px]',
  };

  return (
    <span className={`font-medium ${sizeClasses[size]} ${isPositive ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
      {isPositive ? '▲' : '▼'} {Math.abs(value).toFixed(2)}%
    </span>
  );
}

export default async function AssetPage({ params, searchParams }: PageProps) {
  const { code } = await params;
  const { issuer } = await searchParams;

  const decodedCode = decodeURIComponent(code);
  const asset = await getAssetDetails(decodedCode, issuer);

  if (!asset) {
    notFound();
  }

  const marketAssets = await getMarketAssets();
  const rank = marketAssets.findIndex(a => a.code === asset.code) + 1;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[13px] text-[var(--text-tertiary)]">
        <Link href="/markets" className="hover:text-[var(--text-primary)] transition-colors">Markets</Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-[var(--text-primary)]">{asset.name}</span>
      </nav>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6">
        {/* Left Sidebar */}
        <div className="space-y-4">
          {/* Asset Header Card */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center text-[var(--text-primary)] font-bold text-xl">
                {asset.code.slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold text-[var(--text-primary)]">{asset.name}</h1>
                  {rank > 0 && (
                    <span className="px-2 py-0.5 bg-[var(--bg-tertiary)] rounded text-[11px] text-[var(--text-tertiary)] font-medium">
                      #{rank}
                    </span>
                  )}
                </div>
                <p className="text-[var(--text-tertiary)] text-[14px]">{asset.code}</p>
              </div>
            </div>

            {/* Price */}
            <div className="mb-4">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-[var(--text-primary)] font-mono">
                  {formatPrice(asset.price_usd)}
                </span>
                <ChangeIndicator value={asset.change_24h} size="md" />
              </div>
              <p className="text-[var(--text-tertiary)] text-[13px] mt-1">
                {asset.price_xlm.toFixed(4)} XLM
              </p>
            </div>

            {/* 24h Range */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-[12px] mb-1">
                <span className="text-[var(--text-tertiary)]">24h Low</span>
                <span className="text-[var(--text-tertiary)]">24h High</span>
              </div>
              <div className="relative h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div
                  className="absolute h-full bg-gradient-to-r from-[var(--error)] via-[var(--primary)] to-[var(--success)] rounded-full"
                  style={{
                    left: '0%',
                    right: '0%',
                  }}
                />
                {asset.price_high_24h > asset.price_low_24h && (
                  <div
                    className="absolute w-2 h-2 bg-white rounded-full top-0 shadow-sm"
                    style={{
                      left: `${((asset.price_usd - asset.price_low_24h) / (asset.price_high_24h - asset.price_low_24h)) * 100}%`,
                      transform: 'translateX(-50%)'
                    }}
                  />
                )}
              </div>
              <div className="flex items-center justify-between text-[12px] mt-1">
                <span className="text-[var(--text-primary)] font-mono">{formatPrice(asset.price_low_24h)}</span>
                <span className="text-[var(--text-primary)] font-mono">{formatPrice(asset.price_high_24h)}</span>
              </div>
            </div>
          </div>

          {/* Market Stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Market Cap"
              value={`$${formatNumber(asset.market_cap)}`}
              tooltip="Total market value"
            />
            <StatCard
              label="Volume (24h)"
              value={`$${formatNumber(asset.volume_24h)}`}
              subValue={asset.market_cap > 0 ? `${((asset.volume_24h / asset.market_cap) * 100).toFixed(2)}% of MCap` : undefined}
            />
            <StatCard
              label="Circulating Supply"
              value={formatNumber(asset.circulating_supply)}
              subValue={asset.code}
            />
            <StatCard
              label="Total Supply"
              value={formatNumber(asset.total_supply)}
              subValue={asset.code}
            />
          </div>

          {/* Additional Info */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-3">
            {asset.holders > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-tertiary)] text-[13px]">Holders</span>
                <span className="text-[var(--text-primary)] font-mono text-[13px]">{formatNumber(asset.holders)}</span>
              </div>
            )}
            {asset.payments_24h > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-tertiary)] text-[13px]">Payments (24h)</span>
                <span className="text-[var(--text-primary)] font-mono text-[13px]">{formatNumber(asset.payments_24h)}</span>
              </div>
            )}
            {asset.trades_24h > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-tertiary)] text-[13px]">Trades (24h)</span>
                <span className="text-[var(--text-primary)] font-mono text-[13px]">{formatNumber(asset.trades_24h)}</span>
              </div>
            )}
            {asset.all_time_high && (
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-tertiary)] text-[13px]">All-Time High</span>
                <span className="text-[var(--text-primary)] font-mono text-[13px]">{formatPrice(asset.all_time_high)}</span>
              </div>
            )}
            {asset.all_time_low && (
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-tertiary)] text-[13px]">All-Time Low</span>
                <span className="text-[var(--text-primary)] font-mono text-[13px]">{formatPrice(asset.all_time_low)}</span>
              </div>
            )}
          </div>

          {/* Links */}
          {(asset.domain || asset.issuer) && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-3">
              {asset.domain && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-tertiary)] text-[13px]">Website</span>
                  <a
                    href={`https://${asset.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[var(--primary)] text-[13px] hover:underline"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    {asset.domain}
                  </a>
                </div>
              )}
              {asset.issuer && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-tertiary)] text-[13px]">Issuer</span>
                  <Link
                    href={`/account/${asset.issuer}`}
                    className="flex items-center gap-1.5 text-[var(--primary)] text-[13px] font-mono hover:underline"
                  >
                    {shortenAddress(asset.issuer, 6)}
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Link>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-tertiary)] text-[13px]">Explorer</span>
                <a
                  href={`https://stellar.expert/explorer/public/asset/${asset.code}${asset.issuer ? `-${asset.issuer}` : ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[var(--primary)] text-[13px] hover:underline"
                >
                  stellar.expert
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          )}

          {/* Price Converter */}
          <AssetConverter asset={asset} />
        </div>

        {/* Right Content - Chart */}
        <div className="space-y-4">
          {/* Chart Section */}
          {/* Chart Section */}
          <div className="space-y-6">
            <AssetCandlestickChart asset={asset} />
            <AssetOrderBook asset={asset} />
          </div>

          {/* Price Performance */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-5">
            <h3 className="text-[var(--text-primary)] font-semibold mb-4">Price Performance</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-[var(--bg-tertiary)] rounded-lg">
                <p className="text-[var(--text-tertiary)] text-[11px] uppercase mb-1">1 Hour</p>
                <ChangeIndicator value={asset.change_1h} size="sm" />
              </div>
              <div className="text-center p-3 bg-[var(--bg-tertiary)] rounded-lg">
                <p className="text-[var(--text-tertiary)] text-[11px] uppercase mb-1">24 Hours</p>
                <ChangeIndicator value={asset.change_24h} size="sm" />
              </div>
              <div className="text-center p-3 bg-[var(--bg-tertiary)] rounded-lg">
                <p className="text-[var(--text-tertiary)] text-[11px] uppercase mb-1">7 Days</p>
                <ChangeIndicator value={asset.change_7d} size="sm" />
              </div>
            </div>
          </div>

          {/* About Section */}
          {asset.description && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-5">
              <h3 className="text-[var(--text-primary)] font-semibold mb-3">About {asset.name}</h3>
              <p className="text-[var(--text-secondary)] text-[14px] leading-relaxed">
                {asset.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
