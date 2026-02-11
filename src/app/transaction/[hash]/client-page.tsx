'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import { Horizon } from '@stellar/stellar-sdk';
import { getBaseUrl, getAccountLabels, normalizeTransactions } from '@/lib/stellar';
import type { AccountLabel, Transaction, Operation, Effect } from '@/lib/stellar';
import TransactionMobileView from '@/components/mobile/TransactionMobileView';
import TransactionDesktopView from '@/components/desktop/TransactionDesktopView';
import { notFound } from 'next/navigation';
import { getDetailRouteValue } from '@/lib/routeDetail';

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

export default function TransactionPage() {
  const params = useParams<{ hash?: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [accountLabels, setAccountLabels] = useState<Record<string, AccountLabel>>({});
  const [error, setError] = useState<string | null>(null);
  const isLoading = !error && !transaction;

  const hash = getDetailRouteValue({
    pathname,
    searchParams,
    queryKey: 'hash',
    routeParam: params.hash,
    aliases: ['/transaction', '/transactions', '/tx'],
  });

  const loadTransactionData = async (txHash: string) => {
    const server = new Horizon.Server(getBaseUrl());
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

  useEffect(() => {
    if (!hash) {
      setError('Missing transaction hash.');
      return;
    }

    loadTransactionData(hash)
      .then(async ({ transaction: txResult, operations: ops, effects: effs }) => {
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
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load transaction.');
      });
  }, [hash]);

  if (!isLoading && (error || !transaction)) {
    notFound();
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
