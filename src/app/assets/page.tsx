'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getAssetDetails, getMarketAssets, getBaseUrl, shortenAddress } from '@/lib/stellar';
import { usePathname, useSearchParams } from 'next/navigation';
import Loading from '@/components/ui/Loading';
import ShowError from '@/components/ui/ShowError';
import AssetDesktopView from '@/components/desktop/AssetDesktopView';
import AssetMobileView from '@/components/mobile/AssetMobileView';
import { assetRoute, addressRoute } from '@/lib/shared/routes';
import { getDetailRouteValue } from '@/lib/shared/routeDetail';

type AssetListItem = {
  asset_code: string;
  asset_type: string;
  asset_issuer?: string;
  accounts_authorized: number;
  accounts_unauthorized: number;
  accounts_pending: number;
  balance_authorized: string;
  num_claimable_balances: number;
  num_liquidity_pools: number;
  num_contracts: number;
  flags: {
    auth_required: boolean;
    auth_revocable: boolean;
    auth_immutable: boolean;
    auth_clawback_enabled: boolean;
  };
};

const formatNumber = (n: number): string => n.toLocaleString();

const formatBalance = (s: string): string => {
  const num = parseFloat(s);
  if (isNaN(num)) return '0';
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
  return num.toLocaleString(undefined, { maximumFractionDigits: 7 });
};

const getAssetTypeBadge = (type: string): string => {
  if (type === 'credit_alphanum4') return 'A4';
  if (type === 'credit_alphanum12') return 'A12';
  if (type === 'native') return 'XLM';
  return type;
};

