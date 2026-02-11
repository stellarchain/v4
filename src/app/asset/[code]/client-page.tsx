'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname, useSearchParams, notFound } from 'next/navigation';
import { getAssetDetails, getMarketAssets } from '@/lib/stellar';
import AssetDesktopView from '@/components/desktop/AssetDesktopView';
import AssetMobileView from '@/components/mobile/AssetMobileView';
import AssetLoadingShell from '@/components/ui/AssetLoadingShell';
import { getDetailRouteValue } from '@/lib/routeDetail';


export default function AssetPage() {
  const params = useParams<{ code?: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const code = getDetailRouteValue({
    pathname,
    searchParams,
    queryKey: 'code',
    routeParam: params.code,
    aliases: ['/asset'],
  });
  const issuer = searchParams.get('issuer') || undefined;

  const [asset, setAsset] = useState<any>(null);
  const [rank, setRank] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        if (!code) {
          setError('Asset code is missing');
          return;
        }
        const decodedCode = decodeURIComponent(code);
        const [assetData, marketAssets] = await Promise.all([
          getAssetDetails(decodedCode, issuer),
          getMarketAssets(),
        ]);

        if (!assetData) {
          setError('Asset not found');
          return;
        }

        const assetRank = marketAssets.findIndex(a => a.code === assetData.code) + 1;
        setAsset(assetData);
        setRank(assetRank);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load asset details.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [code, issuer]);

  if (isLoading) {
    return <AssetLoadingShell />;
  }

  if (error || !asset) {
    notFound();
  }

  return (
    <>
      {/* Mobile View */}
      <div className="block md:hidden">
        <AssetMobileView asset={asset} rank={rank} />
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <AssetDesktopView asset={asset} rank={rank} />
      </div>
    </>
  );
}
