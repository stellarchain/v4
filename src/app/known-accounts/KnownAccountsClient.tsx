'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { shortenAddress } from '@/lib/stellar';
import type { LabeledAccountsAPIResponse, LabeledAccount } from '@/lib/stellar';

interface KnownAccountsClientProps {
  initialData: LabeledAccountsAPIResponse;
}

export default function KnownAccountsClient({ initialData }: KnownAccountsClientProps) {
  const [accounts, setAccounts] = useState<LabeledAccount[]>(initialData?.data || []);
  const [currentPage, setCurrentPage] = useState(initialData?.current_page || 1);
  const [totalPages, setTotalPages] = useState(initialData?.last_page || 1);
  const [total, setTotal] = useState(initialData?.total || 0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPage = useCallback(async (page: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.stellarchain.io/v1/accounts?page=${page}&labels[]=undefined&paginate=25`
      );
      const json = await response.json();

      setAccounts(json.data || []);
      setCurrentPage(json.meta?.current_page || 1);
      setTotalPages(json.meta?.last_page || 1);
      setTotal(json.meta?.total || 0);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
              <span className="bg-[var(--primary-blue)]/10 text-[var(--primary-blue)] text-[10px] px-1.5 py-0.5 rounded font-bold">
                {(total || 0).toLocaleString()}
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
                {(total || 0).toLocaleString()} labeled accounts in the directory
              </p>
            </div>
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

        {/* Mobile List View - Compact Cards */}
        <div className="md:hidden">
          {accounts.length === 0 ? (
            <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-12 text-center text-[var(--text-muted)] italic text-sm">
              No accounts found
            </div>
          ) : (
            <div className="space-y-1.5">
              {accounts.map((account) => (
                <Link
                  key={account.account}
                  href={`/account/${account.account}`}
                  className="block bg-[var(--bg-secondary)] rounded-lg shadow-sm border border-[var(--border-subtle)] active:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <div className="px-3 py-2">
                    {/* Single Row Layout */}
                    <div className="flex items-center">
                      {/* Name & Address */}
                      <div className="flex-1 min-w-0 mr-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[13px] font-semibold text-[var(--primary-blue)] truncate">
                            {account.label?.name || account.org_name || 'Unknown'}
                          </span>
                          {account.label?.verified === 1 && (
                            <svg className="w-3 h-3 flex-shrink-0 text-[var(--success)]" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                          {shortenAddress(account.account, 4)}
                        </span>
                      </div>

                      {/* Balance & Transactions */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-[13px] font-bold text-[var(--text-primary)]">
                          {formatBalance(account.balance || 0)} <span className="text-[var(--text-muted)] font-normal text-[10px]">XLM</span>
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          {parseInt(account.transactions || '0').toLocaleString()} txs
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] overflow-hidden">
          {accounts.length === 0 ? (
            <div className="px-4 py-12 text-center text-[var(--text-muted)] italic text-sm">
              No accounts found
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Account</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Address</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Balance</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Transactions</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {accounts.map((account) => (
                  <tr
                    key={account.account}
                    className="hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/account/${account.account}`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--primary-blue)]">
                          {account.label?.name || account.org_name || 'Unknown'}
                        </span>
                        {account.label?.verified === 1 && (
                          <svg className="w-4 h-4 text-[var(--success)]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-sm text-[var(--text-muted)]">
                        {shortenAddress(account.account, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-mono font-semibold text-[var(--text-primary)]">
                        {formatBalance(account.balance || 0)}
                      </span>
                      <span className="text-[var(--text-muted)] ml-1">XLM</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-[var(--text-secondary)]">
                        {parseInt(account.transactions || '0').toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <svg className="w-4 h-4 text-[var(--text-muted)] inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => fetchPage(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <span className="text-sm text-[var(--text-muted)] min-w-[100px] text-center">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => fetchPage(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
