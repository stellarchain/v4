'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Transaction, Operation, shortenAddress, timeAgo, getOperationTypeLabel, formatXLM } from '@/lib/stellar';

interface Balance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
}

interface AccountData {
  id: string;
  balances: Balance[];
  subentry_count: number;
  sequence: string;
  last_modified_time: string;
  last_modified_ledger: number;
  signers: Array<{ key: string; weight: number; type: string }>;
  num_sponsoring: number;
  num_sponsored: number;
  thresholds: { low_threshold: number; med_threshold: number; high_threshold: number };
  flags: { auth_required: boolean; auth_revocable: boolean; auth_immutable: boolean; auth_clawback_enabled: boolean };
  home_domain?: string;
}

interface AccountMobileViewProps {
  account: AccountData;
  transactions: Transaction[];
  operations: Operation[];
  xlmPrice: number;
}

function getAssetUrl(code: string | undefined, issuer: string | undefined): string {
  if (!code || code === 'native') return '/asset/XLM';
  if (code === 'XLM' && !issuer) return '/asset/XLM';
  return `/asset/${encodeURIComponent(code)}${issuer ? `?issuer=${encodeURIComponent(issuer)}` : ''}`;
}

export default function AccountMobileView({ account, transactions, operations, xlmPrice }: AccountMobileViewProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'balances' | 'activity' | 'info'>('balances');
  const [activityType, setActivityType] = useState<'payments' | 'contracts'>('payments');

  const xlmBalance = account.balances.find(b => b.asset_type === 'native');
  const otherBalances = account.balances.filter(b => b.asset_type !== 'native');

  const xlmAmount = parseFloat(xlmBalance?.balance || '0');
  const totalValueUSD = xlmAmount * xlmPrice;

  const handleCopy = () => {
    navigator.clipboard.writeText(account.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper function to decode contract function name from parameters
  const decodeContractFunctionName = (op: Operation): string => {
    try {
      // Look for the Sym parameter which contains the function name
      const parameters = op.parameters as Array<{ type: string; value: string }> | undefined;
      if (!parameters) return 'Contract Call';

      const symParam = parameters.find(p => p.type === 'Sym');
      if (!symParam) return 'Contract Call';

      // Decode base64 and extract the function name
      const decoded = atob(symParam.value);
      // The function name is in the decoded string, skip the first bytes (length prefix)
      const functionName = decoded.slice(5).replace(/\0/g, '');
      return functionName || 'Contract Call';
    } catch {
      return 'Contract Call';
    }
  };

  // Filter operations for payments and contracts
  const paymentOps = operations.filter(op =>
    op.type === 'payment' ||
    op.type === 'create_account' ||
    op.type === 'path_payment_strict_send' ||
    op.type === 'path_payment_strict_receive'
  );

  const contractOps = operations.filter(op =>
    op.type === 'invoke_host_function' ||
    op.type === 'extend_footprint_ttl' ||
    op.type === 'restore_footprint'
  );

  return (
    <div className="w-full bg-[#F5F5F7] min-h-screen pb-20 font-sans">
      <div className="w-full pt-6 px-4 max-w-2xl mx-auto">

        {/* Header Section */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="flex items-center gap-1 text-gray-500 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          <button
            onClick={handleCopy}
            className="p-2 hover:bg-gray-200 rounded-xl transition-colors"
          >
            {copied ? (
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>

        {/* Total Portfolio Value Section */}
        <div className="text-center mb-12">
          <p className="text-gray-500 text-sm mb-3">Total Portfolio Value</p>
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg className="w-8 h-8 text-gray-900" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <h1 className="text-5xl font-bold text-gray-900">
              {totalValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h1>
          </div>
          <p className="text-green-500 text-lg font-medium">
            {formatXLM(xlmBalance?.balance || '0')} XLM @ ${xlmPrice.toFixed(4)}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6 border-b border-gray-200 pb-2">
          <button
            onClick={() => setActiveTab('balances')}
            className={`pb-2 text-sm font-bold transition-colors ${
              activeTab === 'balances'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-400'
            }`}
          >
            Balances
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-2 text-sm font-bold transition-colors ${
              activeTab === 'activity'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-400'
            }`}
          >
            Activity
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`pb-2 text-sm font-bold transition-colors ${
              activeTab === 'info'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-400'
            }`}
          >
            Details
          </button>
        </div>

        {/* Balances Tab */}
        {activeTab === 'balances' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-gray-900 text-lg font-semibold">Assets</h2>
              <span className="text-blue-600 text-sm font-semibold">
                {account.balances.length} {account.balances.length === 1 ? 'asset' : 'assets'}
              </span>
            </div>

            {/* XLM Balance Card */}
            <Link
              href="/asset/XLM"
              className="block bg-white rounded-2xl p-4 hover:bg-gray-50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-gray-900 font-bold text-base">Stellar Lumens</p>
                  <p className="text-gray-500 text-xs mt-0.5">XLM</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-900 font-bold text-lg">
                    {formatXLM(xlmBalance?.balance || '0')}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    ${(xlmAmount * xlmPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </Link>

            {/* Other Balances */}
            {otherBalances.map((balance, idx) => {
              const amount = parseFloat(balance.balance);

              return (
                <Link
                  key={idx}
                  href={getAssetUrl(balance.asset_code, balance.asset_issuer)}
                  className="block bg-white rounded-2xl p-4 hover:bg-gray-50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-gray-900 font-bold text-base">
                        {balance.asset_code || 'Liquidity Pool'}
                      </p>
                      {balance.asset_issuer && (
                        <p className="text-gray-500 text-xs font-mono mt-0.5">
                          {shortenAddress(balance.asset_issuer, 6)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-gray-900 font-bold text-lg">
                        {amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {balance.asset_code || 'LP'}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            {/* Activity Type Toggle */}
            <div className="flex gap-2 p-1 bg-gray-200 rounded-xl">
              <button
                onClick={() => setActivityType('payments')}
                className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                  activityType === 'payments'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Payments ({paymentOps.length})
              </button>
              <button
                onClick={() => setActivityType('contracts')}
                className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                  activityType === 'contracts'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Smart Contracts ({contractOps.length})
              </button>
            </div>

            {/* Payments List */}
            {activityType === 'payments' && (
              <div className="space-y-3">
                {paymentOps.length === 0 ? (
                  <div className="text-center py-12 bg-gray-100 rounded-2xl">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">No payment operations found</p>
                  </div>
                ) : (
                  paymentOps.slice(0, 20).map((op) => (
                    <Link
                      key={op.id}
                      href={`/transaction/${op.transaction_hash}`}
                      className="block bg-gray-100 rounded-2xl p-4 hover:bg-gray-200 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            op.transaction_successful ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            {op.transaction_successful ? (
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </div>
                          {(op.amount || op.starting_balance) && (
                            <span className="text-gray-900 font-bold text-sm">
                              {parseFloat(op.amount || op.starting_balance || '0').toLocaleString(undefined, { maximumFractionDigits: 7 })} {op.asset_code || 'XLM'}
                            </span>
                          )}
                          {!op.amount && !op.starting_balance && (
                            <span className="text-gray-900 font-semibold text-sm">
                              {getOperationTypeLabel(op.type)}
                            </span>
                          )}
                        </div>
                        <span className="text-gray-500 text-xs">{timeAgo(op.created_at)}</span>
                      </div>
                      {(op.from || op.to || op.funder || op.account) && (
                        <div className="flex items-center gap-2 text-xs text-gray-600" onClick={(e) => e.stopPropagation()}>
                          {(op.from || op.funder) && (
                            <Link
                              href={`/account/${op.from || op.funder}`}
                              className="font-mono hover:text-gray-900 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {shortenAddress(op.from || op.funder || '', 6)}
                            </Link>
                          )}
                          {(op.from || op.funder) && (op.to || op.account) && (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          )}
                          {(op.to || op.account) && (
                            <Link
                              href={`/account/${op.to || op.account}`}
                              className="font-mono hover:text-gray-900 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {shortenAddress(op.to || op.account || '', 6)}
                            </Link>
                          )}
                        </div>
                      )}
                    </Link>
                  ))
                )}
              </div>
            )}

            {/* Smart Contracts List */}
            {activityType === 'contracts' && (
              <div className="space-y-3">
                {contractOps.length === 0 ? (
                  <div className="text-center py-12 bg-gray-100 rounded-2xl">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    </div>
                    <p className="text-gray-500">No smart contract operations found</p>
                  </div>
                ) : (
                  contractOps.slice(0, 20).map((op) => {
                    const functionName = decodeContractFunctionName(op);
                    return (
                      <Link
                        key={op.id}
                        href={`/transaction/${op.transaction_hash}`}
                        className="block bg-gray-100 rounded-2xl p-4 hover:bg-gray-200 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                              </svg>
                            </div>
                            <span className="text-gray-900 font-semibold text-sm">
                              {functionName}
                            </span>
                          </div>
                          <span className="text-gray-500 text-xs">{timeAgo(op.created_at)}</span>
                        </div>
                        <div className="text-xs text-gray-500 ml-10">
                          {op.type === 'invoke_host_function' ? 'Contract Invocation' : getOperationTypeLabel(op.type)}
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            <h2 className="text-gray-900 text-lg font-semibold mb-4">Account Details</h2>

            {/* Account ID */}
            <div className="bg-gray-100 rounded-2xl p-4">
              <p className="text-gray-500 text-sm mb-2">Account ID</p>
              <p className="text-gray-900 font-mono text-xs break-all">{account.id}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-100 rounded-2xl p-4">
                <p className="text-gray-500 text-sm mb-1">Sequence</p>
                <p className="text-gray-900 font-bold text-lg">{account.sequence}</p>
              </div>
              <div className="bg-gray-100 rounded-2xl p-4">
                <p className="text-gray-500 text-sm mb-1">Subentries</p>
                <p className="text-gray-900 font-bold text-lg">{account.subentry_count}</p>
              </div>
              <div className="bg-gray-100 rounded-2xl p-4">
                <p className="text-gray-500 text-sm mb-1">Signers</p>
                <p className="text-gray-900 font-bold text-lg">{account.signers.length}</p>
              </div>
              <div className="bg-gray-100 rounded-2xl p-4">
                <p className="text-gray-500 text-sm mb-1">Last Ledger</p>
                <Link
                  href={`/ledger/${account.last_modified_ledger}`}
                  className="text-blue-600 font-bold text-lg hover:underline"
                >
                  #{account.last_modified_ledger.toLocaleString()}
                </Link>
              </div>
            </div>

            {/* Thresholds */}
            <div className="bg-gray-100 rounded-2xl p-4">
              <p className="text-gray-500 text-sm mb-3">Thresholds</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-gray-500 text-xs mb-1">Low</p>
                  <p className="text-gray-900 font-bold text-xl">{account.thresholds.low_threshold}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-xs mb-1">Medium</p>
                  <p className="text-gray-900 font-bold text-xl">{account.thresholds.med_threshold}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-xs mb-1">High</p>
                  <p className="text-gray-900 font-bold text-xl">{account.thresholds.high_threshold}</p>
                </div>
              </div>
            </div>

            {/* Home Domain */}
            {account.home_domain && (
              <div className="bg-gray-100 rounded-2xl p-4">
                <p className="text-gray-500 text-sm mb-2">Home Domain</p>
                <p className="text-gray-900 font-semibold">{account.home_domain}</p>
              </div>
            )}

            {/* Flags */}
            <div className="bg-gray-100 rounded-2xl p-4">
              <p className="text-gray-500 text-sm mb-3">Flags</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Auth Required', active: account.flags.auth_required },
                  { label: 'Revocable', active: account.flags.auth_revocable },
                  { label: 'Immutable', active: account.flags.auth_immutable },
                  { label: 'Clawback', active: account.flags.auth_clawback_enabled },
                ].map((flag) => (
                  <span
                    key={flag.label}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                      flag.active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {flag.active ? '✓' : '✗'} {flag.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
