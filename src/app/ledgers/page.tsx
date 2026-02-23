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

  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(urlPage);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Store cursors for each page so we can navigate back
  const cursorsRef = useRef<Map<number, string>>(new Map());

  // Sync from URL (back/forward)
  useEffect(() => {
    if (hasDetailsRoute) return;
    if (urlPage !== currentPage) {
      setCurrentPage(urlPage);
    }
  }, [urlPage]);

  // Sync state to URL
  useEffect(() => {
    if (hasDetailsRoute) return;
    const currentP = parseInt(searchParams.get('page') || '1', 10) || 1;
    if (currentP === currentPage) return;

    const params = new URLSearchParams();
    if (currentPage > 1) params.set('page', String(currentPage));

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [currentPage, router, pathname, searchParams]);

  // Fetch data
  useEffect(() => {
    if (hasDetailsRoute) return;
    let cancelled = false;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const cursor = cursorsRef.current.get(currentPage);
        const data = await getLedgers(PAGE_SIZE, 'desc', cursor);
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
  }, [currentPage, hasDetailsRoute]);

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

  return (
    <LedgersPageClient
      ledgers={ledgers}
      loading={isLoading}
      currentPage={currentPage}
      hasNextPage={hasNextPage}
      onPageChange={handlePageChange}
    />
  );
}
