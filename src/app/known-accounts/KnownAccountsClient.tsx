'use client';

import Link from 'next/link';
import { shortenAddress } from '@/lib/stellar';
import type { LabeledAccountsAPIResponse } from '@/lib/stellar';

interface KnownAccountsClientProps {
  initialData: LabeledAccountsAPIResponse | null;
  xlmPriceUsd?: number | null;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  loading?: boolean;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

function AccountStatusIcons({ labelText, verified }: { labelText?: string; verified?: boolean }) {
  const normalized = (labelText || '').toLowerCase();
  const isSpam = normalized.includes('spam');
  const isRisk = normalized.includes('scam') || normalized.includes('hack') || normalized.includes('malicious') || isSpam;
  const hasLabel = Boolean(labelText);
  const isVerified = Boolean(verified) && !isRisk;

  return (
    <>
      {isRisk && (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill={isSpam ? '#F97316' : '#EF4444'}>
          <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484z" />
          <path d="M12 7v6m0 2v2" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
      {hasLabel && (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="4.25" fill="#F59E0B" />
          <circle cx="12" cy="8" r="2.1" fill="#FEF3C7" />
          <path d="M9.2 11.2L7.6 20l4.4-2.5 4.4 2.5-1.6-8.8z" fill="#D97706" />
        </svg>
      )}
      {isVerified && (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="#1D9BF0">
          <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
        </svg>
      )}
      {!isRisk && !isVerified && !hasLabel && (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="#6B7280">
          <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484z" />
          <text x="12" y="16" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">?</text>
        </svg>
      )}
    </>
  );
}

export default function KnownAccountsClient({
  initialData,
  xlmPriceUsd,
  searchQuery,
  onSearchQueryChange,
  loading,
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: KnownAccountsClientProps) {
  const getTransactions = (acc: any) => String(acc.accountMetric?.totalTransactions ?? acc.accountMetric?.transactionsPerHour ?? '0');

  const accounts = (initialData?.member || []).map((acc: any) => ({
    account: acc.address,
    org_name: null,
    label: acc.label ? {
      name: acc.label,
      description: null,
      verified: acc.verified ? 1 : 0
    } : null,
    balance: parseFloat(acc.accountMetric?.nativeBalance || '0'),
    transactions: getTransactions(acc),
  }));

  const formatBalance = (balance: number) => {
    if (balance >= 1e9) return `${(balance / 1e9).toFixed(2)}B`;
    if (balance >= 1e6) return `${(balance / 1e6).toFixed(2)}M`;
    if (balance >= 1e3) return `${(balance / 1e3).toFixed(2)}K`;
    return balance.toFixed(2);
  };

  const formatUsdBalance = (balanceXlm: number) => {
    if (!xlmPriceUsd || !Number.isFinite(xlmPriceUsd)) return '$-';
    const usd = balanceXlm * xlmPriceUsd;
    return usd.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-20 pt-1">
      <div className="px-3">
        {/* Header */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Known Accounts
            </span>
            <span className="bg-[var(--primary-blue)]/10 text-[var(--primary-blue)] text-[10px] px-1.5 py-0.5 rounded font-bold">
              {totalItems.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-4 h-4 text-[var(--text-muted)] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search by label or address..."
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] pl-10 pr-3 py-2.5 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-300 text-sm shadow-sm"
          />
        </div>

        {/* Accounts List */}
        {accounts.length === 0 ? (
          <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-subtle)] px-4 py-4 text-center text-[var(--text-muted)] italic text-sm">
            {loading ? 'Searching accounts...' : searchQuery ? `No accounts matching "${searchQuery}"` : 'No accounts found'}
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
                  <div className="flex items-center">
                    <div className="flex-1 min-w-0 mr-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[13px] font-semibold text-[var(--primary-blue)] truncate">
                          {account.label?.name || account.org_name || 'Unknown'}
                        </span>
                        <AccountStatusIcons
                          labelText={account.label?.name || account.org_name || undefined}
                          verified={account.label?.verified === 1}
                        />
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        {shortenAddress(account.account)}
                      </span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[13px] font-bold text-[var(--text-primary)]">
                        {formatBalance(account.balance || 0)} <span className="text-[var(--text-muted)] font-normal text-[10px]">XLM</span>
                      </div>
                      <div className="text-[10px] text-[var(--text-tertiary)]">
                        {formatUsdBalance(account.balance || 0)}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
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
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || loading}
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
