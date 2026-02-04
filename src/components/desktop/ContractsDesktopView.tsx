'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { shortenAddress, timeAgo } from '@/lib/stellar';
import { StrKey } from '@stellar/stellar-sdk';

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
    active: number;
    tokens: number;
    dex: number;
    verified: number;
  };
  categories: Category[];
  pagination: PaginationInfo;
}

import verifiedContracts from '@/data/verified-contracts.json';

const PAGE_SIZE = 30;

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
    <div className="flex items-center justify-center gap-1.5 px-5 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]/50">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || loading}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-muted)] hover:bg-sky-50 hover:border-sky-200 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-bold transition-all ${currentPage === page
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
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-muted)] hover:bg-sky-50 hover:border-sky-200 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {loading && (
        <svg className="w-4 h-4 animate-spin ml-2 text-sky-500" fill="none" viewBox="0 0 24 24">
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
  pagination: initialPagination
}: ContractsDesktopViewProps) {
  const [contracts, setContracts] = useState<EnhancedContract[]>(initialContracts);
  const [pagination, setPagination] = useState(initialPagination);
  const [filter, setFilter] = useState<string>('all');
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

    if (filter === 'active') {
      result = result.filter(c => c.operationCount > 0);
    } else if (filter === 'verified') {
      result = result.filter(c => c.verified);
    } else if (filter !== 'all') {
      result = result.filter(c => c.type === filter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.symbol?.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'activity') {
      result.sort((a, b) => b.operationCount - a.operationCount);
    }

    return result;
  }, [contracts, filter, search, sortBy]);

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

  // Count stats from current filtered view
  const currentStats = useMemo(() => ({
    total: pagination.total,
    tokens: contracts.filter(c => c.type === 'token').length,
    dex: contracts.filter(c => c.type === 'dex').length,
    verified: contracts.filter(c => c.verified).length,
    active: contracts.filter(c => c.operationCount > 0).length,
  }), [contracts, pagination.total]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[1600px] p-6 lg:p-8">
        {/* Header Card */}
        <div className="mb-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
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
                    Mainnet
                  </span>
                </div>
                <div className="text-xl font-bold text-[var(--text-primary)]">Smart Contracts</div>
                <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                  {pagination.total.toLocaleString()} smart contracts deployed on Stellar
                </div>
              </div>
            </div>

            {/* Right: Quick Stats */}
            <div className="flex gap-3">
              <div className="p-3 rounded-xl bg-[var(--bg-primary)]/70 border border-[var(--border-subtle)] min-w-[90px]">
                <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Total</div>
                <div className="text-lg font-bold text-[var(--text-primary)]">{pagination.total.toLocaleString()}</div>
              </div>
              <div className="p-3 rounded-xl bg-indigo-100/70 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/50 min-w-[90px]">
                <div className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Tokens</div>
                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{currentStats.tokens}</div>
              </div>
              <div className="p-3 rounded-xl bg-violet-100/70 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800/50 min-w-[90px]">
                <div className="text-[9px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-1">DEXs</div>
                <div className="text-lg font-bold text-violet-600 dark:text-violet-400">{currentStats.dex}</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-100/70 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 min-w-[90px]">
                <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Verified</div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{currentStats.verified}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Sort Row */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by name, symbol, or contract ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 pl-10 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent shadow-sm"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'activity' | 'name' | 'recent')}
            className="px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm font-medium text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm cursor-pointer"
          >
            <option value="recent">Most Recent</option>
            <option value="activity">Most Active</option>
            <option value="name">By Name</option>
          </select>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-4 px-1 border-b border-[var(--border-default)] pb-2 mb-5">
          {[
            { id: 'all', label: 'All Contracts', count: pagination.total },
            { id: 'verified', label: 'Verified', count: currentStats.verified },
            { id: 'token', label: 'Tokens', count: currentStats.tokens },
            { id: 'dex', label: 'DEX', count: currentStats.dex },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`text-[10px] font-bold uppercase tracking-widest pb-2 -mb-[9px] transition-all ${filter === tab.id
                  ? 'text-sky-600 border-b-2 border-sky-600'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
            >
              {tab.label}
              <span className={filter === tab.id ? 'text-sky-500 ml-1' : 'text-[var(--text-muted)] ml-1'}>
                {tab.count.toLocaleString()}
              </span>
            </button>
          ))}
          {categories.slice(0, 3).map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilter(cat.id)}
              className={`text-[10px] font-bold uppercase tracking-widest pb-2 -mb-[9px] transition-all ${filter === cat.id
                  ? 'text-sky-600 border-b-2 border-sky-600'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-[var(--text-primary)]/20 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-xl p-6 flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-sky-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="font-medium text-[var(--text-secondary)]">Loading contracts...</span>
            </div>
          </div>
        )}

        {/* Contracts Table */}
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
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
                {filteredContracts.length > 0 ? (
                  filteredContracts.map((contract) => {
                    const typeBadge = getTypeBadge(contract.type);

                    return (
                      <tr
                        key={contract.id}
                        className="hover:bg-sky-50/30 transition-colors group cursor-pointer"
                        onClick={() => window.location.href = `/contract/${contract.id}`}
                      >
                        {/* Contract ID */}
                        <td className="py-3 px-4">
                          <Link
                            href={`/contract/${contract.id}`}
                            className="font-mono text-[12px] text-sky-600 hover:text-sky-700 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {shortenAddress(contract.id, 6)}
                          </Link>
                        </td>

                        {/* Name */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-sky-600 transition-colors truncate max-w-[180px]">
                              {contract.name}
                            </span>
                            {contract.verified && (
                              <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-[var(--bg-tertiary)] rounded-xl flex items-center justify-center mb-3">
                          <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            loading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
