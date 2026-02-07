'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Horizon } from '@stellar/stellar-sdk';
import { getBaseUrl } from '@/lib/stellar';
import LedgerMobileView from '@/components/mobile/LedgerMobileView';
import LedgerDesktopView from '@/components/desktop/LedgerDesktopView';
import Loading from '@/components/ui/Loading';
import ShowError from '@/components/ui/ShowError';

type Ledger = Horizon.ServerApi.LedgerRecord;
type Transaction = Horizon.ServerApi.TransactionRecord;
type Operation = Horizon.ServerApi.OperationRecord;

export default function LedgerPage() {
  const { sequence } = useParams<{ sequence: string }>();
  const sequenceNum = Number(sequence);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (Number.isNaN(sequenceNum)) {
      setError('Invalid ledger sequence.');
      setIsLoading(false);
      return;
    }
    async function loadLedgerData() {
      try {
        setIsLoading(true);
        setError(null);

        const server = new Horizon.Server(getBaseUrl());

        const [ledgerResponse, transactionsResponse, operationsResponse] = await Promise.all([
          server.ledgers().ledger(sequenceNum).call(),
          server.transactions().forLedger(sequenceNum).order('desc').limit(10).call(),
          server.operations().forLedger(sequenceNum).order('desc').limit(10).call(),
        ]);

        if (cancelled) return;
        setLedger(ledgerResponse as unknown as Ledger);
        setTransactions((transactionsResponse.records || []) as Transaction[]);
        setOperations((operationsResponse.records || []) as Operation[]);

      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load ledger.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadLedgerData().then(() => {});

    return () => {
      cancelled = true;
    };
  }, [sequenceNum]);

  if (error) {
    return <ShowError message={error} />;
  }

  if (isLoading || !ledger) {
    return <Loading title="Loading ledger" description="Fetching ledger details and activity." />;
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
