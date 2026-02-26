'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Horizon } from '@stellar/stellar-sdk';
import { getAccountLabels, normalizeTransactions } from '@/lib/stellar';
import type { AccountLabel, Transaction, Operation, Effect } from '@/lib/stellar';
import TransactionMobileView from '@/components/mobile/TransactionMobileView';
import TransactionDesktopView from '@/components/desktop/TransactionDesktopView';
import { getDetailRouteValue } from '@/lib/shared/routeDetail';
import { createHorizonServer } from '@/services/horizon';
import { useNetwork, NETWORK_CONFIGS, type NetworkType } from '@/contexts/NetworkContext';
import { redirectToNetwork } from '@/lib/network/navigation';

// Extract all unique account addresses from transaction data
function extractAccountAddresses(
  sourceAccount: string,
  operations: any[],
  effects: any[]
): string[] {
  const addresses = new Set<string>();

  // Source account
  addresses.add(sourceAccount);

  // From operations
  for (const op of operations) {
    if (op.source_account && typeof op.source_account === 'string') {
      addresses.add(op.source_account);
    }
    if (op.from && typeof op.from === 'string') {
      addresses.add(op.from);
    }
    if (op.to && typeof op.to === 'string') {
      addresses.add(op.to);
    }
    if (op.account && typeof op.account === 'string') {
      addresses.add(op.account);
    }
    if (op.funder && typeof op.funder === 'string') {
      addresses.add(op.funder);
    }
    if (op.trustor && typeof op.trustor === 'string') {
      addresses.add(op.trustor);
    }
  }

  // From effects
  for (const effect of effects) {
    if (effect.account && typeof effect.account === 'string') {
      addresses.add(effect.account);
    }
  }

  // Filter out contract addresses (start with C) - they don't have labels
  return Array.from(addresses).filter(addr => addr.startsWith('G'));
}

function isTransactionNotFoundError(error: unknown): boolean {
  const status = Number((error as any)?.response?.status);
  const title = String((error as any)?.response?.title || '').toLowerCase();
  const message = String((error as any)?.message || '').toLowerCase();

  return status === 404 || title.includes('not found') || message.includes('not found');
}

