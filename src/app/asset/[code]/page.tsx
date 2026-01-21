import { getAssetDetails, getMarketAssets } from '@/lib/stellar';
import { notFound } from 'next/navigation';
import AssetDesktopView from '@/components/desktop/AssetDesktopView';
import AssetMobileView from '@/components/mobile/AssetMobileView';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ issuer?: string }>;
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
    <>
      {/* Mobile View */}
      <div className="block md:hidden">
        <AssetMobileView asset={asset} />
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <AssetDesktopView asset={asset} rank={rank} />
      </div>
    </>
  );
}
