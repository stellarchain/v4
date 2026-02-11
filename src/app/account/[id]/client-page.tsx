'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import { Horizon } from '@stellar/stellar-sdk';
import { getBaseUrl, normalizeTransactions, getXLMUSDPriceFromHorizon, getAccountLabels } from '@/lib/stellar';
import type { AccountLabel, Transaction, Operation } from '@/lib/stellar';
import Link from 'next/link';
import AccountMobileView from '@/components/mobile/AccountMobileView';
import AccountDesktopView from '@/components/desktop/AccountDesktopView';
import Loading from '@/components/ui/Loading';
import { getDetailRouteValue } from '@/lib/routeDetail';


type Account = Horizon.ServerApi.AccountRecord;

// Extract counterparty addresses from operations
function extractCounterpartyAddresses(operations: Operation[], accountId: string): string[] {
  const addresses = new Set<string>();

  for (const op of operations) {
    // Payment operations
    if (op.from && op.from !== accountId && op.from.startsWith('G')) {
      addresses.add(op.from);
    }
    if (op.to && op.to !== accountId && op.to.startsWith('G')) {
      addresses.add(op.to);
    }
    // Source account
    if (op.source_account && op.source_account !== accountId && op.source_account.startsWith('G')) {
      addresses.add(op.source_account);
    }
    // Funder for create_account
    if (op.funder && op.funder !== accountId && op.funder.startsWith('G')) {
      addresses.add(op.funder);
    }
    // Account for other operations
    if (op.account && op.account !== accountId && op.account.startsWith('G')) {
      addresses.add(op.account);
    }
  }

  return Array.from(addresses);
}

export default function AccountPage() {
  const params = useParams<{ id?: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = getDetailRouteValue({
    pathname,
    searchParams,
    queryKey: 'id',
    routeParam: params.id,
    aliases: ['/account', '/accounts', '/address'],
  });
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [xlmPrice, setXlmPrice] = useState(0.10);
  const [accountLabels, setAccountLabels] = useState<Record<string, AccountLabel>>({});
  const [currentAccountLabel, setCurrentAccountLabel] = useState<AccountLabel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  // Detect mobile/desktop to conditionally render only one component
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const fetchAccountData = async () => {
      try {
        setLoading(true);
        const server = new Horizon.Server(getBaseUrl());

        // Fetch account, transactions, and operations
        const [accountResponse, transactionsResponse, operationsResponse] = await Promise.all([
          server.accounts().accountId(id).call(),
          server.transactions().forAccount(id).order('desc').limit(50).call(),
          server.operations().forAccount(id).order('desc').limit(100).call(),
        ]);

        const accountData = accountResponse as unknown as Account;
        const transactionsData = normalizeTransactions(transactionsResponse.records || []);
        let operationsData = (operationsResponse.records || []) as unknown as Operation[];

        // For Soroban contract calls, the operation's source can be different from the transaction's source
        // This means contract calls made by this account might not appear in /accounts/{id}/operations
        // We need to fetch operations from transactions where this account is the source
        const existingOpTxHashes = new Set(operationsData.map(op => op.transaction_hash));

        // Find transactions that don't have operations in our list (likely contract calls with different op source)
        const missingTxs = transactionsData.filter(tx => !existingOpTxHashes.has(tx.hash));

        if (missingTxs.length > 0) {
          // Fetch operations for missing transactions (limit to first 20 to avoid too many requests)
          const additionalOpsPromises = missingTxs.slice(0, 20).map(async tx => {
            try {
              const txOps = await server.operations().forTransaction(tx.hash).limit(5).call();
              return (txOps.records || []) as unknown as Operation[];
            } catch {
              return [];
            }
          });

          const additionalOpsArrays = await Promise.all(additionalOpsPromises);
          const additionalOps = additionalOpsArrays.flat();

          // Merge additional operations into the main list
          if (additionalOps.length > 0) {
            operationsData = [...operationsData, ...additionalOps];
            // Sort by created_at descending to ensure proper order
            operationsData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          }
        }

        // Fetch XLM price from Horizon (XLM/USDC trade aggregation)
        const priceData = await getXLMUSDPriceFromHorizon();

        // Fetch labels for counterparty addresses AND the current account
        const counterpartyAddresses = operationsData.length > 0 ? extractCounterpartyAddresses(operationsData, id) : [];
        const allAddresses = [id, ...counterpartyAddresses];

        const labels: Record<string, AccountLabel> = {};
        let currentLabel: AccountLabel | null = null;

        try {
          const labelsMap = await getAccountLabels(allAddresses);
          labelsMap.forEach((label, address) => {
            if (address.toUpperCase() === id.toUpperCase()) {
              currentLabel = label;
            } else {
              labels[address] = label;
            }
          });
        } catch (e) {
          console.error('Failed to fetch account labels:', e);
        }

        setAccount(accountData);
        setTransactions(transactionsData);
        setOperations(operationsData);
        setXlmPrice(priceData);
        setAccountLabels(labels);
        setCurrentAccountLabel(currentLabel);
      } catch (e) {
        setError('Account not found or invalid account ID');
        console.error('Error fetching account data:', e);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchAccountData();
    }
  }, [id]);

  if (loading) {
    return <Loading title="Loading account" description="Fetching account details and activity." />;
  }

  if (error || !account) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Account Not Found</h1>
        <p className="text-[var(--text-tertiary)] mb-4">The account ID may be invalid or the account doesn&apos;t exist.</p>
        <p className="text-[var(--text-muted)] font-mono text-sm mb-4 break-all max-w-lg text-center px-4">{id}</p>
        <Link
          href="/"
          className="px-4 py-3 bg-[var(--primary)] text-black font-semibold rounded-xl hover:opacity-90 transition-opacity"
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
      {isMobile ? (
        <AccountMobileView
          account={accountData}
          transactions={transactions}
          operations={operations}
          xlmPrice={xlmPrice}
          accountLabels={accountLabels}
          currentAccountLabel={currentAccountLabel}
        />
      ) : (
        <AccountDesktopView
          account={accountData}
          transactions={transactions}
          operations={operations}
          xlmPrice={xlmPrice}
          accountLabels={accountLabels}
          currentAccountLabel={currentAccountLabel}
        />
      )}
    </>
  );
}
