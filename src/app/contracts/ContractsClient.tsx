'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { shortenAddress, timeAgo } from '@/lib/stellar';
import { StrKey } from '@stellar/stellar-sdk';
import ContractsDesktopView from '@/components/desktop/ContractsDesktopView';
import GliderTabs from '@/components/ui/GliderTabs';

type ContractFilter = 'all' | 'verified' | 'token' | 'active';

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
    active: number;
    tokens: number;
    dex: number;
    verified: number;
  };
  categories: Category[];
  pagination: PaginationInfo;
}

// Verified contracts data for client-side enrichment
import verifiedContracts from '@/data/verified-contracts.json';

export default function ContractsClient({ contracts: initialContracts, stats, categories, pagination: initialPagination }: ContractsClientProps) {
  const [contracts, setContracts] = useState<EnhancedContract[]>(initialContracts);
  const [pagination, setPagination] = useState(initialPagination);
  const [filter, setFilter] = useState<ContractFilter>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'activity' | 'name' | 'recent'>('recent');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch contracts for a specific page
  const fetchPage = useCallback(async (page: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.stellarchain.io/v1/contracts/env/public?page=${page}&paginate=${pagination.perPage}`
      );
      const data = await response.json();

      // Transform API contracts
      const newContracts: EnhancedContract[] = (data.data || []).map((apiContract: any) => {
        const verifiedContract = verifiedContracts.contracts.find(
          c => c.id.toLowerCase() === apiContract.contract_id.toLowerCase()
        );

        let type = 'contract';
        if (apiContract.contract_type === 1 || apiContract.asset_code) {
          type = 'token';
        } else if (verifiedContract?.type) {
          type = verifiedContract.type;
        }

        let name = 'Unknown Contract';
        if (verifiedContract?.name) {
          name = verifiedContract.name;
        } else if (apiContract.asset_code) {
          name = apiContract.asset_code;
        }

        // Convert hex contract ID to StrKey format
        const contractId = hexToContractStrKey(apiContract.contract_id);

        return {
          id: contractId,
          name,
          type,
          symbol: apiContract.asset_code || verifiedContract?.symbol,
          description: verifiedContract?.description,
          verified: apiContract.source_code_verified || verifiedContract?.verified || false,
          sep41: apiContract.contract_type === 1 || !!apiContract.asset_code || verifiedContract?.sep41,
          website: verifiedContract?.website,
          operationCount: apiContract.transactions_count || 0,
          lastActivity: apiContract.created_at,
          wasmId: apiContract.wasm_id || undefined,
          createdAt: apiContract.created_at,
          createTxHash: apiContract.create_transaction?.hash,
        };
      });

      setContracts(newContracts);
      setPagination({
        currentPage: data.current_page || page,
        totalPages: data.last_page || 1,
        total: data.total || 0,
        perPage: data.per_page || pagination.perPage,
      });
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.perPage]);

  const filteredContracts = useMemo(() => {
    let result = [...contracts];

    // Filter by type
    if (filter === 'active') {
      result = result.filter(c => c.operationCount > 0);
    } else if (filter === 'verified') {
      result = result.filter(c => c.verified);
    } else if (filter !== 'all') {
      result = result.filter(c => c.type === filter);
    }

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
    // 'recent' keeps the API order (most recent first)

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
                  {pagination.total.toLocaleString()}
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
          {filteredContracts.length === 0 ? (
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
                disabled={pagination.currentPage === 1 || isLoading}
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
                disabled={pagination.currentPage === pagination.totalPages || isLoading}
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
