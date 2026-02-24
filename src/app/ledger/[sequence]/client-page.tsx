'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
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

function isLedgerNotFoundError(error: unknown): boolean {
  const status = Number((error as any)?.response?.status);
  const title = String((error as any)?.response?.title || '').toLowerCase();
  const message = String((error as any)?.message || '').toLowerCase();

  return status === 404 || title.includes('not found') || message.includes('not found');
}

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
        if (isLedgerNotFoundError(err)) {
          setCheckingOtherNetworks(true);
          const networksWithLedger = await checkOtherNetworksForLedger(sequenceNum, activeNetwork);
          setAvailableNetworks(networksWithLedger);
          setCheckingOtherNetworks(false);
        }
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
    const description = hasNetworkMatch
      ? 'This ledger sequence exists, but not on the currently selected network.'
      : (errorMessage || 'Ledger not found.');

    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 ${hasNetworkMatch ? 'bg-sky-500/10' : 'bg-[var(--bg-tertiary)]'}`}>
          <svg className={`w-10 h-10 ${hasNetworkMatch ? 'text-sky-500' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
        {checkingOtherNetworks && (
          <p className="text-[var(--text-muted)] text-sm mb-4">Checking other networks...</p>
        )}
        {!checkingOtherNetworks && availableNetworks.length > 0 && (
          <div className="mb-4 text-center">
            <p className="text-sm text-[var(--text-secondary)] mb-2">This ledger exists on:</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {availableNetworks.map((network) => (
                <button
                  key={network}
                  onClick={() => switchNetworkAndReload(network)}
                  className="px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  Switch to {NETWORK_CONFIGS[network].displayName}
                </button>
              ))}
            </div>
          </div>
        )}
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
