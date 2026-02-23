'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { shortenAddress, timeAgo } from '@/lib/stellar';
import ContractsDesktopView from '@/components/desktop/ContractsDesktopView';
import GliderTabs from '@/components/ui/GliderTabs';
import InlineSkeleton from '@/components/ui/InlineSkeleton';

type ContractFilter = 'all' | 'verified' | 'token' | 'contract';
type ContractsSort = 'activity' | 'activity_asc' | 'transactions' | 'asset_code';

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

interface Category {
  id: string;
  name: string;
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
  loading?: boolean;
  tableLoading?: boolean;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  filter: ContractFilter;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  sortBy: ContractsSort;
  onSortChange: (value: ContractsSort) => void;
  onFilterChange: (filter: ContractFilter) => void;
  onPageChange: (page: number) => void;
}

export default function ContractsClient({
  contracts,
  stats,
  categories,
  loading = false,
  tableLoading = false,
  currentPage,
  totalPages,
  totalItems,
  filter,
  searchQuery,
  onSearchQueryChange,
  sortBy,
  onSortChange,
  onFilterChange,
  onPageChange,
}: ContractsClientProps) {
  // Deduplicate
  const displayContracts = useMemo(() => {
    const seen = new Set<string>();
    return contracts.filter((contract) => {
      const key = String(contract.id || '').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [contracts]);

  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block">
        <ContractsDesktopView
          contracts={contracts}
          stats={stats}
          categories={categories}
          pagination={{ currentPage, totalPages, total: totalItems, perPage: 25 }}
          loading={tableLoading}
          filter={filter}
          searchInput={searchQuery}
          onSearchInputChange={onSearchQueryChange}
          sortBy={sortBy}
          onSortChange={onSortChange}
          onFilterChange={onFilterChange}
          onPageChange={onPageChange}
        />
      </div>

      {/* Mobile View */}
      <div className="md:hidden min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-20 pt-1">
        <div className="mx-auto max-w-7xl px-3">
          {/* Header */}
          <div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Smart Contracts
                </span>
                <span className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded">
                  {loading ? <InlineSkeleton width="w-12" height="h-3" /> : totalItems.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Filter Tabs */}
            <GliderTabs
              className="mb-3"
              tabs={[
                { id: 'all', label: 'All' },
                { id: 'verified', label: 'Verified' },
                { id: 'token', label: 'Tokens' },
              ]}
              activeId={filter}
              onChange={(id) => onFilterChange(id as ContractFilter)}
            />
          </div>

          {/* List */}
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
          ) : displayContracts.length === 0 ? (
            <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-4 text-center text-[var(--text-muted)] italic text-sm">
              No contracts found
            </div>
          ) : (
            <div className="space-y-2">
              {displayContracts.map((contract, idx) => (
                <Link
                  key={`${contract.id}-${contract.createdAt || idx}`}
                  href={`/contracts/${contract.id}`}
                  className="block bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] active:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <div className="px-3 py-3 flex items-center justify-between">
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

                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-bold text-[var(--text-primary)]">
                        {contract.operationCount.toLocaleString()} <span className="text-[var(--text-muted)] font-normal">invokes</span>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <span className="text-sm text-[var(--text-muted)]">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
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
