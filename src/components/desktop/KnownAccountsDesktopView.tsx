'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { shortenAddress } from '@/lib/stellar';
import type { LabeledAccountsAPIResponse, LabeledAccount } from '@/lib/stellar';
import { apiEndpoints, getApiV1Data } from '@/services/api';

interface KnownAccountsDesktopViewProps {
  initialData: LabeledAccountsAPIResponse;
}

type SortField = 'rank' | 'balance' | 'transactions';
type SortOrder = 'asc' | 'desc';

function formatFullBalance(balance: number): string {
  return balance.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  return (
    <svg className={`w-3 h-3 ml-1 inline-block ${active ? 'text-sky-600' : 'text-[var(--text-muted)]'}`} fill="currentColor" viewBox="0 0 24 24">
      {order === 'desc' || !active ? (
        <path d="M7 10l5 5 5-5H7z" />
      ) : (
        <path d="M7 14l5-5 5 5H7z" />
      )}
    </svg>
  );
}

export default function KnownAccountsDesktopView({ initialData }: KnownAccountsDesktopViewProps) {
  // Transform new API structure to old format
  const transformedData = initialData?.member?.map((acc: any) => ({
    account: acc.address,
    org_name: null,
    label: acc.label ? {
      name: acc.label,
      description: null,
      verified: acc.verified ? 1 : 0
    } : null,
    balance: parseFloat(acc.accountMetric?.nativeBalance || '0'),
    transactions: acc.accountMetric?.totalTransactions || '0',
    rank: acc.accountMetric?.rankPosition || 0
  })) || [];

  const [accounts, setAccounts] = useState<LabeledAccount[]>(transformedData);
  const itemsPerPage = 30;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(Math.ceil((initialData?.totalItems || 0) / itemsPerPage));
  const [total, setTotal] = useState(initialData?.totalItems || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('balance');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const fetchPage = useCallback(async (page: number) => {
    setIsLoading(true);
    try {
      const json = await getApiV1Data(apiEndpoints.v1.accounts({ page }));

      const transformedAccounts = json.member?.map((acc: any) => ({
        account: acc.address,
        org_name: null,
        label: acc.label ? {
          name: acc.label,
          description: null,
          verified: acc.verified ? 1 : 0
        } : null,
        balance: parseFloat(acc.accountMetric?.nativeBalance || '0'),
        transactions: acc.accountMetric?.totalTransactions || '0',
        rank: acc.accountMetric?.rankPosition || 0
      })) || [];

      setAccounts(transformedAccounts);
      setCurrentPage(page);
      setTotalPages(Math.ceil((json.totalItems || 0) / itemsPerPage));
      setTotal(json.totalItems || 0);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Calculate totals
  const totals = useMemo(() => {
    const verifiedCount = accounts.filter(acc => acc.label?.verified === 1).length;
    return { verifiedCount };
  }, [accounts]);

  const filteredAndSortedAccounts = useMemo(() => {
    let filtered = [...accounts];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (account) =>
          account.account.toLowerCase().includes(query) ||
          (account.label?.name && account.label.name.toLowerCase().includes(query)) ||
          (account.org_name && account.org_name.toLowerCase().includes(query))
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'rank':
          comparison = a.rank - b.rank;
          break;
        case 'balance':
          comparison = (b.balance || 0) - (a.balance || 0);
          break;
        case 'transactions':
          comparison = parseInt(b.transactions || '0') - parseInt(a.transactions || '0');
          break;
      }
      return sortOrder === 'desc' ? comparison : -comparison;
    });

    return filtered;
  }, [accounts, searchQuery, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const HeaderCell = ({ label, field, className = '' }: { label: string; field?: SortField; className?: string }) => {
    const isSortable = !!field;
    const isActive = sortField === field;

    return (
      <th
        className={`py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-left whitespace-nowrap ${isSortable ? 'cursor-pointer hover:text-sky-600 transition-colors select-none' : ''} ${isActive ? 'text-sky-600' : 'text-[var(--text-muted)]'} ${className}`}
        onClick={() => field && handleSort(field)}
      >
        <span className="inline-flex items-center">
          {label}
          {isSortable && <SortIcon active={isActive} order={sortOrder} />}
        </span>
      </th>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[1400px] p-4 lg:p-4">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-[var(--text-primary)]/20 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-xl p-4 flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-sky-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="font-medium text-[var(--text-secondary)]">Loading accounts...</span>
            </div>
          </div>
        )}

        {/* Header Card */}
        <div className="mb-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {/* Left: Title & Meta */}
            <div className="flex items-start gap-4 min-w-0">
              <Link
                href="/accounts"
                className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 transition hover:bg-sky-200 dark:hover:bg-sky-900/60"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Directory</span>
                  <span className="bg-sky-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                    {(total || 0).toLocaleString()} Accounts
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {totals.verifiedCount} Verified
                  </span>
                </div>
                <div className="text-xl font-bold text-[var(--text-primary)]">Known Accounts</div>
                <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                  Labeled and verified accounts on the Stellar network
                </div>
              </div>
            </div>

            {/* Right: Quick Stats */}
            <div className="flex gap-3">
              <div className="p-3 rounded-xl bg-emerald-100/70 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 min-w-[90px]">
                <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Verified</div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{totals.verifiedCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-5 h-5 text-[var(--text-muted)] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or address..."
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-300 text-sm shadow-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/accounts"
              className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:border-sky-200 hover:text-sky-600 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Top Accounts
            </Link>
            <span className="text-sm text-[var(--text-muted)]">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-sm overflow-hidden">
          <table className="w-full sc-table">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/50">
                <HeaderCell label="#" field="rank" className="w-16" />
                <HeaderCell label="Account" className="min-w-[280px]" />
                <HeaderCell label="Address" className="min-w-[180px]" />
                <HeaderCell label="Balance" field="balance" className="text-right" />
                <HeaderCell label="Transactions" field="transactions" className="text-right" />
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-center w-24">Status</th>
                <th className="py-3 px-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredAndSortedAccounts.map((account, index) => {
                const isVerified = account.label?.verified === 1;
                const hasLabel = !!(account.label?.name || account.org_name);
                const displayName = account.label?.name || account.org_name || 'Unknown';

                return (
                  <tr
                    key={account.account}
                    className="hover:bg-sky-50/30 transition-colors group cursor-pointer"
                    onClick={() => window.location.href = `/account/${account.account}`}
                  >
                    {/* Rank */}
                    <td className="py-4 px-4">
                      <span className="text-sm font-bold text-[var(--text-muted)]">
                        {account.rank || ((currentPage - 1) * 25 + index + 1)}
                      </span>
                    </td>

                    {/* Account Name */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--text-primary)] font-semibold text-[13px] group-hover:text-sky-600 transition-colors">
                          {displayName}
                        </span>
                        {isVerified ? (
                          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="#1D9BF0">
                            <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                          </svg>
                        ) : hasLabel ? (
                          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="#6B7280">
                            <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484z" />
                            <circle cx="12" cy="10" r="3" fill="white" />
                            <path d="M18 18.5c0-2.5-2.7-4.5-6-4.5s-6 2-6 4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="#6B7280">
                            <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484z" />
                            <text x="12" y="16" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">?</text>
                          </svg>
                        )}
                      </div>
                      {account.label?.description && (
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate max-w-[250px]">
                          {account.label.description}
                        </p>
                      )}
                    </td>

                    {/* Address */}
                    <td className="py-4 px-4">
                      <span className="font-mono text-xs text-[var(--text-tertiary)] group-hover:text-sky-600 transition-colors">
                        {shortenAddress(account.account)}
                      </span>
                    </td>

                    {/* Balance */}
                    <td className="py-4 px-4 text-right">
                      <div className="text-[var(--text-primary)] font-semibold text-[13px]">
                        {formatFullBalance(account.balance || 0)}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">XLM</div>
                    </td>

                    {/* Transactions */}
                    <td className="py-4 px-4 text-right">
                      <span className="text-[var(--text-secondary)] text-[13px]">
                        {parseInt(account.transactions || '0').toLocaleString()}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 text-center">
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 text-[9px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                          Verified
                        </span>
                      ) : hasLabel ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] text-[9px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]"></span>
                          Labeled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--bg-primary)] text-[var(--text-muted)] text-[9px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]"></span>
                          Unknown
                        </span>
                      )}
                    </td>

                    {/* Arrow */}
                    <td className="py-4 px-4">
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-sky-100 group-hover:text-sky-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredAndSortedAccounts.length === 0 && (
            <div className="text-center py-16">
              <div className="w-14 h-14 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-[var(--text-primary)] font-semibold mb-1">No accounts found</h3>
              <p className="text-[var(--text-muted)] text-sm">
                {searchQuery ? `No accounts matching "${searchQuery}"` : 'No accounts available'}
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 px-4 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]/50">
              <button
                onClick={() => fetchPage(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-muted)] hover:bg-sky-50 hover:border-sky-200 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => fetchPage(pageNum)}
                    disabled={isLoading}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-bold transition-colors ${currentPage === pageNum
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'text-[var(--text-muted)] hover:bg-sky-50 hover:text-sky-700'
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {totalPages > 5 && currentPage < totalPages - 2 && (
                <span className="text-[var(--text-muted)] text-xs px-1">...</span>
              )}

              <button
                onClick={() => fetchPage(currentPage + 1)}
                disabled={currentPage === totalPages || isLoading}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-muted)] hover:bg-sky-50 hover:border-sky-200 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
