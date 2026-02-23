'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { APIContract } from '@/lib/stellar';
import ContractsClient from './ContractsClient';
import ContractDetailsClientPage from '@/app/contract/[id]/client-page';
import { getDetailRouteValue } from '@/lib/shared/routeDetail';
import { isContractAddress } from '@/lib/soroban';
import { apiEndpoints, getApiV1Data } from '@/services/api';

type ContractFilter = 'all' | 'verified' | 'token' | 'contract';
const VALID_FILTERS: ContractFilter[] = ['all', 'verified', 'token', 'contract'];
const PAGE_SIZE = 25;

interface EnhancedContract {
  id: string;
  name: string;
  type: string;
  symbol?: string;
  description?: string;
  verified: boolean;
  sep41?: boolean;
  website?: string;
  operationCount: number;
  lastActivity?: string;
  wasmId?: string;
  createdAt?: string;
}

function transformContract(apiContract: APIContract): EnhancedContract {
  const verifiedMetadata = apiContract.verifiedMetadata || null;

  let type = 'contract';
  if (apiContract.sac || apiContract.assetCode) {
    type = 'token';
  } else if (verifiedMetadata?.metadataType) {
    type = verifiedMetadata.metadataType;
  }

  let name = type === 'token' ? 'TOKEN' : 'Smart Contract';
  if (verifiedMetadata?.displayName) {
    name = verifiedMetadata.displayName;
  } else if (apiContract.assetCode) {
    name = apiContract.assetCode;
  }

  return {
    id: apiContract.contractId,
    name,
    type,
    symbol: apiContract.assetCode || verifiedMetadata?.symbol,
    description: verifiedMetadata?.description,
    verified: Boolean(apiContract.sourceCodeVerified || verifiedMetadata?.verified),
    sep41: apiContract.sac || !!apiContract.assetCode || Boolean(verifiedMetadata?.sep41),
    website: verifiedMetadata?.website,
    operationCount: Number(apiContract.totalInvokes ?? 0),
    lastActivity: apiContract.createdAt,
    wasmId: apiContract.wasmId || undefined,
    createdAt: apiContract.createdAt,
  };
}

function buildQueryParams(page: number, filter: ContractFilter, search: string) {
  const params: Record<string, string | number | boolean> = {
    page,
    itemsPerPage: PAGE_SIZE,
    pagination: true,
    'order[totalInvokes]': 'desc',
  };

  if (filter === 'verified') params.sourceCodeVerified = true;
  else if (filter === 'token') params.sac = true;
  else if (filter === 'contract') params.sac = false;

  if (search) params.search = search;

  return params;
}

const CONTRACT_CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'verified', name: 'Verified' },
  { id: 'token', name: 'Token' },
  { id: 'contract', name: 'Contract' },
];

export default function ContractsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Detail route check
  const detailsContractId = getDetailRouteValue({
    pathname,
    searchParams,
    queryKey: 'id',
    aliases: ['/contracts'],
  });
  const hasDetailsRoute = Boolean(detailsContractId);

  // Read URL params
  const urlQuery = (searchParams.get('q') || '').trim();
  const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const urlFilter = (VALID_FILTERS.includes(searchParams.get('filter') as ContractFilter) ? searchParams.get('filter') : 'all') as ContractFilter;

  const [contracts, setContracts] = useState<EnhancedContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(urlPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filter, setFilter] = useState<ContractFilter>(urlFilter);
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(urlQuery);

  // Sync from URL changes (back/forward)
  useEffect(() => {
    if (hasDetailsRoute) return;
    if (urlQuery !== searchQuery) {
      setSearchQuery(urlQuery);
      setDebouncedSearchQuery(urlQuery);
    }
    if (urlPage !== currentPage) {
      setCurrentPage(urlPage);
    }
    if (urlFilter !== filter) {
      setFilter(urlFilter);
    }
  }, [urlQuery, urlPage, urlFilter]);

  // Debounce search
  useEffect(() => {
    if (hasDetailsRoute) return;
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync state to URL
  useEffect(() => {
    if (hasDetailsRoute) return;

    // If local state is still catching up from a URL change (back/forward or child-driven replace),
    // skip writing to URL for this render to avoid clobbering query params.
    if (
      searchQuery !== urlQuery ||
      debouncedSearchQuery !== urlQuery ||
      currentPage !== urlPage ||
      filter !== urlFilter
    ) {
      return;
    }

    const currentQ = (searchParams.get('q') || '').trim();
    const currentP = parseInt(searchParams.get('page') || '1', 10) || 1;
    const currentF = (VALID_FILTERS.includes(searchParams.get('filter') as ContractFilter) ? searchParams.get('filter') : 'all') as ContractFilter;
    if (currentQ === debouncedSearchQuery && currentP === currentPage && currentF === filter) return;

    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.set('q', debouncedSearchQuery);
    if (currentPage > 1) params.set('page', String(currentPage));
    if (filter !== 'all') params.set('filter', filter);

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [
    debouncedSearchQuery,
    currentPage,
    filter,
    searchQuery,
    urlQuery,
    urlPage,
    urlFilter,
    router,
    pathname,
    searchParams,
    hasDetailsRoute,
  ]);

  // Fetch data
  useEffect(() => {
    if (hasDetailsRoute) return;
    let cancelled = false;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const params = buildQueryParams(currentPage, filter, debouncedSearchQuery);
        const data = await getApiV1Data(apiEndpoints.v1.contracts(params));
        if (cancelled) return;

        const transformed = (data.member || [])
          .filter((c: APIContract) => isContractAddress(c.contractId))
          .map(transformContract);

        setContracts(transformed);
        setTotalPages(Math.ceil((data.totalItems || 0) / PAGE_SIZE));
        setTotalItems(data.totalItems || 0);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load contracts.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [currentPage, filter, debouncedSearchQuery, hasDetailsRoute]);

  // Reset to page 1 when search or filter changes
  const searchMountedRef = useRef(false);
  useEffect(() => {
    if (hasDetailsRoute) return;
    if (!searchMountedRef.current) {
      searchMountedRef.current = true;
      return;
    }
    setCurrentPage(1);
  }, [debouncedSearchQuery, filter]);

  if (hasDetailsRoute) {
    return <ContractDetailsClientPage />;
  }

  if (!isLoading && error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Error loading contracts</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const handleFilterChange = (nextFilter: ContractFilter) => {
    setFilter(nextFilter);
    window.scrollTo(0, 0);
  };

  return (
    <ContractsClient
      contracts={contracts}
      stats={{ total: totalItems, contracts: 0, tokens: 0, verified: 0 }}
      categories={CONTRACT_CATEGORIES}
      loading={isLoading}
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItems}
      filter={filter}
      onFilterChange={handleFilterChange}
      onPageChange={handlePageChange}
    />
  );
}
