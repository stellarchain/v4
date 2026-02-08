'use client';

import { useEffect, useState } from 'react';
import { Horizon } from '@stellar/stellar-sdk';
import { getBaseUrl, normalizeTransactions } from '@/lib/stellar';
import type { Transaction, Operation } from '@/lib/stellar';
import TransactionPageClient from '@/components/TransactionPageClient';
import TransactionsDesktopView from '@/components/desktop/TransactionsDesktopView';
import Loading from '@/components/ui/Loading';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentTransactions, setPaymentTransactions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const server = new Horizon.Server(getBaseUrl());

        // Fetch both regular transactions and payment operations in parallel
        const [transactionsResponse, paymentsResponse] = await Promise.all([
          server.transactions().order('desc').limit(100).call(),
          server.payments().order('desc').limit(50).call(),
        ]);

        const transactionsData = normalizeTransactions(transactionsResponse.records || []);
        const payments = (paymentsResponse.records || []) as unknown as Operation[];

        // Process payment transactions - extract unique transaction hashes
        const paymentTxHashes = new Set(payments.map((p: any) => p.transaction_hash));
        const paymentTxs: any[] = [];

        // Fetch transaction details for each payment
        for (const hash of paymentTxHashes) {
          try {
            const tx = await server.transactions().transaction(hash).call();
            paymentTxs.push(tx);
          } catch {
            // Skip if transaction fetch fails
          }
        }

        setTransactions(transactionsData);
        setPaymentTransactions(normalizeTransactions(paymentTxs));
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load transactions');
        setIsLoading(false);
      }
    };

    loadTransactions();
  }, []);

  if (isLoading) {
    return <Loading title="Loading transactions" description="Fetching recent transactions." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile View */}
      <div className="block md:hidden">
        <TransactionPageClient
          initialTransactions={transactions}
          initialPaymentTransactions={paymentTransactions}
          limit={100}
        />
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <TransactionsDesktopView
          initialTransactions={transactions}
          initialPaymentTransactions={paymentTransactions}
          limit={100}
        />
      </div>
    </>
  );
}
