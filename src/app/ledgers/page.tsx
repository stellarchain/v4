'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Ledger } from '@/lib/stellar';
import { getLedgers } from '@/lib/stellar';
import LedgersPageClient from '@/components/LedgersPageClient';
import LedgerDetailsClientPage from '@/app/ledger/[sequence]/client-page';
import { getDetailRouteValue } from '@/lib/shared/routeDetail';

const PAGE_SIZE = 25;

export default function LedgersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const detailsSequence = getDetailRouteValue({
    pathname,
    searchParams,
    queryKey: 'sequence',
    aliases: ['/ledgers'],
  });
  const hasDetailsRoute = Boolean(detailsSequence);

  const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const urlOrder = searchParams.get('order') === 'asc' ? 'asc' : 'desc';

  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(urlPage);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [order, setOrder] = useState<'asc' | 'desc'>(urlOrder);

  // Store cursors for each page so we can navigate back
  const cursorsRef = useRef<Map<number, string>>(new Map());

  // Sync from URL (back/forward)
  useEffect(() => {
    if (hasDetailsRoute) return;
    setCurrentPage((prev) => (prev === urlPage ? prev : urlPage));
    setOrder((prev) => {
      if (prev === urlOrder) return prev;
      cursorsRef.current = new Map();
      return urlOrder;
    });
  }, [urlPage, urlOrder, hasDetailsRoute]);

  // Sync state to URL
  useEffect(() => {
    if (hasDetailsRoute) return;
    const currentP = parseInt(searchParams.get('page') || '1', 10) || 1;
    const currentOrderInUrl = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
    if (currentP === currentPage && currentOrderInUrl === order) return;

    const params = new URLSearchParams();
    if (currentPage > 1) params.set('page', String(currentPage));
    if (order === 'asc') params.set('order', 'asc');

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [currentPage, order, router, pathname, searchParams, hasDetailsRoute]);

  // Fetch data
  useEffect(() => {
    if (hasDetailsRoute) return;
    let cancelled = false;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const cursor = cursorsRef.current.get(currentPage);
        const data = await getLedgers(PAGE_SIZE, order, cursor);
        if (cancelled) return;

        const records: Ledger[] = data.records || [];

        // Store cursor for next page
        if (records.length > 0) {
          const lastRecord = records[records.length - 1];
          cursorsRef.current.set(currentPage + 1, lastRecord.paging_token);
        }

        setLedgers(records);
        setHasNextPage(records.length >= PAGE_SIZE);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load ledgers.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [currentPage, hasDetailsRoute, order]);

  if (hasDetailsRoute) {
    return <LedgerDetailsClientPage />;
  }

  if (!isLoading && error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Error loading ledgers</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const handlePageChange = (page: number) => {
    if (page < 1) return;
    if (page > currentPage && !hasNextPage) return;
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const handleOrderChange = (nextOrder: 'asc' | 'desc') => {
    if (nextOrder === order) return;
    setOrder(nextOrder);
    setCurrentPage(1);
    cursorsRef.current = new Map();
    window.scrollTo(0, 0);
  };

  return (
    <LedgersPageClient
      ledgers={ledgers}
      loading={isLoading}
      currentPage={currentPage}
      hasNextPage={hasNextPage}
      onPageChange={handlePageChange}
      order={order}
      onOrderChange={handleOrderChange}
    />
  );
}
