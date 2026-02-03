'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { RichListAccount, shortenAddress } from '@/lib/stellar';

interface TopAccountsDesktopViewProps {
  initialAccounts: RichListAccount[];
}

type SortField = 'rank' | 'balance' | 'percent';
type SortOrder = 'asc' | 'desc';

function formatBalance(balance: number): string {
  if (balance >= 1e9) return `${(balance / 1e9).toFixed(2)}B`;
  if (balance >= 1e6) return `${(balance / 1e6).toFixed(2)}M`;
  if (balance >= 1e3) return `${(balance / 1e3).toFixed(1)}K`;
  return balance.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatFullBalance(balance: number): string {
  return balance.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  return (
    <svg className={`w-3 h-3 ml-1 inline-block ${active ? 'text-sky-600' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 24 24">
      {order === 'desc' || !active ? (
        <path d="M7 10l5 5 5-5H7z" />
      ) : (
        <path d="M7 14l5-5 5 5H7z" />
      )}
    </svg>
  );
}

export default function TopAccountsDesktopView({ initialAccounts }: TopAccountsDesktopViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Calculate totals
  const totals = useMemo(() => {
    const totalBalance = initialAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    const totalPercent = initialAccounts.reduce((sum, acc) => sum + parseFloat(acc.percent_of_coins || '0'), 0);
    const verifiedCount = initialAccounts.filter(acc => acc.label?.verified).length;
    return { totalBalance, totalPercent, verifiedCount, totalAccounts: initialAccounts.length };
  }, [initialAccounts]);

  const filteredAndSortedAccounts = useMemo(() => {
    let accounts = [...initialAccounts];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      accounts = accounts.filter(
        (account) =>
          account.account.toLowerCase().includes(query) ||
          (account.label?.name && account.label.name.toLowerCase().includes(query))
      );
    }

    accounts.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'rank':
          comparison = a.rank - b.rank;
          break;
        case 'balance':
          comparison = (b.balance || 0) - (a.balance || 0);
          break;
        case 'percent':
          comparison = parseFloat(b.percent_of_coins || '0') - parseFloat(a.percent_of_coins || '0');
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return accounts;
  }, [initialAccounts, searchQuery, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'rank' ? 'asc' : 'desc');
    }
  };

  const HeaderCell = ({ label, field, className = '' }: { label: string; field?: SortField; className?: string }) => {
    const isSortable = !!field;
    const isActive = sortField === field;

    return (
      <th
        className={`py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-left whitespace-nowrap ${isSortable ? 'cursor-pointer hover:text-sky-600 transition-colors select-none' : ''} ${isActive ? 'text-sky-600' : 'text-slate-400'} ${className}`}
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-[1600px] p-6 lg:p-8">
        {/* Header Card */}
        <div className="mb-5 rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            {/* Left: Title & Meta */}
            <div className="flex items-start gap-4 min-w-0">
              <Link
                href="/"
                className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 transition hover:bg-sky-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Accounts</span>
                  <span className="bg-sky-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                    Top {totals.totalAccounts}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {totals.verifiedCount} Verified
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-900">Top Accounts by Balance</div>
                <div className="mt-1 text-xs text-slate-500">
                  Richest accounts on the Stellar network ranked by XLM holdings
                </div>
              </div>
            </div>

            {/* Right: Quick Stats */}
            <div className="flex gap-3">
              <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100 min-w-[120px]">
                <div className="text-[9px] font-bold text-sky-600/60 uppercase tracking-widest mb-1">Total Balance</div>
                <div className="text-lg font-bold text-sky-600">
                  {formatBalance(totals.totalBalance)}
                  <span className="text-[10px] font-medium text-slate-400 ml-1">XLM</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 min-w-[110px]">
                <div className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest mb-1">Supply %</div>
                <div className="text-lg font-bold text-emerald-600">{totals.totalPercent.toFixed(2)}%</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 min-w-[90px]">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Verified</div>
                <div className="text-lg font-bold text-slate-900">{totals.verifiedCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-5">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or address..."
              className="w-full bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-300 pl-11 text-sm shadow-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/known-accounts"
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:border-sky-200 hover:text-sky-600 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Known Accounts
            </Link>
            <span className="text-sm text-slate-400">
              Showing {filteredAndSortedAccounts.length} accounts
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <HeaderCell label="#" field="rank" className="w-16" />
                <HeaderCell label="Account" className="min-w-[280px]" />
                <HeaderCell label="Address" className="min-w-[180px]" />
                <HeaderCell label="Balance" field="balance" className="text-right" />
                <HeaderCell label="% Supply" field="percent" className="text-right" />
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-center w-24">Status</th>
                <th className="py-3 px-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedAccounts.map((account) => {
                const isVerified = account.label?.verified;
                const hasLabel = !!account.label?.name;

                return (
                  <tr
                    key={account.account}
                    className="hover:bg-sky-50/30 transition-colors group cursor-pointer"
                    onClick={() => window.location.href = `/account/${account.account}`}
                  >
                    {/* Rank */}
                    <td className="py-4 px-4">
                      <span className={`text-sm font-bold ${
                        account.rank === 1 ? 'text-amber-500' :
                        account.rank === 2 ? 'text-slate-400' :
                        account.rank === 3 ? 'text-amber-700' :
                        'text-slate-500'
                      }`}>
                        #{account.rank}
                      </span>
                    </td>

                    {/* Account Name */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900 font-semibold text-[13px] group-hover:text-sky-600 transition-colors">
                          {account.label?.name || 'Unknown'}
                        </span>
                        {isVerified ? (
                          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="#1D9BF0">
                            <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"/>
                          </svg>
                        ) : hasLabel ? (
                          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="#6B7280">
                            <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484z"/>
                            <circle cx="12" cy="10" r="3" fill="white"/>
                            <path d="M18 18.5c0-2.5-2.7-4.5-6-4.5s-6 2-6 4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="#6B7280">
                            <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484z"/>
                            <text x="12" y="16" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">?</text>
                          </svg>
                        )}
                      </div>
                      {account.label?.description && (
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[250px]">
                          {account.label.description}
                        </p>
                      )}
                    </td>

                    {/* Address */}
                    <td className="py-4 px-4">
                      <span className="font-mono text-xs text-slate-500 group-hover:text-sky-600 transition-colors">
                        {shortenAddress(account.account, 8)}
                      </span>
                    </td>

                    {/* Balance */}
                    <td className="py-4 px-4 text-right">
                      <div className="text-slate-900 font-semibold text-[13px]">
                        {formatFullBalance(account.balance || 0)}
                      </div>
                      <div className="text-[10px] text-slate-400">XLM</div>
                    </td>

                    {/* Percent */}
                    <td className="py-4 px-4 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[11px] font-semibold">
                        {parseFloat(account.percent_of_coins || '0').toFixed(4)}%
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 text-center">
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-600 text-[9px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                          Verified
                        </span>
                      ) : hasLabel ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          Labeled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-slate-400 text-[9px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                          Unknown
                        </span>
                      )}
                    </td>

                    {/* Arrow */}
                    <td className="py-4 px-4">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-sky-100 group-hover:text-sky-600 transition-colors">
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
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-slate-900 font-semibold mb-1">No accounts found</h3>
              <p className="text-slate-400 text-sm">No accounts matching &quot;{searchQuery}&quot;</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