export default function TransactionPage() {
  const { network: activeNetwork } = useNetwork();
  const params = useParams<{ hash?: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [accountLabels, setAccountLabels] = useState<Record<string, AccountLabel>>({});
  const [error, setError] = useState<string | null>(null);
  const [checkingOtherNetworks, setCheckingOtherNetworks] = useState(false);
  const [availableNetworks, setAvailableNetworks] = useState<NetworkType[]>([]);
  const isLoading = !error && !transaction;

  const hash = getDetailRouteValue({
    pathname,
    searchParams,
    queryKey: 'hash',
    routeParam: params.hash,
    aliases: ['/transaction', '/transactions', '/tx'],
  });

  const loadTransactionData = async (txHash: string) => {
    const server = createHorizonServer();
    const [txResponse, operationsResponse, effectsResponse] = await Promise.all([
      server.transactions().transaction(txHash).call(),
      server.operations().forTransaction(txHash).limit(200).call(),
      server.effects().forTransaction(txHash).limit(200).call(),
    ]);

    return {
      transaction: normalizeTransactions([txResponse])[0],
      operations: (operationsResponse.records || []) as unknown as Operation[],
      effects: (effectsResponse.records || []) as unknown as Effect[],
    };
  };

  const switchNetworkAndReload = useCallback((targetNetwork: NetworkType) => {
    redirectToNetwork(targetNetwork, pathname, searchParams.toString(), window.location.hash);
  }, [pathname, searchParams]);

  const checkOtherNetworksForTransaction = useCallback(async (txHash: string, currentNetwork: NetworkType) => {
    const otherNetworks = (Object.keys(NETWORK_CONFIGS) as NetworkType[]).filter(
      (network) => network !== currentNetwork
    );

    if (!txHash || otherNetworks.length === 0) return [];

    const checks = await Promise.all(
      otherNetworks.map(async (network) => {
        try {
          await createHorizonServer(network).transactions().transaction(txHash).call();
          return network;
        } catch {
          return null;
        }
      })
    );

    return checks.filter((network): network is NetworkType => network !== null);
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!hash) {
        setError('Missing transaction hash.');
        return;
      }

      try {
        setError(null);
        setAvailableNetworks([]);
        setCheckingOtherNetworks(false);
        const { transaction: txResult, operations: ops, effects: effs } = await loadTransactionData(hash);
        setTransaction(txResult);
        setOperations(ops);
        setEffects(effs);

        // Extract account addresses and fetch labels
        const accountAddresses = extractAccountAddresses(
          txResult.source_account,
          ops,
          effs
        );
        const labelsMap = await getAccountLabels(accountAddresses);

        // Convert Map to plain object for serialization to client components
        const labels: Record<string, AccountLabel> = {};
        labelsMap.forEach((label, address) => {
          labels[address] = label;
        });
        setAccountLabels(labels);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load transaction.');
        if (hash && isTransactionNotFoundError(err)) {
          setCheckingOtherNetworks(true);
          const networksWithTx = await checkOtherNetworksForTransaction(hash, activeNetwork);
          setAvailableNetworks(networksWithTx);
          setCheckingOtherNetworks(false);
        }
      }
    };

    void run();
  }, [hash, activeNetwork, checkOtherNetworksForTransaction]);

  if (!isLoading && (error || !transaction)) {
    const hasNetworkMatch = availableNetworks.length > 0;
    const title = hasNetworkMatch ? 'Transaction Found On Another Network' : 'Transaction Not Found';
    const description = hasNetworkMatch
      ? 'This transaction hash exists, but not on the currently selected network.'
      : (error || 'Transaction not found.');

    return (
      <div className="min-h-[70vh] bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full mx-auto my-auto">
          <div className={`w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center ${hasNetworkMatch ? 'bg-blue-500/12' : 'bg-indigo-500/12'}`}>
            <svg className={`w-12 h-12 ${hasNetworkMatch ? 'text-blue-500' : 'text-indigo-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h10m0 0-3-3m3 3-3 3M17 17H7m0 0 3-3m-3 3 3 3" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{title}</h1>
          <p className="text-[var(--text-secondary)] mb-3">{description}</p>
          {hash && (
            <p className="text-[var(--text-muted)] font-mono text-xs mb-3 break-all">{hash}</p>
          )}
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Current network: <span className="font-semibold text-[var(--text-secondary)]">{NETWORK_CONFIGS[activeNetwork].displayName}</span>
          </p>

          {checkingOtherNetworks && (
            <p className="text-sm text-[var(--text-muted)] mb-4">Checking other networks...</p>
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
                href="/transactions"
                className="px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                Go to Transactions
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  const transactionData: Transaction = transaction || {
    id: '',
    paging_token: '',
    hash: hash || ''.padEnd(64, '0'),
    source_account: ''.padEnd(56, 'G'),
    source_account_sequence: '',
    fee_account: ''.padEnd(56, 'G'),
    successful: false,
    created_at: new Date(0).toISOString(),
    ledger: 0,
    ledger_attr: 0,
    operation_count: 0,
    fee_charged: '0',
    max_fee: '0',
    memo: '',
    memo_type: 'none',
    signatures: [],
    envelope_xdr: '',
    result_xdr: '',
    result_meta_xdr: '',
    fee_meta_xdr: '',
  };

  return (
    <>
      <div className="md:hidden">
        <TransactionMobileView
          transaction={transactionData}
          operations={operations}
          effects={effects}
          accountLabels={accountLabels}
          loading={isLoading}
        />
      </div>
      <div className="hidden md:block">
        <TransactionDesktopView
          transaction={transactionData}
          operations={operations}
          effects={effects}
          accountLabels={accountLabels}
          loading={isLoading}
        />
      </div>
    </>
  );
}
