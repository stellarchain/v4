import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ asset: string }>;
}

export default async function MarketAssetRoute({ params }: PageProps) {
  const { asset } = await params;
  redirect(`/assets/${encodeURIComponent(asset)}`);
}

