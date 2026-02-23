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
type ContractsSort = 'activity' | 'activity_asc' | 'transactions' | 'asset_code';

const VALID_FILTERS: ContractFilter[] = ['all', 'verified', 'token', 'contract'];
const VALID_SORTS: ContractsSort[] = ['activity', 'activity_asc', 'transactions', 'asset_code'];
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
  totalTransactions?: number;
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
    totalTransactions: Number(apiContract.totalTransactions ?? 0),
    lastActivity: apiContract.createdAt,
    wasmId: apiContract.wasmId || undefined,
    createdAt: apiContract.createdAt,
  };
}

function buildQueryParams(page: number, filter: ContractFilter, search: string, sort: ContractsSort) {
  const params: Record<string, string | number | boolean> = {
    page,
    itemsPerPage: PAGE_SIZE,
    pagination: true,
  };

  if (sort === 'activity') params['order[totalInvokes]'] = 'desc';
  else if (sort === 'activity_asc') params['order[totalInvokes]'] = 'asc';
  else if (sort === 'transactions') params['order[totalTransactions]'] = 'desc';
  else if (sort === 'asset_code') params['order[asset_code]'] = 'asc';

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

  const detailsContractId = getDetailRouteValue({
    pathname,
    searchParams,
    queryKey: 'id',
    aliases: ['/contracts'],
  });
  const hasDetailsRoute = Boolean(detailsContractId);

  const urlQuery = (searchParams.get('q') || '').trim();
  const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const urlFilter = (VALID_FILTERS.includes(searchParams.get('filter') as ContractFilter) ? searchParams.get('filter') : 'all') as ContractFilter;
  const urlSort = (VALID_SORTS.includes(searchParams.get('sort') as ContractsSort) ? searchParams.get('sort') : 'activity') as ContractsSort;

  const [contracts, setContracts] = useState<EnhancedContract[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(urlPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filter, setFilter] = useState<ContractFilter>(urlFilter);
  const [sortBy, setSortBy] = useState<ContractsSort>(urlSort);
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(urlQuery);

  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    if (hasDetailsRoute) return;
    setSearchQuery((prev) => (prev === urlQuery ? prev : urlQuery));
    setDebouncedSearchQuery((prev) => (prev === urlQuery ? prev : urlQuery));
    setCurrentPage((prev) => (prev === urlPage ? prev : urlPage));
    setFilter((prev) => (prev === urlFilter ? prev : urlFilter));
    setSortBy((prev) => (prev === urlSort ? prev : urlSort));
  }, [urlQuery, urlPage, urlFilter, urlSort, hasDetailsRoute]);

  useEffect(() => {
    if (hasDetailsRoute) return;
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchQuery, hasDetailsRoute]);

  useEffect(() => {
    if (hasDetailsRoute) return;

    const currentQ = (searchParams.get('q') || '').trim();
    const currentP = parseInt(searchParams.get('page') || '1', 10) || 1;
    const currentF = (VALID_FILTERS.includes(searchParams.get('filter') as ContractFilter) ? searchParams.get('filter') : 'all') as ContractFilter;
    const currentS = (VALID_SORTS.includes(searchParams.get('sort') as ContractsSort) ? searchParams.get('sort') : 'activity') as ContractsSort;

    if (currentQ === debouncedSearchQuery && currentP === currentPage && currentF === filter && currentS === sortBy) {
      return;
    }

    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.set('q', debouncedSearchQuery);
    if (currentPage > 1) params.set('page', String(currentPage));
    if (filter !== 'all') params.set('filter', filter);
    if (sortBy !== 'activity') params.set('sort', sortBy);

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [debouncedSearchQuery, currentPage, filter, sortBy, router, pathname, searchParams, hasDetailsRoute]);

  useEffect(() => {
    if (hasDetailsRoute) return;

    let cancelled = false;

    const fetchData = async () => {
      try {
        if (hasLoadedOnceRef.current) {
          setIsTableLoading(true);
        } else {
          setIsInitialLoading(true);
        }

        const params = buildQueryParams(currentPage, filter, debouncedSearchQuery, sortBy);
        const data = await getApiV1Data(apiEndpoints.v1.contracts(params));
        if (cancelled) return;

        const transformed = (data.member || [])
          .filter((c: APIContract) => isContractAddress(c.contractId))
          .map(transformContract);

        setContracts(transformed);
        setTotalPages(Math.max(1, Math.ceil((data.totalItems || 0) / PAGE_SIZE)));
        setTotalItems(data.totalItems || 0);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load contracts.');
        }
      } finally {
        if (!cancelled) {
          hasLoadedOnceRef.current = true;
          setIsInitialLoading(false);
          setIsTableLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [currentPage, filter, sortBy, debouncedSearchQuery, hasDetailsRoute]);

  const resetPageRef = useRef(false);
  useEffect(() => {
    if (hasDetailsRoute) return;
    if (!resetPageRef.current) {
      resetPageRef.current = true;
      return;
    }
    setCurrentPage(1);
  }, [debouncedSearchQuery, filter, sortBy, hasDetailsRoute]);

  if (hasDetailsRoute) {
    return <ContractDetailsClientPage />;
  }

  if (!isInitialLoading && error) {
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
    if (nextFilter === filter) return;
    setFilter(nextFilter);
    window.scrollTo(0, 0);
  };

  const handleSortChange = (nextSort: ContractsSort) => {
    if (nextSort === sortBy) return;
    setSortBy(nextSort);
    window.scrollTo(0, 0);
  };

  return (
    <ContractsClient
      contracts={contracts}
      stats={{ total: totalItems, contracts: 0, tokens: 0, verified: 0 }}
      categories={CONTRACT_CATEGORIES}
      loading={isInitialLoading}
      tableLoading={isTableLoading}
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItems}
      filter={filter}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      sortBy={sortBy}
      onSortChange={handleSortChange}
      onFilterChange={handleFilterChange}
      onPageChange={handlePageChange}
    />
  );
}
