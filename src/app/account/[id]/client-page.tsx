'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import { Horizon } from '@stellar/stellar-sdk';
import { normalizeTransactions, getXLMUSDPriceFromHorizon, getAccountLabels } from '@/lib/stellar';
import type { AccountLabel, Transaction, Operation } from '@/lib/stellar';
import Link from 'next/link';
import AccountMobileView from '@/components/mobile/AccountMobileView';
import AccountDesktopView from '@/components/desktop/AccountDesktopView';
import { createHorizonServer } from '@/services/horizon';
import { apiEndpoints, getApiV1Data } from '@/services/api';

import { getDetailRouteValue } from '@/lib/shared/routeDetail';


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
  const [accountMetricDates, setAccountMetricDates] = useState<{ firstTransactionAt?: string; lastTransactionAt?: string }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  // Track which tab data has been fetched
  const [transactionsFetched, setTransactionsFetched] = useState(false);
  const [operationsFetched, setOperationsFetched] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingOperations, setLoadingOperations] = useState(false);

  // Detect mobile/desktop to conditionally render only one component
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Initial load: only account data + XLM price
  useEffect(() => {
    const fetchAccountData = async () => {
      try {
        setLoading(true);
        const server = createHorizonServer();

        const [accountResponse, priceData, accountMetaResponse] = await Promise.all([
          server.accounts().accountId(id).call(),
          getXLMUSDPriceFromHorizon(),
          getApiV1Data(apiEndpoints.v1.accounts({ 'address[]': id, itemsPerPage: 1 })).catch(() => null),
        ]);

        const accountData = accountResponse as unknown as Account;

        setAccount(accountData);
        setXlmPrice(priceData);

        const accountMetaRecord = accountMetaResponse?.member?.find(
          (entry: any) => String(entry?.address || '').toUpperCase() === id.toUpperCase()
        ) || accountMetaResponse?.member?.[0];

        setCurrentAccountLabel(
          accountMetaRecord?.label
            ? {
                name: accountMetaRecord.label,
                verified: accountMetaRecord.verified === true,
                org_name: null,
                description: null,
              }
            : null
        );

        setAccountMetricDates({
          firstTransactionAt: accountMetaRecord?.accountMetric?.firstTransactionAt || undefined,
          lastTransactionAt: accountMetaRecord?.accountMetric?.lastTransactionAt || undefined,
        });
      } catch (e) {
        setError('Account not found or invalid account ID');
        console.error('Error fetching account data:', e);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      // Reset state for new account
      setTransactionsFetched(false);
      setOperationsFetched(false);
      setTransactions([]);
      setOperations([]);
      setAccountLabels({});
      setCurrentAccountLabel(null);
      setAccountMetricDates({});
      fetchAccountData();
    }
  }, [id]);

  // Fetch transactions lazily when tab is activated
  const fetchTransactions = useCallback(async () => {
    if (transactionsFetched || loadingTransactions) return;
    setLoadingTransactions(true);
    try {
      const server = createHorizonServer();
      const transactionsResponse = await server.transactions().forAccount(id).order('desc').limit(50).call();
      const transactionsData = normalizeTransactions(transactionsResponse.records || []);
      setTransactions(transactionsData);
      setTransactionsFetched(true);
    } catch (e) {
      console.error('Error fetching transactions:', e);
    } finally {
      setLoadingTransactions(false);
    }
  }, [id, transactionsFetched, loadingTransactions]);

  // Fetch operations lazily when tab is activated
  const fetchOperations = useCallback(async () => {
    if (operationsFetched || loadingOperations) return;
    setLoadingOperations(true);
    try {
      const server = createHorizonServer();

      const [operationsResponse, transactionsResponse] = await Promise.all([
        server.operations().forAccount(id).order('desc').limit(100).call(),
        // We need transactions to find missing Soroban ops
        transactionsFetched
          ? Promise.resolve({ records: [] })
          : server.transactions().forAccount(id).order('desc').limit(50).call(),
      ]);

      let operationsData = (operationsResponse.records || []) as unknown as Operation[];

      // Also set transactions if we fetched them alongside
      let txData = transactions;
      if (!transactionsFetched && transactionsResponse.records?.length > 0) {
        txData = normalizeTransactions(transactionsResponse.records);
        setTransactions(txData);
        setTransactionsFetched(true);
      }

      // For Soroban contract calls, fetch operations from missing transactions
      const existingOpTxHashes = new Set(operationsData.map(op => op.transaction_hash));
      const missingTxs = txData.filter(tx => !existingOpTxHashes.has(tx.hash));

      if (missingTxs.length > 0) {
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

        if (additionalOps.length > 0) {
          operationsData = [...operationsData, ...additionalOps];
          operationsData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
      }

      setOperations(operationsData);
      setOperationsFetched(true);

      // Fetch counterparty labels in background
      const counterpartyAddresses = operationsData.length > 0 ? extractCounterpartyAddresses(operationsData, id) : [];
      if (counterpartyAddresses.length > 0) {
        try {
          const labelsMap = await getAccountLabels(counterpartyAddresses);
          const labels: Record<string, AccountLabel> = {};
          labelsMap.forEach((label, address) => {
            labels[address] = label;
          });
          setAccountLabels(labels);
        } catch (e) {
          console.error('Failed to fetch counterparty labels:', e);
        }
      }
    } catch (e) {
      console.error('Error fetching operations:', e);
    } finally {
      setLoadingOperations(false);
    }
  }, [id, operationsFetched, loadingOperations, transactionsFetched, transactions]);

  if (!loading && (error || !account)) {
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

  const accountData = account ? {
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
  } : null;

  return (
    <>
      {isMobile ? (
        <AccountMobileView
          account={accountData}
          accountId={id}
          transactions={transactions}
          operations={operations}
          xlmPrice={xlmPrice}
          accountLabels={accountLabels}
          currentAccountLabel={currentAccountLabel}
          firstTransactionAt={accountMetricDates.firstTransactionAt}
          lastTransactionAt={accountMetricDates.lastTransactionAt}
          loading={loading}
          onTabChange={(tab: string) => {
            if (tab === 'transactions' && !transactionsFetched) fetchTransactions();
            if (tab === 'operations' && !operationsFetched) fetchOperations();
          }}
          loadingTransactions={loadingTransactions}
          loadingOperations={loadingOperations}
        />
      ) : (
        <AccountDesktopView
          account={accountData}
          accountId={id}
          transactions={transactions}
          operations={operations}
          xlmPrice={xlmPrice}
          accountLabels={accountLabels}
          currentAccountLabel={currentAccountLabel}
          firstTransactionAt={accountMetricDates.firstTransactionAt}
          lastTransactionAt={accountMetricDates.lastTransactionAt}
          loading={loading}
          onTabChange={(tab: string) => {
            if (tab === 'transactions' && !transactionsFetched) fetchTransactions();
            if (tab === 'operations' && !operationsFetched) fetchOperations();
          }}
          loadingTransactions={loadingTransactions}
          loadingOperations={loadingOperations}
        />
      )}
    </>
  );
}
