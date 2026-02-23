'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { shortenAddress, timeAgo } from '@/lib/stellar';
import { StrKey } from '@stellar/stellar-sdk';
import GliderTabs from '@/components/ui/GliderTabs';
import InlineSkeleton from '@/components/ui/InlineSkeleton';
import { apiEndpoints, getApiV1Data } from '@/services/api';
import { useNetwork } from '@/contexts/NetworkContext';

// Convert hex contract ID to StrKey format (C...)
function hexToContractStrKey(hexId: string): string {
  try {
    if (hexId.startsWith('C') && hexId.length === 56) {
      return hexId;
    }
    const buffer = Buffer.from(hexId, 'hex');
    return StrKey.encodeContract(buffer);
  } catch (e) {
    console.error('Failed to convert contract ID:', e);
    return hexId;
  }
}

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
  functions?: string[];
  wasmId?: string;
  createdAt?: string;
  createTxHash?: string;
}

interface Category {
  id: string;
  name: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  total: number;
  perPage: number;
}

interface ContractsDesktopViewProps {
  contracts: EnhancedContract[];
  stats: {
    total: number;
    contracts: number;
    tokens: number;
    verified: number;
  };
  categories: Category[];
  pagination: PaginationInfo;
  loading?: boolean;
}

const PAGE_SIZE = 25;
type ContractsSort =
  | 'activity'
  | 'activity_asc'
  | 'transactions'
  | 'asset_code';

