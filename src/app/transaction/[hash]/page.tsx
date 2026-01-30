import { getTransaction, getTransactionOperations, getTransactionEffects, getAccountLabels } from '@/lib/stellar';
import type { AccountLabel } from '@/lib/stellar';
import TransactionMobileView from '@/components/mobile/TransactionMobileView';
import TransactionDesktopView from '@/components/desktop/TransactionDesktopView';
import { notFound } from 'next/navigation';

export const revalidate = 60;

interface TransactionPageProps {
  params: Promise<{ hash: string }>;
}

// Extract all unique account addresses from transaction data
function extractAccountAddresses(
  sourceAccount: string,
  operations: Array<Record<string, unknown>>,
  effects: Array<Record<string, unknown>>
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

export default async function TransactionPage({ params }: TransactionPageProps) {
  const { hash } = await params;

  let transaction, operationsResponse, effectsResponse;

  try {
    [transaction, operationsResponse, effectsResponse] = await Promise.all([
      getTransaction(hash),
      getTransactionOperations(hash, 200),
      getTransactionEffects(hash, 200),
    ]);
  } catch (error) {
    // Transaction not found on current network
    notFound();
  }

  const operations = operationsResponse._embedded.records;
  const effects = effectsResponse._embedded.records;

  // Extract account addresses and fetch labels
  const accountAddresses = extractAccountAddresses(
    transaction.source_account,
    operations,
    effects
  );
  const labelsMap = await getAccountLabels(accountAddresses);

  // Convert Map to plain object for serialization to client components
  const accountLabels: Record<string, AccountLabel> = {};
  labelsMap.forEach((label, address) => {
    accountLabels[address] = label;
  });

  const transactionData = {
    hash,
    source_account: transaction.source_account,
    source_account_sequence: transaction.source_account_sequence,
    successful: transaction.successful,
    created_at: transaction.created_at,
    ledger: transaction.ledger,
    operation_count: transaction.operation_count,
    fee_charged: transaction.fee_charged,
    max_fee: transaction.max_fee,
    memo: transaction.memo,
    memo_type: transaction.memo_type,
    signatures: transaction.signatures,
    envelope_xdr: transaction.envelope_xdr,
    result_xdr: transaction.result_xdr,
    result_meta_xdr: transaction.result_meta_xdr,
    fee_meta_xdr: transaction.fee_meta_xdr,
  };

  return (
    <>
      <div className="md:hidden">
        <TransactionMobileView
          transaction={transactionData}
          operations={operations}
          effects={effects}
          accountLabels={accountLabels}
        />
      </div>
      <div className="hidden md:block">
        <TransactionDesktopView
          transaction={transactionData}
          operations={operations}
          effects={effects}
          accountLabels={accountLabels}
        />
      </div>
    </>
  );
}
