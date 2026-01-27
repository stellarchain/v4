'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { shortenAddress } from '@/lib/stellar';
import type { LabeledAccountsAPIResponse, LabeledAccount } from '@/lib/stellar';

interface KnownAccountsClientProps {
  initialData: LabeledAccountsAPIResponse;
}

export default function KnownAccountsClient({ initialData }: KnownAccountsClientProps) {
  const [accounts, setAccounts] = useState<LabeledAccount[]>(initialData.data);
  const [currentPage, setCurrentPage] = useState(initialData.current_page);
  const [totalPages, setTotalPages] = useState(initialData.last_page);
  const [total, setTotal] = useState(initialData.total);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchPage = useCallback(async (page: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.stellarchain.io/v1/accounts?page=${page}&labels[]=undefined&paginate=25`
      );
      const data: LabeledAccountsAPIResponse = await response.json();

      setAccounts(data.data);
      setCurrentPage(data.current_page);
      setTotalPages(data.last_page);
      setTotal(data.total);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Filter accounts by search
  const filteredAccounts = accounts.filter(account => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      account.label?.name?.toLowerCase().includes(q) ||
      account.account.toLowerCase().includes(q) ||
      account.org_name?.toLowerCase().includes(q)
    );
  });

  const formatBalance = (balance: number) => {
    if (balance >= 1e9) return `${(balance / 1e9).toFixed(2)}B`;
    if (balance >= 1e6) return `${(balance / 1e6).toFixed(2)}M`;
    if (balance >= 1e3) return `${(balance / 1e3).toFixed(2)}K`;
    return balance.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-20 pt-1 md:pt-6">
      <div className="max-w-[1600px] mx-auto px-3 md:px-6">
        {/* Mobile Header */}
        <div className="md:hidden">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Known Accounts
              </span>
              <span className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded">
                {total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block mb-6">
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
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Known Accounts</h1>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {total.toLocaleString()} labeled accounts in the directory
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="Search by name or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 pl-10 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] focus:border-transparent"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-[var(--bg-primary)]/50 z-50 flex items-center justify-center">
            <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-xl p-6 flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-[var(--primary-blue)]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="font-medium text-[var(--text-secondary)]">Loading...</span>
            </div>
          </div>
        )}

        {/* Accounts List */}
        <div className="space-y-2">
          {filteredAccounts.length === 0 ? (
            <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-12 text-center text-[var(--text-muted)] italic text-sm">
              No accounts found
            </div>
          ) : (
            filteredAccounts.map((account) => (
              <Link
                key={account.account}
                href={`/account/${account.account}`}
                className="block bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] active:bg-[var(--bg-tertiary)] transition-colors"
              >
                <div className="px-3 py-3 flex items-center justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                      account.label?.verified
                        ? 'bg-[var(--success)]/10 text-[var(--success)]'
                        : 'bg-[var(--primary-blue)]/10 text-[var(--primary-blue)]'
                    }`}>
                      {account.label?.verified ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold leading-tight text-[var(--primary-blue)]">
                          {account.label?.name || 'Unknown'}
                        </span>
                        {account.label?.verified === 1 && (
                          <svg className="w-3.5 h-3.5 text-[var(--success)]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-[var(--text-muted)] font-medium font-mono mt-0.5">
                        {shortenAddress(account.account, 6)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-[var(--text-primary)]">
                      {formatBalance(account.balance)} <span className="text-[var(--text-muted)] font-medium">XLM</span>
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {parseInt(account.transactions).toLocaleString()} txs
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && !search && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => fetchPage(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
              className="px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <span className="px-4 py-2 text-sm text-[var(--text-muted)]">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => fetchPage(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
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
  );
}