// Pagination component
const PaginationControls = ({ currentPage, totalPages, onPageChange, loading }: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading: boolean;
}) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-1.5 px-4 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]/50">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || loading}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-muted)] hover:bg-sky-50 hover:border-sky-200 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {getPageNumbers().map((page, idx) => (
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="text-[var(--text-muted)] text-xs px-1">...</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page as number)}
            disabled={loading}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-bold transition-colors ${currentPage === page
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-[var(--text-muted)] hover:bg-sky-50 hover:text-sky-700'
              }`}
          >
            {page}
          </button>
        )
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages || loading}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-muted)] hover:bg-sky-50 hover:border-sky-200 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {loading && (
        <svg className="w-4 h-4 animate-spin ml-2 text-sky-500" aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}

      <span className="ml-3 text-[10px] font-medium text-[var(--text-muted)]">
        Page {currentPage} of {totalPages}
      </span>
    </div>
  );
};

export default function ContractsDesktopView({
  contracts: initialContracts,
  stats,
  categories,
  pagination: initialPagination,
  loading = false,
}: ContractsDesktopViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = (searchParams.get('q') || '').trim();
  const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const urlFilter = (['all', 'verified', 'token', 'contract'].includes(searchParams.get('filter') || '') ? searchParams.get('filter') : 'all') as string;

  const [contracts, setContracts] = useState<EnhancedContract[]>(initialContracts);
  const [pagination, setPagination] = useState(initialPagination);
  const [filter, setFilter] = useState<string>(urlFilter);
  const [searchInput, setSearchInput] = useState(urlQuery);
  const [sortBy, setSortBy] = useState<ContractsSort>('activity');
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(urlQuery);
  const lastFetchKeyRef = useRef<string>('');
  const fetchInFlightRef = useRef(false);
  const { networkConfig } = useNetwork();

  useEffect(() => {
    setContracts(initialContracts);
  }, [initialContracts]);

  useEffect(() => {
    setPagination(initialPagination);
  }, [initialPagination]);

  useEffect(() => {
    setSearchInput(urlQuery);
    setDebouncedSearch(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  // Sync page, filter, and search to URL
  const syncUrlRef = useRef(false);
  useEffect(() => {
    if (!syncUrlRef.current) {
      syncUrlRef.current = true;
      return;
    }

    const params = new URLSearchParams();
    if (pagination.currentPage > 1) params.set('page', String(pagination.currentPage));
    if (filter !== 'all') params.set('filter', filter);
    if (debouncedSearch) params.set('q', debouncedSearch);

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pagination.currentPage, filter, debouncedSearch, router, pathname]);

  const buildContractsQueryParams = useCallback(
    (pageNum: number, activeSort: ContractsSort, rawQuery: string, activeFilter: string) => {
      const params: Record<string, string | number | boolean> = {
        page: pageNum,
        itemsPerPage: PAGE_SIZE,
        pagination: true,
      };

      if (activeSort === 'activity') params['order[totalInvokes]'] = 'desc';
      if (activeSort === 'activity_asc') params['order[totalInvokes]'] = 'asc';
      if (activeSort === 'transactions') params['order[totalTransactions]'] = 'desc';
      if (activeSort === 'asset_code') params['order[asset_code]'] = 'asc';

      if (activeFilter === 'verified') {
        params.sourceCodeVerified = true;
      } else if (activeFilter === 'token') {
        params.sac = true;
      } else if (activeFilter === 'contract') {
        params.sac = false;
      }

      const query = rawQuery.trim();
      if (query) {
        params.search = query;
      }

      return params;
    },
    []
  );

  // Transform raw API contracts into EnhancedContract[]
  const transformContracts = useCallback((apiContracts: any[]): EnhancedContract[] => {
    return apiContracts.map((apiContract: any) => {
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

      const contractId = apiContract.contractId;

      return {
        id: contractId,
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
        createTxHash: undefined,
      };
    });
  }, []);

  // Check if a contract matches the current filter
  const matchesFilter = useCallback((contract: EnhancedContract, activeFilter: string): boolean => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'verified') return contract.verified;
    if (activeFilter === 'token') return contract.type === 'token';
    if (activeFilter === 'contract') return contract.type !== 'token';
    return contract.type === activeFilter;
  }, []);

  // Fetch contracts - one API request per user action (tab/sort/search/page)
  const fetchPage = useCallback(async (page: number, activeFilter?: string, activeSearch?: string, activeSort?: ContractsSort) => {
    const currentFilter = activeFilter ?? filter;
    const currentSearch = activeSearch ?? debouncedSearch;
    const currentSort = activeSort ?? sortBy;
    const fetchKey = `${page}|${currentFilter}|${currentSearch}|${currentSort}|${networkConfig.name}`;

    if (fetchInFlightRef.current && lastFetchKeyRef.current === fetchKey) {
      return;
    }

    fetchInFlightRef.current = true;
    lastFetchKeyRef.current = fetchKey;
    setIsLoading(true);
    window.scrollTo(0, 0);
    try {
      const buildUrl = (pageNum: number) => {
        const params = buildContractsQueryParams(pageNum, currentSort, currentSearch, currentFilter);
        return apiEndpoints.v1.contracts(params);
      };

      const data = await getApiV1Data(buildUrl(page));
      const transformed = transformContracts(data.member || []);
      const itemsPerPage = PAGE_SIZE;
      const totalPages = Math.ceil((data.totalItems || 0) / itemsPerPage);

      const filtered = currentFilter === 'all'
        ? transformed
        : transformed.filter(c => matchesFilter(c, currentFilter));

      setContracts(filtered);
      setPagination({
        currentPage: page,
        totalPages,
        total: data.totalItems || 0,
        perPage: itemsPerPage,
      });
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      fetchInFlightRef.current = false;
      setIsLoading(false);
    }
  }, [filter, sortBy, debouncedSearch, transformContracts, matchesFilter, buildContractsQueryParams, networkConfig.name]);

  // On mount: if URL has non-default page/filter, fetch that data
  const initialFetchRef = useRef(false);
  useEffect(() => {
    if (initialFetchRef.current) return;
    initialFetchRef.current = true;
    if (urlPage > 1 || urlFilter !== 'all' || urlQuery) {
      fetchPage(urlPage, urlFilter, urlQuery, sortBy as ContractsSort);
    }
  }, []);

  const handleFilterChange = useCallback((nextFilter: string) => {
    setFilter(nextFilter);
    fetchPage(1, nextFilter, debouncedSearch, sortBy);
  }, [fetchPage, debouncedSearch, sortBy]);

  // Re-fetch when sort/search changes (skip initial mount to avoid duplicate request
  // because initial data is already loaded in parent page).
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    fetchPage(1, filter, debouncedSearch, sortBy);
  }, [sortBy, debouncedSearch, fetchPage, filter]);

  const filteredContracts = useMemo(() => {
    const seen = new Set<string>();
    let result = contracts.filter((contract) => {
      const key = String(contract.id || '').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (filter === 'active') {
      result = result.filter(c => c.operationCount > 0);
    } else if (filter === 'verified') {
      result = result.filter(c => c.verified);
    } else if (filter === 'token') {
      result = result.filter(c => c.type === 'token');
    } else if (filter === 'contract') {
      result = result.filter(c => c.type !== 'token');
    }

    // Client-side sorting fallback for current in-memory slice.
    if (sortBy === 'activity') {
      result.sort((a, b) => b.operationCount - a.operationCount);
    } else if (sortBy === 'activity_asc') {
      result.sort((a, b) => a.operationCount - b.operationCount);
    } else if (sortBy === 'transactions') {
      result.sort((a, b) => (b.totalTransactions ?? 0) - (a.totalTransactions ?? 0));
    } else if (sortBy === 'asset_code') {
      result.sort((a, b) => (a.symbol || a.name || '').localeCompare((b.symbol || b.name || '')));
    }

    return result;
  }, [contracts, filter, debouncedSearch, sortBy]);

  // Get type badge style
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'token':
        return { label: 'Token', color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' };
      case 'dex':
        return { label: 'DEX', color: 'text-violet-600', bg: 'bg-violet-50 border-violet-100' };
      case 'lending':
        return { label: 'Lending', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' };
      case 'nft':
        return { label: 'NFT', color: 'text-pink-600', bg: 'bg-pink-50 border-pink-100' };
      case 'bridge':
        return { label: 'Bridge', color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-100' };
      default:
        return { label: 'Contract', color: 'text-[var(--text-secondary)]', bg: 'bg-[var(--bg-primary)] border-[var(--border-subtle)]' };
    }
  };

  // Use stats from parent (calculated from sample of pages) for accurate counts
  const currentStats = useMemo(() => ({
    total: pagination.total,
    tokens: stats.tokens,
    contracts: stats.contracts,
    verified: stats.verified,
  }), [stats, pagination.total]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of contracts) {
      counts[c.type] = (counts[c.type] ?? 0) + 1;
    }
    return counts;
  }, [contracts]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[1400px] p-4 lg:p-4">
        {/* Header Card */}
        <div className="mb-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {/* Left: Title & Meta */}
            <div className="flex items-start gap-4 min-w-0">
              <Link
                href="/"
                className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 transition hover:bg-sky-200 dark:hover:bg-sky-900/60"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Soroban</span>
                  <span className="bg-sky-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                    {networkConfig.displayName}
                  </span>
                </div>
                <div className="text-xl font-bold text-[var(--text-primary)]">Smart Contracts</div>
                <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                  {loading ? <InlineSkeleton width="w-48" height="h-3" /> : `${pagination.total.toLocaleString()} smart contracts deployed on Stellar`}
                </div>
              </div>
            </div>

            {/* Right: Quick Stats */}
            <div className="flex gap-3">
              <div className="p-3 rounded-xl bg-[var(--bg-primary)]/70 border border-[var(--border-subtle)] min-w-[90px]">
                <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Total</div>
                <div className="text-lg font-bold text-[var(--text-primary)]">{loading ? <InlineSkeleton width="w-16" /> : pagination.total.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Sort Row */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-4 h-4 text-[var(--text-muted)] pointer-events-none" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, symbol, or contract ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-sky-500 focus:border-transparent shadow-sm"
            />
            {isLoading && (
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-sky-500" aria-hidden="true" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as ContractsSort)}
            className="px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm font-medium text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm cursor-pointer"
          >
            <option value="activity">Most Active</option>
            <option value="activity_asc">Least Active</option>
            <option value="transactions">By Transactions</option>
            <option value="asset_code">By Asset Code</option>
          </select>
        </div>

        {/* Filter Tabs */}
        <div className="mb-4 max-w-full">
          <GliderTabs
            size="sm"
            className="border-[var(--border-default)]"
            tabs={[
              { id: 'all', label: 'All', count: filter === 'all' ? pagination.total : undefined },
              { id: 'verified', label: 'Verified', count: filter === 'verified' ? pagination.total : undefined },
              { id: 'token', label: 'Tokens', count: filter === 'token' ? pagination.total : undefined },
              { id: 'contract', label: 'Contracts', count: filter === 'contract' ? pagination.total : undefined },
            ]}
            activeId={filter}
            onChange={handleFilterChange}
          />
        </div>

        {/* Contracts Table */}
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-sm overflow-hidden min-h-[520px]">
          <div className="overflow-x-auto">
            <table className="w-full sc-table">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/50">
                  <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">Contract ID</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">Name</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">Type</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">Created</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-right whitespace-nowrap">Invocations</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-left whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-center whitespace-nowrap w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bg-primary)]">
                {(loading || (isLoading && filteredContracts.length === 0)) ? (
                  Array.from({ length: 8 }).map((_, idx) => (
                    <tr key={`contracts-skeleton-row-${idx}`}>
                      <td className="py-3 px-4"><InlineSkeleton width="w-20" /></td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <InlineSkeleton width="w-28" />
                          <InlineSkeleton width="w-10" height="h-3" />
                        </div>
                      </td>
                      <td className="py-3 px-3"><InlineSkeleton width="w-16" /></td>
                      <td className="py-3 px-3"><InlineSkeleton width="w-14" /></td>
                      <td className="py-3 px-3 text-right"><InlineSkeleton width="w-12" /></td>
                      <td className="py-3 px-3"><InlineSkeleton width="w-12" /></td>
                      <td className="py-3 px-4 text-center"><InlineSkeleton width="w-6" height="h-6" /></td>
                    </tr>
                  ))
                ) : filteredContracts.length > 0 ? (
                  filteredContracts.map((contract, idx) => {
                    const typeBadge = getTypeBadge(contract.type);

                    return (
                      <tr
                        key={`${contract.id}-${contract.createdAt || idx}`}
                        className="hover:bg-sky-50/30 transition-colors group cursor-pointer"
                        onClick={() => window.location.href = `/contracts/${contract.id}`}
                      >
                        {/* Contract ID */}
                        <td className="py-3 px-4">
                          <Link
                            href={`/contracts/${contract.id}`}
                            className="font-mono text-[12px] text-sky-600 hover:text-sky-700 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {shortenAddress(contract.id)}
                          </Link>
                        </td>

                        {/* Name */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/contracts/${contract.id}`}
                              className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-sky-600 transition-colors truncate max-w-[180px] hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {contract.name}
                            </Link>
                            {contract.verified && (
                              <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                            {contract.symbol && (
                              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
                                {contract.symbol}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Type */}
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${typeBadge.bg} ${typeBadge.color}`}>
                            {typeBadge.label}
                          </span>
                          {contract.sep41 && (
                            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wider bg-blue-50 border-blue-100 text-blue-700">
                              SEP-41
                            </span>
                          )}
                        </td>

                        {/* Created */}
                        <td className="py-3 px-3 text-[12px] text-[var(--text-tertiary)] whitespace-nowrap">
                          {contract.createdAt ? timeAgo(contract.createdAt) : '-'}
                        </td>

                        {/* Invocations */}
                        <td className="py-3 px-3 text-right">
                          {contract.operationCount > 0 ? (
                            <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                              {contract.operationCount.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-[12px] text-[var(--text-muted)]">0</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          {contract.operationCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]"></span>
                              Idle
                            </span>
                          )}
                        </td>

                        {/* Arrow */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-muted)] group-hover:bg-sky-100 group-hover:text-sky-600 transition-colors">
                            <svg className="w-3.5 h-3.5" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-4">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-[var(--bg-tertiary)] rounded-xl flex items-center justify-center mb-3">
                          <svg className="w-6 h-6 text-[var(--text-muted)]" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">No contracts found</p>
                        <p className="text-xs text-[var(--text-muted)]">Try adjusting your search or filter criteria</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={fetchPage}
            loading={isLoading || loading}
          />
        </div>
      </div>
    </div>
  );
}
