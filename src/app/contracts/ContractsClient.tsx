'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { shortenAddress, timeAgo } from '@/lib/stellar';
import { StrKey } from '@stellar/stellar-sdk';
import { isContractAddress } from '@/lib/soroban';
import ContractsDesktopView from '@/components/desktop/ContractsDesktopView';
import GliderTabs from '@/components/ui/GliderTabs';
import InlineSkeleton from '@/components/ui/InlineSkeleton';
import { apiEndpoints, getApiV1Data } from '@/services/api';

type ContractFilter = 'all' | 'verified' | 'token' | 'contract';

// Convert hex contract ID to StrKey format (C...)
function hexToContractStrKey(hexId: string): string {
  try {
    // If already in StrKey format (starts with C and is 56 chars), return as is
    if (hexId.startsWith('C') && hexId.length === 56) {
      return hexId;
    }
    // Convert hex to buffer and encode as contract strkey
    const buffer = Buffer.from(hexId, 'hex');
    return StrKey.encodeContract(buffer);
  } catch (e) {
    console.error('Failed to convert contract ID:', e);
    return hexId; // Return original if conversion fails
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

interface ContractsClientProps {
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

// Verified contracts data for client-side enrichment
import verifiedContracts from '@/data/verified-contracts.json';

export default function ContractsClient({ contracts: initialContracts, stats, categories, pagination: initialPagination, loading = false }: ContractsClientProps) {
  const [contracts, setContracts] = useState<EnhancedContract[]>(initialContracts);
  const [pagination, setPagination] = useState(initialPagination);
  const [filter, setFilter] = useState<ContractFilter>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'activity' | 'name'>('activity');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setContracts(initialContracts);
  }, [initialContracts]);

  useEffect(() => {
    setPagination(initialPagination);
  }, [initialPagination]);

  // Fetch contracts for a specific page
  const fetchPage = useCallback(async (page: number) => {
    setIsLoading(true);
    try {
      const data = await getApiV1Data(apiEndpoints.v1.contracts({ page, 'order[totalTransactions]': 'desc' }));

      // Transform API contracts, filtering out invalid IDs
      const newContracts: EnhancedContract[] = (data.member || [])
        .filter((apiContract: any) => isContractAddress(apiContract.contractId))
        .map((apiContract: any) => {
        const verifiedContract = verifiedContracts.contracts.find(
          c => c.id.toLowerCase() === apiContract.contractId.toLowerCase()
        );

        let type = 'contract';
        if (apiContract.sac || apiContract.assetCode) {
          type = 'token';
        } else if (verifiedContract?.type) {
          type = verifiedContract.type;
        }

        let name = 'Unknown Contract';
        if (verifiedContract?.name) {
          name = verifiedContract.name;
        } else if (apiContract.assetCode) {
          name = apiContract.assetCode;
        }

        // Use contractId directly (already in StrKey format from API)
        const contractId = apiContract.contractId;

        return {
          id: contractId,
          name,
          type,
          symbol: apiContract.assetCode || verifiedContract?.symbol,
          description: verifiedContract?.description,
          verified: Boolean(apiContract.sourceCodeVerified),
          sep41: apiContract.sac || !!apiContract.assetCode || verifiedContract?.sep41,
          website: verifiedContract?.website,
          operationCount: Number(apiContract.totalTransactions ?? 0),
          lastActivity: apiContract.createdAt,
          wasmId: apiContract.wasmId || undefined,
          createdAt: apiContract.createdAt,
          createTxHash: undefined, // Not available in new API
        };
      });

      // Calculate total pages (assuming 30 items per page)
      const itemsPerPage = 30;
      const totalPages = Math.ceil((data.totalItems || 0) / itemsPerPage);

      setContracts(newContracts);
      setPagination({
        currentPage: page,
        totalPages: totalPages,
        total: data.totalItems || 0,
        perPage: itemsPerPage,
      });
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const filteredContracts = useMemo(() => {
    let result = [...contracts];

    // Filter by type
    if (filter === 'verified') {
      result = result.filter(c => c.verified);
    } else if (filter === 'token') {
      result = result.filter(c => c.type === 'token');
    } else if (filter === 'contract') {
      result = result.filter(c => c.type !== 'token'); // All non-token contracts
    }
    // 'all' shows everything (no filter)

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.symbol?.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'activity') {
      result.sort((a, b) => b.operationCount - a.operationCount);
    }
    return result;
  }, [contracts, filter, search, sortBy]);

  return (
    <>
      {/* Desktop View - Table-based layout */}
      <div className="hidden md:block">
        <ContractsDesktopView
          contracts={initialContracts}
          stats={stats}
          categories={categories}
          pagination={initialPagination}
          loading={loading}
        />
      </div>

      {/* Mobile View - Card-based layout */}
      <div className="md:hidden min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-20 pt-1">
        <div className="mx-auto max-w-7xl px-3">
          {/* Mobile Header - Compact */}
          <div>
            {/* Title with stats */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Smart Contracts
                </span>
                <span className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded">
                  {loading ? <InlineSkeleton width="w-12" height="h-3" /> : pagination.total.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Mobile Filter Tabs - Glider Style */}
            <GliderTabs
              className="mb-3"
              tabs={[
                { id: 'all', label: 'All' },
                { id: 'verified', label: 'Verified' },
                { id: 'token', label: 'Tokens' },
              ]}
              activeId={filter}
              onChange={setFilter}
            />
          </div>

          {/* Loading overlay */}
          {isLoading && (
            <div className="fixed inset-0 bg-[var(--bg-primary)]/50 z-50 flex items-center justify-center">
              <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-xl p-4 flex items-center gap-3">
                <svg className="animate-spin h-5 w-5 text-[var(--primary-blue)]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="font-medium text-[var(--text-secondary)]">Loading contracts...</span>
              </div>
            </div>
          )}

          {/* Mobile List View - Individual Cards */}
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={`contract-mobile-skeleton-${idx}`}
                  className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-3 py-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold leading-tight text-[var(--primary-blue)]">
                          Contract
                        </span>
                        <span className="text-xs text-[var(--text-muted)] font-medium font-mono mt-0.5 flex items-center gap-1">
                          <InlineSkeleton width="w-20" height="h-3" />
                          <span className="text-[var(--text-muted)]">•</span>
                          <span className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Type</span>
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-bold text-[var(--text-primary)]">
                        <InlineSkeleton width="w-14" height="h-3" />
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-1">
                        <InlineSkeleton width="w-12" height="h-3" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-4 text-center text-[var(--text-muted)] italic text-sm">
              No contracts found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredContracts.map((contract) => (
                <Link
                  key={contract.id}
                  href={`/contracts/${contract.id}`}
                  className="block bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] active:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <div className="px-3 py-3 flex items-center justify-between">
                    {/* Left Side: Icon & Contract Info */}
                    <div className="flex items-start space-x-3">
                      <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                        contract.type === 'token' ? 'bg-indigo-500/10 text-indigo-500' :
                        contract.type === 'dex' ? 'bg-purple-500/10 text-purple-500' :
                        contract.type === 'lending' ? 'bg-emerald-500/10 text-emerald-500' :
                        'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                      }`}>
                        {contract.type === 'token' ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        ) : contract.type === 'dex' ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                          </svg>
                        )}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold leading-tight text-[var(--primary-blue)] truncate">
                            {contract.name}
                          </span>
                          {contract.verified && (
                            <svg className="w-3.5 h-3.5 flex-shrink-0 text-[var(--success)]" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs text-[var(--text-muted)] font-medium font-mono mt-0.5 flex items-center">
                          {shortenAddress(contract.id)}
                          <span className="mx-1 text-[var(--text-muted)]">•</span>
                          <span className={`text-[9px] font-bold uppercase ${
                            contract.type === 'token' ? 'text-indigo-500' :
                            contract.type === 'dex' ? 'text-purple-500' :
                            'text-[var(--text-muted)]'
                          }`}>
                            {contract.type}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Right Side: Stats */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-bold text-[var(--text-primary)]">
                        {contract.operationCount.toLocaleString()} <span className="text-[var(--text-muted)] font-normal">txs</span>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {contract.createdAt ? timeAgo(contract.createdAt) : '-'}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Mobile Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => fetchPage(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1 || isLoading || loading}
                className="px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <span className="text-sm text-[var(--text-muted)]">
                {pagination.currentPage} / {pagination.totalPages}
              </span>

              <button
                onClick={() => fetchPage(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages || isLoading || loading}
                className="px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
