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
  const [error, setError] = useState<{ sequence: number; message: string } | null>(null);
  const isInvalidSequence = !Number.isFinite(sequenceNum);
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
      transactions: (transactionsResponse.records || []) as Transaction[],
      operations: (operationsResponse.records || []) as Operation[],
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

  if (errorMessage) {
    return <ShowError message={errorMessage} />;
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
