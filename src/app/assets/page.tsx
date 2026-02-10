'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getAssetDetails, getBaseUrl, getMarketAssets } from '@/lib/stellar';
import { usePathname, useSearchParams } from 'next/navigation';
import { Horizon } from '@stellar/stellar-sdk';
import Loading from '@/components/ui/Loading';
import ShowError from '@/components/ui/ShowError';
import AssetDesktopView from '@/components/desktop/AssetDesktopView';
import AssetMobileView from '@/components/mobile/AssetMobileView';
import { assetRoute } from '@/lib/routes';
import { getDetailRouteValue } from '@/lib/routeDetail';

type Asset = Horizon.ServerApi.AssetRecord;

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

  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [details, setDetails] = useState<any>(null);
  const [rank, setRank] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

          const marketAssets = await getMarketAssets();

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
          const server = new Horizon.Server(getBaseUrl());
          const res = await server.assets().order('desc').limit(50).call();
          if (!isMounted) return;
          setAssets(res.records || []);
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
  }, [assetSlug]);

  if (error) {
    return <ShowError message={error} />;
  }

  if (isLoading) {
    return (
      <Loading
        title={assetSlug ? 'Loading asset' : 'Loading assets'}
        description={assetSlug ? 'Fetching asset details.' : 'Fetching latest assets from Horizon.'}
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

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-4">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Assets</h1>
          <p className="text-sm text-[var(--text-tertiary)]">Latest assets from Horizon</p>
        </div>
        <Link href="/markets" className="text-sm font-medium text-[var(--info)] hover:underline">
          Markets
        </Link>
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1">
          {assets && assets.map((a) => (
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
        </div>
      </div>
    </div>
  );
}
