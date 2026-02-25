'use client';

import { useEffect } from 'react';
import { useParams, usePathname, useSearchParams, useRouter } from 'next/navigation';
import { assetRoute } from '@/lib/shared/routes';


export default function MarketAssetRoute() {
  const params = useParams<{ asset?: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pathAsset = (() => {
    const clean = pathname.replace(/\/+$/, '');
    if (clean.startsWith('/markets/')) return clean.slice('/markets/'.length);
    return '';
  })();
  const asset = (searchParams.get('asset') || params.asset || pathAsset || '').trim();
  const router = useRouter();

  useEffect(() => {
    if (!asset) return;
    router.push(assetRoute(asset));
  }, [asset, router]);

  return null;
}
