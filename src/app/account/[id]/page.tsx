import { getAccount, getAccountTransactions, getAccountOperations, formatXLM, shortenAddress, formatDate, timeAgo } from '@/lib/stellar';
import Link from 'next/link';
import AccountTabs from '@/components/AccountTabs';

export const revalidate = 30;

interface AccountPageProps {
  params: Promise<{ id: string }>;
}

export default async function AccountPage({ params }: AccountPageProps) {
  const { id } = await params;

  let account;
  let transactions: Awaited<ReturnType<typeof getAccountTransactions>>['_embedded']['records'] = [];
  let operations: Awaited<ReturnType<typeof getAccountOperations>>['_embedded']['records'] = [];
  let error: string | null = null;

  try {
    [account, { _embedded: { records: transactions } }, { _embedded: { records: operations } }] = await Promise.all([
      getAccount(id),
      getAccountTransactions(id, 25),
      getAccountOperations(id, 25),
    ]);
  } catch (e) {
    error = 'Account not found or invalid account ID';
    console.error(e);
  }

  if (error || !account) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 bg-[#1a1215] rounded-2xl flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Account Not Found</h1>
        <p className="text-[#888] mb-6">The account ID may be invalid or the account doesn&apos;t exist.</p>
        <p className="text-[#555] font-mono text-sm mb-8 break-all max-w-lg text-center px-4">{id}</p>
        <Link
          href="/"
          className="px-6 py-3 bg-[#BFF549] text-black font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const xlmBalance = account.balances.find(b => b.asset_type === 'native');
  const otherBalances = account.balances.filter(b => b.asset_type !== 'native');
  const totalAssets = account.balances.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-[#BFF549]/20 to-[#BFF549]/5 rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-[#BFF549]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-white">Account</h1>
            {account.home_domain && (
              <span className="px-2 py-0.5 bg-[#BFF549]/10 text-[#BFF549] text-xs font-medium rounded-full">
                {account.home_domain}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[#888] font-mono text-sm break-all">{id}</p>
            <button
              className="p-1.5 hover:bg-[#222] rounded-lg transition-colors group"
              title="Copy address"
            >
              <svg className="w-4 h-4 text-[#555] group-hover:text-[#BFF549]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Balance Overview */}
        <div className="lg:col-span-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-6">
          <h2 className="text-sm font-medium text-[#666] uppercase tracking-wider mb-4">Overview</h2>

          <div className="space-y-4">
            {/* XLM Balance */}
            <div className="flex items-center justify-between py-3 border-b border-[#1a1a1a]">
              <span className="text-[#888]">XLM Balance:</span>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-[#1a2a1a] rounded-full flex items-center justify-center">
                  <span className="text-[#BFF549] text-xs font-bold">✦</span>
                </div>
                <span className="text-white font-semibold">{formatXLM(xlmBalance?.balance || '0')} XLM</span>
              </div>
            </div>

            {/* Assets Count */}
            <div className="flex items-center justify-between py-3 border-b border-[#1a1a1a]">
              <span className="text-[#888]">Assets:</span>
              <span className="text-white font-semibold">{totalAssets} Token{totalAssets !== 1 ? 's' : ''}</span>
            </div>

            {/* Subentries */}
            <div className="flex items-center justify-between py-3 border-b border-[#1a1a1a]">
              <span className="text-[#888]">Subentries:</span>
              <span className="text-white font-semibold">{account.subentry_count}</span>
            </div>

            {/* Sequence */}
            <div className="flex items-center justify-between py-3">
              <span className="text-[#888]">Sequence:</span>
              <span className="text-[#888] font-mono text-sm">{account.sequence}</span>
            </div>
          </div>
        </div>

        {/* More Info Card */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-6">
          <h2 className="text-sm font-medium text-[#666] uppercase tracking-wider mb-4">More Info</h2>

          <div className="space-y-4">
            {/* Last Active */}
            <div className="flex flex-col gap-1">
              <span className="text-[#666] text-xs">Last Active</span>
              <span className="text-white text-sm">{timeAgo(account.last_modified_time)}</span>
            </div>

            {/* Last Modified Ledger */}
            <div className="flex flex-col gap-1">
              <span className="text-[#666] text-xs">Last Modified Ledger</span>
              <Link
                href={`/ledger/${account.last_modified_ledger}`}
                className="text-[#BFF549] hover:underline text-sm"
              >
                #{account.last_modified_ledger.toLocaleString()}
              </Link>
            </div>

            {/* Signers */}
            <div className="flex flex-col gap-1">
              <span className="text-[#666] text-xs">Signers</span>
              <span className="text-white text-sm">{account.signers.length}</span>
            </div>

            {/* Sponsorship */}
            <div className="flex flex-col gap-1">
              <span className="text-[#666] text-xs">Sponsoring / Sponsored</span>
              <span className="text-white text-sm">{account.num_sponsoring} / {account.num_sponsored}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Thresholds & Flags */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Thresholds */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-6">
          <h2 className="text-sm font-medium text-[#666] uppercase tracking-wider mb-4">Thresholds</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#111] rounded-xl p-4 text-center">
              <p className="text-[#666] text-xs mb-1">Low</p>
              <p className="text-white text-2xl font-bold">{account.thresholds.low_threshold}</p>
            </div>
            <div className="bg-[#111] rounded-xl p-4 text-center">
              <p className="text-[#666] text-xs mb-1">Medium</p>
              <p className="text-white text-2xl font-bold">{account.thresholds.med_threshold}</p>
            </div>
            <div className="bg-[#111] rounded-xl p-4 text-center">
              <p className="text-[#666] text-xs mb-1">High</p>
              <p className="text-white text-2xl font-bold">{account.thresholds.high_threshold}</p>
            </div>
          </div>
        </div>

        {/* Flags */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-6">
          <h2 className="text-sm font-medium text-[#666] uppercase tracking-wider mb-4">Flags</h2>
          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              account.flags.auth_required
                ? 'bg-[#BFF549]/10 text-[#BFF549]'
                : 'bg-[#1a1a1a] text-[#555]'
            }`}>
              {account.flags.auth_required ? '✓' : '✗'} Auth Required
            </span>
            <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              account.flags.auth_revocable
                ? 'bg-yellow-500/10 text-yellow-400'
                : 'bg-[#1a1a1a] text-[#555]'
            }`}>
              {account.flags.auth_revocable ? '✓' : '✗'} Auth Revocable
            </span>
            <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              account.flags.auth_immutable
                ? 'bg-red-500/10 text-red-400'
                : 'bg-[#1a1a1a] text-[#555]'
            }`}>
              {account.flags.auth_immutable ? '✓' : '✗'} Auth Immutable
            </span>
            <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              account.flags.auth_clawback_enabled
                ? 'bg-blue-500/10 text-blue-400'
                : 'bg-[#1a1a1a] text-[#555]'
            }`}>
              {account.flags.auth_clawback_enabled ? '✓' : '✗'} Clawback
            </span>
          </div>
        </div>
      </div>

      {/* Assets/Balances */}
      {otherBalances.length > 0 && (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-6">
          <h2 className="text-sm font-medium text-[#666] uppercase tracking-wider mb-4">
            Token Holdings ({otherBalances.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {otherBalances.slice(0, 9).map((balance, idx) => (
              <div key={idx} className="bg-[#111] rounded-xl p-4 hover:bg-[#151515] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#1a1a1a] rounded-full flex items-center justify-center shrink-0">
                    <span className="text-[#888] font-bold text-xs">
                      {balance.asset_code?.substring(0, 3) || 'LP'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium truncate">{balance.asset_code || 'Liquidity Pool'}</p>
                    {balance.asset_issuer && (
                      <Link
                        href={`/account/${balance.asset_issuer}`}
                        className="text-[#555] text-xs hover:text-[#888] truncate block"
                      >
                        {shortenAddress(balance.asset_issuer, 4)}
                      </Link>
                    )}
                  </div>
                  <p className="text-white font-semibold text-sm">{formatXLM(balance.balance)}</p>
                </div>
              </div>
            ))}
          </div>
          {otherBalances.length > 9 && (
            <p className="text-[#555] text-sm text-center mt-4">
              +{otherBalances.length - 9} more tokens
            </p>
          )}
        </div>
      )}

      {/* Signers */}
      {account.signers.length > 1 && (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-6">
          <h2 className="text-sm font-medium text-[#666] uppercase tracking-wider mb-4">
            Signers ({account.signers.length})
          </h2>
          <div className="space-y-2">
            {account.signers.map((signer, idx) => (
              <div key={idx} className="flex items-center justify-between bg-[#111] rounded-xl p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-[#1a1a1a] rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-[#555]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[#555] text-xs capitalize">{signer.type}</p>
                    <Link
                      href={`/account/${signer.key}`}
                      className="text-[#888] hover:text-white font-mono text-sm truncate block"
                    >
                      {shortenAddress(signer.key, 8)}
                    </Link>
                  </div>
                </div>
                <span className="px-3 py-1 bg-[#1a2a1a] text-[#BFF549] rounded-lg text-sm font-semibold shrink-0">
                  {signer.weight}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions & Operations Tabs */}
      <AccountTabs transactions={transactions} operations={operations} />
    </div>
  );
}
