'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  PaymentFlowDirection,
  PaymentFlowInvestigationResponse,
} from '@/lib/stellar';
import { fetchPaymentFlowInvestigationData } from '@/services/api';
import PaymentFlowInvestigationView from '@/components/scam-flow/PaymentFlowInvestigationView';

interface InvestigateClientProps {
  pathAccount?: string;
}

function normalizeDirection(value: string | null): PaymentFlowDirection {
  return value === 'incoming' || value === 'outgoing' || value === 'both' ? value : 'both';
}

function inferQueryParamName(query: string): 'txHash' | 'address' {
  return /^[a-f0-9]{64}$/i.test(query.trim()) ? 'txHash' : 'address';
}

function buildInvestigationUrl(target: string, direction: PaymentFlowDirection): string {
  const normalizedTarget = target.trim();
  const params = new URLSearchParams();
  params.set('direction', direction);

  if (inferQueryParamName(normalizedTarget) === 'txHash') {
    params.set('txHash', normalizedTarget);
    return `/investigate?${params.toString()}`;
  }

  return `/investigate/${encodeURIComponent(normalizedTarget)}?${params.toString()}`;
}

export default function InvestigateClient({ pathAccount = '' }: InvestigateClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const decodedPathAccount = pathAccount ? decodeURIComponent(pathAccount).trim() : '';
  const initialQuery = decodedPathAccount || searchParams.get('q') || searchParams.get('address') || searchParams.get('txHash') || '';
  const initialDirection = normalizeDirection(searchParams.get('direction'));
  const [query, setQuery] = useState(initialQuery);
  const [direction, setDirection] = useState<PaymentFlowDirection>(initialDirection);
  const [investigation, setInvestigation] = useState<PaymentFlowInvestigationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeQuery = useMemo(() => (
    decodedPathAccount || searchParams.get('q') || searchParams.get('address') || searchParams.get('txHash') || ''
  ).trim(), [decodedPathAccount, searchParams]);
  const activeDirection = normalizeDirection(searchParams.get('direction'));

  const loadInvestigation = useCallback(async (target: string, nextDirection: PaymentFlowDirection) => {
    const normalizedTarget = target.trim();
    if (!normalizedTarget) {
      setInvestigation(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const targetParam = inferQueryParamName(normalizedTarget);
      const data = await fetchPaymentFlowInvestigationData({
        [targetParam]: normalizedTarget,
        direction: nextDirection,
        limit: 50,
      }) as PaymentFlowInvestigationResponse;
      setInvestigation(data);
    } catch (err) {
      setInvestigation(null);
      setError(err instanceof Error ? err.message : 'Failed to load payment flow investigation');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const shouldCanonicalizeAddressQuery = !decodedPathAccount
      && activeQuery
      && inferQueryParamName(activeQuery) === 'address'
      && (searchParams.has('q') || searchParams.has('address'));

    if (shouldCanonicalizeAddressQuery) {
      router.replace(buildInvestigationUrl(activeQuery, activeDirection));
      return;
    }

    setQuery(activeQuery);
    setDirection(activeDirection);
    if (activeQuery) {
      loadInvestigation(activeQuery, activeDirection);
    } else {
      setInvestigation(null);
      setError(null);
    }
  }, [activeDirection, activeQuery, decodedPathAccount, loadInvestigation, router, searchParams]);

  const submitSearch = () => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return;

    router.replace(buildInvestigationUrl(normalizedQuery, direction));
  };

  const changeDirection = (nextDirection: PaymentFlowDirection) => {
    setDirection(nextDirection);
    const normalizedQuery = query.trim();
    if (!normalizedQuery || !activeQuery) return;

    router.replace(buildInvestigationUrl(normalizedQuery, nextDirection));
  };

  return (
    <div className="mx-auto max-w-[1400px] p-4 lg:p-4">
      <PaymentFlowInvestigationView
        query={query}
        direction={direction}
        investigation={investigation}
        isLoading={isLoading}
        error={error}
        onQueryChange={setQuery}
        onDirectionChange={changeDirection}
        onSubmit={submitSearch}
      />
    </div>
  );
}
