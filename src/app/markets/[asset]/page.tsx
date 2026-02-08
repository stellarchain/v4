'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function MarketAssetRoute() {
  const { asset } = useParams<{ asset: string }>();
  const router = useRouter();

  useEffect(() => {
    router.push(`/assets/${encodeURIComponent(asset)}`);
  }, [asset, router]);

  return null;
}

