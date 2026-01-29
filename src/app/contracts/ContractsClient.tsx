'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { shortenAddress, timeAgo } from '@/lib/stellar';
import { StrKey } from '@stellar/stellar-sdk';

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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'dex':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      case 'lending':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'token':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        );
    }
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'token':
        return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
      case 'dex':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'lending':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      default:
        return 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border-subtle)]';
    }
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const { currentPage, totalPages } = pagination;

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
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-20 pt-1 md:pt-0">
      <div className="mx-auto max-w-7xl px-3 md:p-4 lg:p-8">
        {/* Desktop Header */}
        <div className="hidden md:block mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-muted)] transition hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Smart Contracts</h1>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {pagination.total.toLocaleString()} Soroban smart contracts on Stellar
              </p>
            </div>
          </div>

          {/* Desktop Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by name, symbol, or contract ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2.5 pl-10 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] focus:border-transparent"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'activity' | 'name' | 'recent')}
              className="px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]"
            >
              <option value="recent">Most Recent</option>
              <option value="activity">Most Active</option>
              <option value="name">By Name</option>
            </select>
          </div>

          {/* Desktop Type Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 mt-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${filter === 'all'
                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                : 'bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
            >
              All ({pagination.total.toLocaleString()})
            </button>
            <button
              onClick={() => setFilter('verified')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${filter === 'verified'
                ? 'bg-blue-600 text-white'
                : 'bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
            >
              Verified ({stats.verified})
            </button>
            <button
              onClick={() => setFilter('token')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${filter === 'token'
                ? 'bg-indigo-600 text-white'
                : 'bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
            >
              Tokens ({stats.tokens})
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${filter === cat.id
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                  : 'bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Header - Compact */}
        <div className="md:hidden">
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
          {(() => {
            const filterTabs = [
              { id: 'all', label: 'All' },
              { id: 'verified', label: 'Verified' },
              { id: 'token', label: 'Tokens' },
            ];
            const activeTabIndex = filterTabs.findIndex(tab => tab.id === filter);
            const tabCount = filterTabs.length;

            return (
              <div className="relative flex items-center bg-[var(--bg-secondary)] p-1 rounded-xl shadow-sm border border-[var(--border-subtle)] mb-3">
                {/* Glider Background */}
                <div
                  className="absolute top-1 bottom-1 bg-[var(--primary-blue)]/10 rounded-lg transition-all duration-300 ease-out z-0"
                  style={{
                    left: '4px',
                    width: `calc((100% - 8px) / ${tabCount})`,
                    transform: `translateX(${activeTabIndex >= 0 ? activeTabIndex * 100 : 0}%)`,
                    opacity: activeTabIndex >= 0 ? 1 : 0
                  }}
                />

                {filterTabs.map((tab) => {
                  const isActive = filter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setFilter(tab.id)}
                      className={`relative z-10 flex-1 py-1.5 text-[11px] rounded-lg transition-colors duration-200 text-center ${
                        isActive
                          ? 'text-[var(--primary-blue)] font-bold'
                          : 'text-[var(--text-secondary)] font-semibold hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Desktop Stats */}
        <div className="hidden md:grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Total Contracts</div>
            <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">{pagination.total.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Tokens (SAC)</div>
            <div className="text-2xl font-bold text-indigo-500 mt-1">{stats.tokens}</div>
          </div>
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">DEXs</div>
            <div className="text-2xl font-bold text-purple-500 mt-1">{stats.dex}</div>
          </div>
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Verified</div>
            <div className="text-2xl font-bold text-emerald-500 mt-1">{stats.verified}</div>
          </div>
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-[var(--bg-primary)]/50 z-50 flex items-center justify-center">
            <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-xl p-6 flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-[var(--primary-blue)]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="font-medium text-[var(--text-secondary)]">Loading contracts...</span>
            </div>
          </div>
        )}

        {/* Mobile List View - Individual Cards */}
        <div className="md:hidden">
          {filteredContracts.length === 0 ? (
            <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-12 text-center text-[var(--text-muted)] italic text-sm">
              No contracts found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredContracts.map((contract) => (
                <Link
                  key={contract.id}
                  href={`/contract/${contract.id}`}
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
                          {shortenAddress(contract.id, 4)}
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
                        {contract.createdAt ? timeAgo(contract.createdAt) : '—'}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Grid View */}
        <div className="hidden md:block">
          {filteredContracts.length === 0 ? (
            <div className="text-center py-16 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)]">
              <div className="w-16 h-16 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">No contracts found</h3>
              <p className="text-sm text-[var(--text-muted)]">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContracts.map(contract => (

                <Link
                  key={contract.id}
                  href={`/contract/${contract.id}`}
                  className="group rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 hover:shadow-lg hover:border-[var(--border-hover)] transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${contract.type === 'token' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' :
                      contract.type === 'dex' ? 'bg-gradient-to-br from-purple-500 to-pink-600' :
                        contract.type === 'lending' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' :
                          'bg-gradient-to-br from-slate-600 to-slate-800'
                      } text-white shadow-lg group-hover:scale-105 transition-transform`}>
                      {getTypeIcon(contract.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--primary-blue)] transition-colors">
                          {contract.name}
                        </h3>
                        {contract.verified && (
                          <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide border ${getTypeBadgeStyle(contract.type)}`}>
                          {contract.type}
                        </span>
                        {contract.sep41 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide border bg-blue-500/10 text-blue-500 border-blue-500/20">
                            SEP-41
                          </span>
                        )}
                        {contract.symbol && (
                          <span className="text-xs font-semibold text-[var(--text-muted)]">{contract.symbol}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {contract.operationCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-semibold">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          {contract.operationCount.toLocaleString()} txs
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-muted)] text-xs font-medium">
                          No transactions
                        </span>
                      )}
                    </div>
                    {contract.createdAt && (
                      <span className="text-[10px] text-[var(--text-muted)]">{timeAgo(contract.createdAt)}</span>
                    )}
                  </div>

                  {contract.functions && contract.functions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {contract.functions.slice(0, 3).map((fn, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[10px] font-mono text-[var(--text-muted)]">
                          {fn}
                        </span>
                      ))}
                      {contract.functions.length > 3 && (
                        <span className="px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                          +{contract.functions.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {contract.description && (
                    <p className="text-xs text-[var(--text-muted)] mt-3 line-clamp-2">{contract.description}</p>
                  )}

                  <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">{shortenAddress(contract.id, 8)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {/* Previous button */}
          <button
            onClick={() => fetchPage(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1 || isLoading}
            className="px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, idx) => (
              page === '...' ? (
                <span key={`ellipsis-${idx}`} className="px-3 py-2 text-[var(--text-muted)]">...</span>
              ) : (
                <button
                  key={page}
                  onClick={() => fetchPage(page as number)}
                  disabled={isLoading}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${page === pagination.currentPage
                    ? 'bg-[var(--primary-blue)] text-white'
                    : 'border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    } disabled:cursor-not-allowed`}
                >
                  {page}
                </button>
              )
            ))}
          </div>

          {/* Next button */}
          <button
            onClick={() => fetchPage(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages || isLoading}
            className="px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Page info */}
          <span className="ml-4 text-sm text-[var(--text-muted)]">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
        </div>
      )}
      </div>
    </div>
  );
}