function FlagBadges({ flags }: { flags: AssetListItem['flags'] }) {
  const badges: { label: string; color: string; bg: string }[] = [];
  if (flags.auth_required)
    badges.push({ label: 'AUTH', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800/50' });
  if (flags.auth_revocable)
    badges.push({ label: 'REVOKE', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/40 border-orange-200 dark:border-orange-800/50' });
  if (flags.auth_clawback_enabled)
    badges.push({ label: 'CLAW', color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/40 border-rose-200 dark:border-rose-800/50' });
  if (flags.auth_immutable)
    badges.push({ label: 'IMMUT', color: 'text-sky-700 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/40 border-sky-200 dark:border-sky-800/50' });
  if (badges.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {badges.map((b) => (
        <span key={b.label} className={`px-1.5 py-0.5 rounded border text-[8px] font-bold ${b.bg} ${b.color}`}>
          {b.label}
        </span>
      ))}
    </div>
  );
}

export default function AssetsPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const assetSlug = useMemo(() => {
    const value = getDetailRouteValue({
      pathname,
      searchParams,
      queryKey: 'id',
      aliases: ['/assets'],
    });
    return value || null;
  }, [pathname, searchParams]);

  const [assets, setAssets] = useState<AssetListItem[] | null>(null);
  const [codeQuery, setCodeQuery] = useState('');
  const [issuerQuery, setIssuerQuery] = useState('');
  const [debouncedCodeQuery, setDebouncedCodeQuery] = useState('');
  const [debouncedIssuerQuery, setDebouncedIssuerQuery] = useState('');
  const [details, setDetails] = useState<any>(null);
  const [rank, setRank] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCodeQuery(codeQuery.trim());
      setDebouncedIssuerQuery(issuerQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [codeQuery, issuerQuery]);

  function parseAssetSlug(slug: string): { code: string; issuer?: string | null } {
    const decoded = decodeURIComponent(slug).trim();
    const nativeMatch = decoded.match(/^(.*)-native$/i);
    if (nativeMatch && nativeMatch[1]) {
      return { code: nativeMatch[1], issuer: null };
    }

    const issuerMatch = decoded.match(/^(.*)-(G[A-Z2-7]{55})$/);
    if (issuerMatch && issuerMatch[1] && issuerMatch[2]) {
      return { code: issuerMatch[1], issuer: issuerMatch[2] };
    }

    const idx = decoded.lastIndexOf('-');
    if (idx > 0) {
      const code = decoded.slice(0, idx);
      const issuer = decoded.slice(idx + 1);
      if (issuer) return { code, issuer };
    }

    return { code: decoded, issuer: undefined };
  }

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setError(null);
      setIsLoading(true);
      try {
        if (assetSlug) {
          const parsed = parseAssetSlug(assetSlug);
          let code = parsed.code;
          let issuer = parsed.issuer;

          const marketAssetsResult = await getMarketAssets();
          const marketAssets = marketAssetsResult.assets;

          if (issuer === undefined) {
            if (code.toUpperCase() === 'XLM') {
              issuer = null;
            } else {
              const matched = marketAssets.find((a) => a.code.toUpperCase() === code.toUpperCase());
              if (matched) {
                code = matched.code;
                issuer = matched.issuer;
              } else {
                throw new Error(`Asset ${code} not found`);
              }
            }
          }

          const assetDetails = await getAssetDetails(code, issuer || undefined);
          if (!assetDetails) {
            const id = issuer ? `${code}-${issuer}` : code;
            throw new Error(`Asset ${id} not found`);
          }

          const assetRank = marketAssets.findIndex((a) => a.code === assetDetails.code) + 1;
          if (!isMounted) return;
          setDetails(assetDetails);
          setRank(assetRank);
          setAssets(null);
        } else {
          const baseUrl = getBaseUrl();
          const params = new URLSearchParams();
          if (debouncedCodeQuery) params.set('asset_code', debouncedCodeQuery);
          if (debouncedIssuerQuery) params.set('asset_issuer', debouncedIssuerQuery);
          params.set('limit', '30');
          params.set('order', 'desc');

          const res = await fetch(`${baseUrl}/assets?${params.toString()}`);
          if (!res.ok) throw new Error(`Horizon error: ${res.status}`);
          const json = await res.json();
          const records = json?._embedded?.records || [];
          const mapped: AssetListItem[] = records.map((r: any) => ({
            asset_code: r.asset_code || 'UNKNOWN',
            asset_type: r.asset_type || '',
            asset_issuer: r.asset_issuer || undefined,
            accounts_authorized: r.accounts?.authorized ?? 0,
            accounts_unauthorized: r.accounts?.unauthorized ?? 0,
            accounts_pending: r.accounts?.authorized_to_maintain_liabilities ?? 0,
            balance_authorized: r.balances?.authorized ?? '0',
            num_claimable_balances: r.num_claimable_balances ?? 0,
            num_liquidity_pools: r.num_liquidity_pools ?? 0,
            num_contracts: r.num_contracts ?? 0,
            flags: r.flags ?? { auth_required: false, auth_revocable: false, auth_immutable: false, auth_clawback_enabled: false },
          }));
          mapped.sort((a, b) => b.accounts_authorized - a.accounts_authorized);
          if (!isMounted) return;
          setAssets(mapped);
          setDetails(null);
          setRank(0);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load assets.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [assetSlug, debouncedCodeQuery, debouncedIssuerQuery]);

  if (error) {
    return <ShowError message={error} />;
  }

  if (assetSlug && isLoading) {
    return (
      <Loading
        title="Loading asset"
        description="Fetching asset details."
      />
    );
  }

  if (assetSlug && details) {
    return (
      <>
        <div className="block md:hidden">
          <AssetMobileView asset={details} rank={rank} />
        </div>
        <div className="hidden md:block">
          <AssetDesktopView asset={details} rank={rank} />
        </div>
      </>
    );
  }

  const isListLoading = !assetSlug && isLoading;
  const listAssets = assets || [];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[1400px] px-3 py-2 md:p-4">

        {/* Header */}
        <div className="mb-3 md:mb-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg md:rounded-xl bg-sky-50 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400 transition hover:bg-sky-100 dark:hover:bg-sky-900/60 shrink-0"
              >
                <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-base md:text-xl font-bold text-[var(--text-primary)]">Assets</h1>
                <p className="text-[11px] md:text-xs text-[var(--text-tertiary)]">Search assets on Horizon</p>
              </div>
            </div>
            <Link href="/markets" className="text-[11px] md:text-sm font-medium text-sky-600 hover:text-sky-500 transition-colors">
              Markets
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="mb-3 md:mb-4 grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={codeQuery}
              onChange={(e) => setCodeQuery(e.target.value)}
              placeholder="Asset code (e.g. USDC, BRS0001)"
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] pl-9 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 text-sm"
            />
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <input
              type="text"
              value={issuerQuery}
              onChange={(e) => setIssuerQuery(e.target.value)}
              placeholder="Filter by issuer (optional)"
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] pl-9 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 text-sm font-mono"
            />
          </div>
        </div>

        {/* Results count */}
        {!isListLoading && (
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[var(--primary-blue)]/10 text-[var(--primary-blue)] text-[11px] font-bold">
              {listAssets.length} results
            </span>
            {isLoading && (
              <svg className="w-3.5 h-3.5 animate-spin text-sky-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
          </div>
        )}

        {/* Desktop: Table */}
        <div className="hidden md:block rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full sc-table">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50">
                  <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">Asset</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">Issuer</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">Flags</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right whitespace-nowrap">Holders</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right whitespace-nowrap">Supply</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right whitespace-nowrap">Pools</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right whitespace-nowrap">Contracts</th>
                  <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-center whitespace-nowrap w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bg-primary)]">
                {isListLoading ? (
                  Array.from({ length: 12 }).map((_, i) => (
                    <tr key={i} className="h-[48px]">
                      <td className="py-2.5 px-4"><div className="h-4 w-24 bg-[var(--bg-tertiary)] rounded animate-pulse" /></td>
                      <td className="py-2.5 px-3"><div className="h-4 w-20 bg-[var(--bg-tertiary)] rounded animate-pulse" /></td>
                      <td className="py-2.5 px-3"><div className="h-4 w-16 bg-[var(--bg-tertiary)] rounded animate-pulse" /></td>
                      <td className="py-2.5 px-3"><div className="h-4 w-12 bg-[var(--bg-tertiary)] rounded animate-pulse ml-auto" /></td>
                      <td className="py-2.5 px-3"><div className="h-4 w-16 bg-[var(--bg-tertiary)] rounded animate-pulse ml-auto" /></td>
                      <td className="py-2.5 px-3"><div className="h-4 w-8 bg-[var(--bg-tertiary)] rounded animate-pulse ml-auto" /></td>
                      <td className="py-2.5 px-3"><div className="h-4 w-8 bg-[var(--bg-tertiary)] rounded animate-pulse ml-auto" /></td>
                      <td className="py-2.5 px-4"><div className="h-4 w-6 bg-[var(--bg-tertiary)] rounded animate-pulse mx-auto" /></td>
                    </tr>
                  ))
                ) : listAssets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-[var(--text-muted)] text-sm">
                      No assets found.
                    </td>
                  </tr>
                ) : (
                  listAssets.map((a) => (
                    <tr
                      key={`${a.asset_code}:${a.asset_issuer}`}
                      className="hover:bg-sky-50/30 dark:hover:bg-sky-900/10 transition-colors group cursor-pointer"
                      onClick={() => { window.location.href = assetRoute(a.asset_code, a.asset_issuer); }}
                    >
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/30 text-[10px] font-bold text-sky-600 dark:text-sky-400 shrink-0">
                            {getAssetTypeBadge(a.asset_type)}
                          </span>
                          <span className="font-mono text-[13px] font-semibold text-[var(--text-primary)]">
                            {a.asset_code}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {a.asset_issuer ? (
                          <Link
                            href={addressRoute(a.asset_issuer)}
                            className="font-mono text-[12px] text-sky-600 hover:text-sky-500 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {shortenAddress(a.asset_issuer, 6)}
                          </Link>
                        ) : (
                          <span className="text-[12px] text-[var(--text-muted)]">Native</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <FlagBadges flags={a.flags} />
                        {!a.flags.auth_required && !a.flags.auth_revocable && !a.flags.auth_clawback_enabled && !a.flags.auth_immutable && (
                          <span className="text-[11px] text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-[12px] font-medium text-[var(--text-primary)]">
                          {formatNumber(a.accounts_authorized)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-[12px] font-medium text-[var(--text-primary)]">
                          {formatBalance(a.balance_authorized)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`text-[12px] ${a.num_liquidity_pools > 0 ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)]'}`}>
                          {a.num_liquidity_pools}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`text-[12px] ${a.num_contracts > 0 ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)]'}`}>
                          {a.num_contracts}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-sky-500 transition-colors inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile: Cards */}
        <div className="md:hidden">
          {isListLoading ? (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] divide-y divide-[var(--border-subtle)]">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="px-3 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-4 w-24 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                    <div className="h-3 w-16 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                  </div>
                  <div className="h-3 w-40 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : listAssets.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)] text-sm">No assets found.</div>
          ) : (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] divide-y divide-[var(--border-subtle)]">
              {listAssets.map((a) => (
                <Link
                  key={`${a.asset_code}:${a.asset_issuer}`}
                  href={assetRoute(a.asset_code, a.asset_issuer)}
                  className="block px-3 py-2.5 active:bg-[var(--bg-tertiary)] transition-colors"
                >
                  {/* Row 1: Asset code + type badge + flags + chevron */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-900/30 text-[9px] font-bold text-sky-600 dark:text-sky-400 shrink-0">
                      {getAssetTypeBadge(a.asset_type)}
                    </span>
                    <span className="font-mono text-[13px] font-semibold text-[var(--text-primary)]">
                      {a.asset_code}
                    </span>
                    <FlagBadges flags={a.flags} />
                    <span className="flex-1" />
                    <svg className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  {/* Row 2: Issuer */}
                  <div className="font-mono text-[10px] text-[var(--text-muted)] truncate mb-1.5">
                    {a.asset_issuer ? shortenAddress(a.asset_issuer, 8) : 'Native'}
                  </div>
                  {/* Row 3: Stats */}
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="text-[var(--text-tertiary)]">
                      <span className="font-medium text-[var(--text-primary)]">{formatNumber(a.accounts_authorized)}</span> holders
                    </span>
                    <span className="text-[var(--text-tertiary)]">
                      <span className="font-medium text-[var(--text-primary)]">{formatBalance(a.balance_authorized)}</span> supply
                    </span>
                    {a.num_liquidity_pools > 0 && (
                      <span className="text-[var(--text-tertiary)]">
                        <span className="font-medium text-[var(--text-primary)]">{a.num_liquidity_pools}</span> pools
                      </span>
                    )}
                    {a.num_contracts > 0 && (
                      <span className="text-[var(--text-tertiary)]">
                        <span className="font-medium text-[var(--text-primary)]">{a.num_contracts}</span> contracts
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
