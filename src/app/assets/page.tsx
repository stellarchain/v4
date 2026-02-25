'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getAssetDetails, getMarketAssets } from '@/lib/stellar';
import { usePathname, useSearchParams } from 'next/navigation';
import Loading from '@/components/ui/Loading';
import ShowError from '@/components/ui/ShowError';
import AssetDesktopView from '@/components/desktop/AssetDesktopView';
import AssetMobileView from '@/components/mobile/AssetMobileView';
import { assetRoute } from '@/lib/shared/routes';
import { getDetailRouteValue } from '@/lib/shared/routeDetail';
import { apiEndpoints, getApiV1Data } from '@/services/api';

type AssetListItem = {
  asset_code: string;
  asset_issuer?: string;
  num_accounts?: number;
  amount?: string | number;
};

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

    // Prefer strict Stellar issuer parsing first (G + 55 base32 chars).
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
          const params: Record<string, string | number> = {
            page: 1,
            itemsPerPage: 30,
            'order[ratingAverage]': 'asc',
          };
          if (debouncedCodeQuery) params.code = debouncedCodeQuery;
          if (debouncedIssuerQuery) params.issuer = debouncedIssuerQuery;

          const res = await getApiV1Data(apiEndpoints.v1.assets(params));
          const members = Array.isArray(res?.member) ? res.member : [];
          const mapped: AssetListItem[] = members.map((item: any) => ({
            asset_code: item.code || 'UNKNOWN',
            asset_issuer: item.issuer || undefined,
            num_accounts: Number(item?.latestStatistic?.accounts ?? item?.accounts ?? 0),
            amount: item?.latestStatistic?.supply ?? item?.supply ?? 0,
          }));
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
        title={assetSlug ? 'Loading asset' : 'Loading assets'}
        description={assetSlug ? 'Fetching asset details.' : 'Fetching assets from API v1.'}
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
    <div className="max-w-[1400px] mx-auto px-4 py-4">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Assets</h1>
          <p className="text-sm text-[var(--text-tertiary)]">Assets from API v1</p>
        </div>
        <Link href="/markets" className="text-sm font-medium text-[var(--info)] hover:underline">
          Markets
        </Link>
      </div>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          type="text"
          value={codeQuery}
          onChange={(e) => setCodeQuery(e.target.value)}
          placeholder="Search by code (e.g. USDC)"
          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 text-sm"
        />
        <input
          type="text"
          value={issuerQuery}
          onChange={(e) => setIssuerQuery(e.target.value)}
          placeholder="Filter by issuer (optional)"
          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 text-sm font-mono"
        />
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1">
          {isListLoading ? (
            Array.from({ length: 12 }).map((_, i) => (
              <div
                key={`asset-skeleton-${i}`}
                className="px-4 py-3 border-b border-[var(--border-subtle)] last:border-b-0"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="h-4 w-20 rounded bg-[var(--border-default)] animate-pulse" />
                    <div className="h-3 w-48 rounded bg-[var(--border-default)] animate-pulse mt-2" />
                  </div>
                  <div className="text-right shrink-0">
                    <div className="h-3 w-24 rounded bg-[var(--border-default)] animate-pulse" />
                    <div className="h-3 w-20 rounded bg-[var(--border-default)] animate-pulse mt-2 ml-auto" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <>
              {listAssets.length === 0 && (
                <div className="px-4 py-6 text-sm text-[var(--text-tertiary)]">No assets found for current filters.</div>
              )}
              {listAssets.map((a) => (
                <Link
                  key={`${a.asset_code}:${a.asset_issuer}`}
                  href={assetRoute(a.asset_code, a.asset_issuer)}
                  className="px-4 py-3 border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-mono text-sm text-[var(--text-primary)] truncate">
                        {a.asset_code}
                      </div>
                      <div className="font-mono text-[11px] text-[var(--text-muted)] truncate">
                        {a.asset_issuer}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[11px] text-[var(--text-tertiary)]">
                        {Number((a as any).num_accounts || 0).toLocaleString()} holders
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {Number((a as any).amount || 0).toLocaleString()} supply
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
