'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Horizon } from '@stellar/stellar-sdk';
import { normalizeTransactions } from '@/lib/stellar';
import type { Ledger, Transaction, Operation } from '@/lib/stellar';
import LedgerMobileView from '@/components/mobile/LedgerMobileView';
import LedgerDesktopView from '@/components/desktop/LedgerDesktopView';
import Loading from '@/components/ui/Loading';
import { getDetailRouteValue } from '@/lib/shared/routeDetail';
import { createHorizonServer } from '@/services/horizon';
import { useNetwork, NETWORK_CONFIGS, type NetworkType } from '@/contexts/NetworkContext';
import { persistNetwork } from '@/lib/network/state';

export default function LedgerPage() {
  const { network: activeNetwork } = useNetwork();
  const params = useParams<{ sequence?: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sequenceRaw = getDetailRouteValue({
    pathname,
    searchParams,
    queryKey: 'sequence',
    routeParam: params.sequence,
    aliases: ['/ledger', '/ledgers'],
  });
  const sequenceNum = Number(sequenceRaw);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [error, setError] = useState<{ sequence: number; message: string } | null>(null);
  const [checkingOtherNetworks, setCheckingOtherNetworks] = useState(false);
  const [availableNetworks, setAvailableNetworks] = useState<NetworkType[]>([]);
  const isInvalidSequence = !sequenceRaw || !Number.isFinite(sequenceNum);
  const errorMessage = isInvalidSequence
    ? 'Invalid ledger sequence.'
    : (error && error.sequence === sequenceNum ? error.message : null);
  const isLoading = !errorMessage && (!ledger || ledger.sequence !== sequenceNum);

  const loadLedgerData = async (targetSequence: number) => {
    const server = createHorizonServer();
    const [ledgerResponse, transactionsResponse, operationsResponse] = await Promise.all([
      server.ledgers().ledger(targetSequence).call(),
      server.transactions().forLedger(targetSequence).order('desc').limit(10).call(),
      server.operations().forLedger(targetSequence).order('desc').limit(10).call(),
    ]);

    return {
      ledger: ledgerResponse as unknown as Ledger,
      transactions: normalizeTransactions(transactionsResponse.records || []),
      operations: (operationsResponse.records || []) as unknown as Operation[],
    };
  };

  const switchNetworkAndReload = useCallback((targetNetwork: NetworkType) => {
    persistNetwork(targetNetwork);
    const query = searchParams.toString();
    const targetUrl = query ? `${pathname}?${query}` : pathname;
    window.location.href = targetUrl;
  }, [pathname, searchParams]);

  const checkOtherNetworksForLedger = useCallback(async (targetSequence: number, currentNetwork: NetworkType) => {
    const otherNetworks: NetworkType[] = ['mainnet', 'testnet'].filter(
      (network): network is NetworkType => network !== currentNetwork
    );

    if (!Number.isFinite(targetSequence) || otherNetworks.length === 0) {
      return [];
    }

    const checks = await Promise.all(
      otherNetworks.map(async (network) => {
        try {
          await createHorizonServer(network).ledgers().ledger(targetSequence).call();
          return network;
        } catch {
          return null;
        }
      })
    );

    return checks.filter((network): network is NetworkType => network !== null);
  }, []);

  useEffect(() => {
    if (isInvalidSequence) return;

    const fetchLedgerData = async () => {
      try {
        setError(null);
        setAvailableNetworks([]);
        setCheckingOtherNetworks(false);
        const { ledger: ledgerResult, transactions, operations } = await loadLedgerData(sequenceNum);
        setLedger(ledgerResult);
        setTransactions(transactions);
        setOperations(operations);
      } catch (err) {
        setError({
          sequence: sequenceNum,
          message: err instanceof Error ? err.message : 'Failed to load ledger.',
        });
        // Some Horizon SDK errors don't expose a clean 404 shape; always try cross-network lookup.
        setCheckingOtherNetworks(true);
        const networksWithLedger = await checkOtherNetworksForLedger(sequenceNum, activeNetwork);
        setAvailableNetworks(networksWithLedger);
        setCheckingOtherNetworks(false);
      }
    };

    fetchLedgerData();
  }, [sequenceNum, isInvalidSequence, activeNetwork, checkOtherNetworksForLedger]);

  if (isLoading) {
    return <Loading title="Loading ledger" description="Fetching ledger details and activity." />;
  }

  if (errorMessage || !ledger) {
    const hasNetworkMatch = availableNetworks.length > 0;
    const title = hasNetworkMatch ? 'Ledger Found On Another Network' : 'Ledger Not Found';
    const normalizedError = String(errorMessage || '').toLowerCase();
    const fallbackDescription = normalizedError.includes('gone')
      ? 'We could not find this ledger on Mainnet or Testnet.'
      : normalizedError.includes('not found')
        ? 'We could not find this ledger on Mainnet or Testnet.'
        : 'We could not load this ledger right now.';
    const description = hasNetworkMatch
      ? 'This ledger sequence exists, but not on the currently selected network.'
      : fallbackDescription;

    if (checkingOtherNetworks) {
      return (
        <div className="min-h-[70vh] bg-[var(--bg-primary)] flex items-center justify-center p-4">
          <div className="text-center max-w-md w-full mx-auto my-auto">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-[var(--bg-tertiary)] animate-pulse mb-4" />
            <div className="h-7 w-64 mx-auto rounded bg-[var(--bg-tertiary)] animate-pulse mb-3" />
            <div className="h-4 w-80 max-w-full mx-auto rounded bg-[var(--bg-tertiary)] animate-pulse mb-2" />
            <div className="h-4 w-56 mx-auto rounded bg-[var(--bg-tertiary)] animate-pulse mb-6" />
            <div className="flex justify-center gap-2">
              <div className="h-10 w-36 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
              <div className="h-10 w-36 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-[70vh] bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full mx-auto my-auto">
        <div className={`w-24 h-24 mx-auto rounded-2xl flex items-center justify-center mb-4 ${hasNetworkMatch ? 'bg-blue-500/12' : 'bg-orange-500/12'}`}>
          <svg className={`w-12 h-12 ${hasNetworkMatch ? 'text-blue-500' : 'text-orange-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h11M8 12h11M8 18h11M4 6h.01M4 12h.01M4 18h.01" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{title}</h1>
        <p className="text-[var(--text-tertiary)] mb-4 text-center">{description}</p>
        {!isInvalidSequence && (
          <p className="text-[var(--text-muted)] font-mono text-sm mb-2 text-center">#{sequenceNum.toLocaleString()}</p>
        )}
        <p className="text-[var(--text-muted)] text-sm mb-4 text-center">
          Current network: <span className="font-semibold text-[var(--text-secondary)]">{NETWORK_CONFIGS[activeNetwork].displayName}</span>
        </p>
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
            href="/ledgers"
            className="px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Go to Ledgers
          </Link>
        </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="md:hidden">
        <LedgerMobileView
          ledger={ledger}
          transactions={transactions}
          operations={operations}
        />
      </div>
      <div className="hidden md:block">
        <LedgerDesktopView
          ledger={ledger}
          transactions={transactions}
          operations={operations}
        />
      </div>
    </>
  );
}
