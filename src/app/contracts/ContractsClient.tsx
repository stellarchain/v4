'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { shortenAddress, timeAgo } from '@/lib/stellar';

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
}

interface Category {
  id: string;
  name: string;
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
}

export default function ContractsClient({ contracts, stats, categories }: ContractsClientProps) {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'activity' | 'name'>('activity');

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
    } else {
      result.sort((a, b) => b.operationCount - a.operationCount);
    }

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
        return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'dex':
        return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'lending':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <div className="mx-auto max-w-7xl p-4 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-slate-800 hover:bg-slate-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Smart Contracts</h1>
              <p className="text-sm text-slate-500 mt-1">Active Soroban smart contracts on Stellar, ordered by recent activity</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by name, symbol, or contract ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2.5 pl-10 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'activity' | 'name')}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="activity">Sort by Activity</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 mt-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                filter === 'active'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Active ({stats.active})
            </button>
            <button
              onClick={() => setFilter('verified')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                filter === 'verified'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Verified ({stats.verified})
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                  filter === cat.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.active}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tokens</div>
            <div className="text-2xl font-bold text-indigo-600 mt-1">{stats.tokens}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">DEXs</div>
            <div className="text-2xl font-bold text-purple-600 mt-1">{stats.dex}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Verified</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{stats.verified}</div>
          </div>
        </div>

        {/* Contracts Grid */}
        {filteredContracts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No contracts found</h3>
            <p className="text-sm text-slate-500">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContracts.map(contract => (
              <Link
                key={contract.id}
                href={`/contract/${contract.id}`}
                className="group rounded-xl border border-slate-200 bg-white p-5 hover:shadow-lg hover:border-slate-300 transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    contract.type === 'token' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' :
                    contract.type === 'dex' ? 'bg-gradient-to-br from-purple-500 to-pink-600' :
                    contract.type === 'lending' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' :
                    'bg-gradient-to-br from-slate-600 to-slate-800'
                  } text-white shadow-lg group-hover:scale-105 transition-transform`}>
                    {getTypeIcon(contract.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
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
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide border bg-blue-50 text-blue-600 border-blue-100">
                          SEP-41
                        </span>
                      )}
                      {contract.symbol && (
                        <span className="text-xs font-semibold text-slate-500">{contract.symbol}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Activity info */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {contract.operationCount > 0 ? (
                      <>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          {contract.operationCount} ops
                        </span>
                        {contract.lastActivity && (
                          <span className="text-[10px] text-slate-400">{timeAgo(contract.lastActivity)}</span>
                        )}
                      </>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-50 text-slate-500 text-xs font-medium">
                        No recent activity
                      </span>
                    )}
                  </div>
                </div>

                {/* Functions */}
                {contract.functions && contract.functions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {contract.functions.slice(0, 3).map((fn, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-600">
                        {fn}
                      </span>
                    ))}
                    {contract.functions.length > 3 && (
                      <span className="px-2 py-0.5 text-[10px] text-slate-400">
                        +{contract.functions.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Description */}
                {contract.description && (
                  <p className="text-xs text-slate-500 mt-3 line-clamp-2">{contract.description}</p>
                )}

                {/* Contract ID */}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-mono text-slate-400">{shortenAddress(contract.id, 8)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
