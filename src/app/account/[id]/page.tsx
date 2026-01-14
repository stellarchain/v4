import { getAccount, getAccountTransactions, getAccountOperations, getXLMUSDPriceFromHorizon } from '@/lib/stellar';
import Link from 'next/link';
import AccountMobileView from '@/components/mobile/AccountMobileView';
import AccountDesktopView from '@/components/desktop/AccountDesktopView';

export const revalidate = 30;

interface AccountPageProps {
  params: Promise<{ id: string }>;
}

export default async function AccountPage({ params }: AccountPageProps) {
  const { id } = await params;

  let account;
  let transactions: Awaited<ReturnType<typeof getAccountTransactions>>['_embedded']['records'] = [];
  let operations: Awaited<ReturnType<typeof getAccountOperations>>['_embedded']['records'] = [];
  let xlmPrice = 0.10;
  let error: string | null = null;

  try {
    [account, { _embedded: { records: transactions } }, { _embedded: { records: operations } }, xlmPrice] = await Promise.all([
      getAccount(id),
      getAccountTransactions(id, 25),
      getAccountOperations(id, 100),
      getXLMUSDPriceFromHorizon(),
    ]);
  } catch (e) {
    error = 'Account not found or invalid account ID';
    console.error(e);
  }

  if (error || !account) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Account Not Found</h1>
        <p className="text-[var(--text-tertiary)] mb-6">The account ID may be invalid or the account doesn&apos;t exist.</p>
        <p className="text-[var(--text-muted)] font-mono text-sm mb-8 break-all max-w-lg text-center px-4">{id}</p>
        <Link
          href="/"
          className="px-6 py-3 bg-[var(--primary)] text-black font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const accountData = {
    id,
    balances: account.balances,
    subentry_count: account.subentry_count,
    sequence: account.sequence,
    last_modified_time: account.last_modified_time,
    last_modified_ledger: account.last_modified_ledger,
    signers: account.signers,
    num_sponsoring: account.num_sponsoring,
    num_sponsored: account.num_sponsored,
    thresholds: account.thresholds,
    flags: account.flags,
    home_domain: account.home_domain,
  };

  return (
    <>
      <div className="hidden lg:block">
        <AccountDesktopView
          account={accountData}
          transactions={transactions}
          operations={operations}
          xlmPrice={xlmPrice}
        />
      </div>
      <div className="block lg:hidden">
        <AccountMobileView
          account={accountData}
          transactions={transactions}
          operations={operations}
          xlmPrice={xlmPrice}
        />
      </div>
    </>
  );
}
