'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function inferQueryParamName(query: string): 'txHash' | 'address' {
  return /^[a-f0-9]{64}$/i.test(query.trim()) ? 'txHash' : 'address';
}

function buildInvestigationRedirect(searchParams: URLSearchParams): string {
  const target = (searchParams.get('q') || searchParams.get('address') || searchParams.get('txHash') || '').trim();
  const direction = searchParams.get('direction') || 'both';

  if (!target) {
    const query = searchParams.toString();
    return `/investigate${query ? `?${query}` : ''}`;
  }

  const params = new URLSearchParams();
  params.set('direction', direction);

  if (inferQueryParamName(target) === 'txHash') {
    params.set('txHash', target);
    return `/investigate?${params.toString()}`;
  }

  return `/investigate/${encodeURIComponent(target)}?${params.toString()}`;
}

export default function LegacyInvestigationRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    router.replace(buildInvestigationRedirect(new URLSearchParams(searchParams.toString())));
  }, [router, searchParams]);

  return null;
}
