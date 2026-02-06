import { notFound, redirect } from 'next/navigation';
import { getAssetDetails, getMarketAssets } from '@/lib/stellar';
import AssetDesktopView from '@/components/desktop/AssetDesktopView';
import AssetMobileView from '@/components/mobile/AssetMobileView';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ asset: string }>;
}

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

export default async function AssetDetailsRoute({ params }: PageProps) {
  const { asset } = await params;
  const parsed = parseAssetSlug(asset);
  if (!parsed) notFound();

  const code = parsed.code;
  const issuer = parsed.issuer;

  // Normalize native asset to the canonical slug.
  if (code.toUpperCase() === 'XLM' && !issuer && asset !== 'XLM-native') {
    redirect('/assets/XLM-native');
  }

  const details = await getAssetDetails(code, issuer);
  if (!details) notFound();

  const marketAssets = await getMarketAssets();
  const rank = marketAssets.findIndex(a => a.code === details.code) + 1;

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

