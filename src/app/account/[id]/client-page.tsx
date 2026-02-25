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
import { useNetwork, NETWORK_CONFIGS, type NetworkType } from '@/contexts/NetworkContext';
import { persistNetwork } from '@/lib/network/state';

import { getDetailRouteValue } from '@/lib/shared/routeDetail';


type Account = Horizon.ServerApi.AccountRecord;
type AccountMeta = {
  label?: string;
  verified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  network?: number;
  accountMetric?: {
    nativeBalance?: string | number;
    totalTransactions?: string | number;
    transactionsPerHour?: string | number;
    paymentsCount?: string | number;
    tradesCount?: string | number;
    rankPosition?: string | number;
    metricUpdatedAt?: string;
    firstTransactionAt?: string;
    lastTransactionAt?: string;
  };
  stellarData?: {
    activity24h?: {
      totalTransactions?: number;
      paymentOperations?: number;
      tradeOperations?: number;
      operationCount?: number;
      successRatePercent?: number | null;
      nativeBalanceChange24h?: string | number | {
        currentXlm?: string | number;
        referenceXlm?: string | number;
        changeXlm?: string | number;
        changePercent?: number | null;
        referenceRecordedHour?: string;
      } | null;
    };
  };
  activity24h?: {
    totalTransactions?: number;
    paymentOperations?: number;
    tradeOperations?: number;
    operationCount?: number;
    successRatePercent?: number | null;
    nativeBalanceChange24h?: string | number | {
      currentXlm?: string | number;
      referenceXlm?: string | number;
      changeXlm?: string | number;
      changePercent?: number | null;
      referenceRecordedHour?: string;
    } | null;
  };
};

function isExpectedAccountLookupError(error: unknown): boolean {
  const status = Number((error as any)?.response?.status);
  const title = String((error as any)?.response?.title || '').toLowerCase();
  const message = String((error as any)?.message || '').toLowerCase();
  const extras = String((error as any)?.response?.data?.detail || '').toLowerCase();

  return (
    status === 400 ||
    status === 404 ||
    title.includes('not found') ||
    title.includes('bad request') ||
    message.includes('not found') ||
    message.includes('bad request') ||
    message.includes('invalid') ||
    extras.includes('not found') ||
    extras.includes('bad request') ||
    extras.includes('invalid')
  );
}

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
  const { network: activeNetwork } = useNetwork();
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
  const [accountMeta, setAccountMeta] = useState<AccountMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  // Track which tab data has been fetched
  const [transactionsFetched, setTransactionsFetched] = useState(false);
  const [operationsFetched, setOperationsFetched] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingOperations, setLoadingOperations] = useState(false);
  const [checkingOtherNetworks, setCheckingOtherNetworks] = useState(false);
  const [availableNetworks, setAvailableNetworks] = useState<NetworkType[]>([]);

  const isLikelyStellarAccount = useCallback((value: string) => {
    const normalized = String(value || '').trim();
    return normalized.length === 56 && normalized.startsWith('G');
  }, []);

  const checkOtherNetworksForAccount = useCallback(async (accountId: string, currentNetwork: NetworkType) => {
    const otherNetworks: NetworkType[] = ['mainnet', 'testnet'].filter(
      (network): network is NetworkType => network !== currentNetwork
    );

    if (otherNetworks.length === 0) {
      return [];
    }

    const checks = await Promise.all(
      otherNetworks.map(async (network) => {
        try {
          await createHorizonServer(network).accounts().accountId(accountId).call();
          return network;
        } catch {
          return null;
        }
      })
    );

    return checks.filter((network): network is NetworkType => network !== null);
  }, []);

  const switchNetworkAndReload = useCallback((targetNetwork: NetworkType) => {
    persistNetwork(targetNetwork);
    const query = searchParams.toString();
    const targetUrl = query ? `${pathname}?${query}` : pathname;
    window.location.href = targetUrl;
  }, [pathname, searchParams]);

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
        setError(null);
        setAvailableNetworks([]);
        setCheckingOtherNetworks(false);
        if (!isLikelyStellarAccount(id)) {
          setError('Account not found or invalid account ID');
          return;
        }
        const server = createHorizonServer();

        const [accountResponse, priceData, accountMetaResponse] = await Promise.all([
          server.accounts().accountId(id).call(),
          getXLMUSDPriceFromHorizon(),
          getApiV1Data(apiEndpoints.v1.accountById(id)).catch(() => null),
        ]);

        const accountData = accountResponse as unknown as Account;

        setAccount(accountData);
        setXlmPrice(priceData);

        const accountMetaRecord = accountMetaResponse as AccountMeta | null;
        setAccountMeta(accountMetaRecord);

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
        if (isLikelyStellarAccount(id)) {
          setCheckingOtherNetworks(true);
          const networksWithAccount = await checkOtherNetworksForAccount(id, activeNetwork);
          setAvailableNetworks(networksWithAccount);
          setCheckingOtherNetworks(false);
        }
        if (!isExpectedAccountLookupError(e)) {
          console.error('Error fetching account data:', e);
        }
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
      setAccountMeta(null);
      setAvailableNetworks([]);
      setCheckingOtherNetworks(false);
      fetchAccountData();
    }
  }, [id, activeNetwork, isLikelyStellarAccount, checkOtherNetworksForAccount]);

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
    const hasNetworkMatch = availableNetworks.length > 0;
    const title = hasNetworkMatch ? 'Account Found On Another Network' : 'Account Not Found';
    const description = hasNetworkMatch
      ? 'This address is valid, but not on the currently selected network.'
      : 'We could not find this account on Mainnet or Testnet.';

    return (
      <div className="min-h-[70vh] bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className={`w-24 h-24 mx-auto rounded-2xl flex items-center justify-center mb-4 ${hasNetworkMatch ? 'bg-cyan-500/12' : 'bg-emerald-500/12'}`}>
            <svg className={`w-12 h-12 ${hasNetworkMatch ? 'text-cyan-500' : 'text-emerald-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A9 9 0 1118.88 17.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{title}</h1>
          <p className="text-[var(--text-tertiary)] mb-4">{description}</p>
          <p className="text-[var(--text-muted)] text-sm mb-2">
            Current network: <span className="font-semibold text-[var(--text-secondary)]">{NETWORK_CONFIGS[activeNetwork].displayName}</span>
          </p>
          <p className="text-[var(--text-muted)] font-mono text-sm mb-4 break-all">{id}</p>
          {checkingOtherNetworks && (
            <p className="text-[var(--text-muted)] text-sm mb-4">Checking other networks...</p>
          )}
          {!checkingOtherNetworks && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              {availableNetworks.map((network) => (
                <button
                  key={network}
                  onClick={() => switchNetworkAndReload(network)}
                  className="px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  Switch to {NETWORK_CONFIGS[network].displayName}
                </button>
              ))}
              <Link
                href="/accounts"
                className="px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                Go to Accounts
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isMobile === null) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-sm text-[var(--text-muted)]">Loading account view...</div>
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
          accountMeta={accountMeta}
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
          accountMeta={accountMeta}
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
