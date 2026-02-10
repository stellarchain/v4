'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname, useSearchParams, notFound, useRouter } from 'next/navigation';
import { getAssetDetails, getMarketAssets } from '@/lib/stellar';
import AssetDesktopView from '@/components/desktop/AssetDesktopView';
import AssetMobileView from '@/components/mobile/AssetMobileView';
import Loading from '@/components/ui/Loading';
import { getDetailRouteValue } from '@/lib/routeDetail';


function parseAssetSlug(slug: string): { code: string; issuer?: string } | null {
  const decoded = decodeURIComponent(slug);
  const idx = decoded.lastIndexOf('-');
  if (idx <= 0) return null;
  const code = decoded.slice(0, idx);
  const issuer = decoded.slice(idx + 1);
  if (!code) return null;
  if (!issuer) return null;
  if (issuer === 'native') return { code, issuer: undefined };
  return { code, issuer };
}

export default function AssetDetailsRoute() {
  const params = useParams<{ asset?: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const asset = getDetailRouteValue({
    pathname,
    searchParams,
    queryKey: 'id',
    routeParam: params.asset,
    aliases: ['/assets'],
  });

  const [details, setDetails] = useState<any>(null);
  const [rank, setRank] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const parsed = parseAssetSlug(asset);
        if (!parsed) {
          setError('Invalid asset format');
          return;
        }

        const code = parsed.code;
        const issuer = parsed.issuer;

        // Normalize native asset to the canonical slug.
        if (code.toUpperCase() === 'XLM' && !issuer && asset !== 'XLM-native') {
          router.replace('/assets/XLM-native');
          return;
        }

        const [assetDetails, marketAssets] = await Promise.all([
          getAssetDetails(code, issuer),
          getMarketAssets(),
        ]);

        if (!assetDetails) {
          setError('Asset not found');
          return;
        }

        const assetRank = marketAssets.findIndex(a => a.code === assetDetails.code) + 1;
        setDetails(assetDetails);
        setRank(assetRank);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load asset details.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [asset, router]);

  if (isLoading) {
    return <Loading title="Loading asset" description="Fetching asset details." />;
  }

  if (error || !details) {
    notFound();
  }

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
