'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import { Horizon } from '@stellar/stellar-sdk';
import { getBaseUrl, normalizeTransactions } from '@/lib/stellar';
import type { Ledger, Transaction, Operation } from '@/lib/stellar';
import LedgerMobileView from '@/components/mobile/LedgerMobileView';
import LedgerDesktopView from '@/components/desktop/LedgerDesktopView';
import Loading from '@/components/ui/Loading';
import { notFound } from 'next/navigation';
import { getDetailRouteValue } from '@/lib/routeDetail';


export default function LedgerPage() {
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
  const isInvalidSequence = !sequenceRaw || !Number.isFinite(sequenceNum);
  const errorMessage = isInvalidSequence
    ? 'Invalid ledger sequence.'
    : (error && error.sequence === sequenceNum ? error.message : null);
  const isLoading = !errorMessage && (!ledger || ledger.sequence !== sequenceNum);

  const loadLedgerData = async (targetSequence: number) => {
    const server = new Horizon.Server(getBaseUrl());
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

  useEffect(() => {
    if (isInvalidSequence) return;
    loadLedgerData(sequenceNum)
      .then(({ ledger: ledgerResult, transactions, operations }) => {
        setLedger(ledgerResult);
        setTransactions(transactions);
        setOperations(operations);
      })
      .catch((err) => {
        setError({
          sequence: sequenceNum,
          message: err instanceof Error ? err.message : 'Failed to load ledger.',
        });
      });
  }, [sequenceNum, isInvalidSequence]);

  if (isLoading) {
    return <Loading title="Loading ledger" description="Fetching ledger details and activity." />;
  }

  if (errorMessage || !ledger) {
    notFound();
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
