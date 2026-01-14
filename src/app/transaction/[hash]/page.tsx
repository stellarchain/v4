import { getTransaction, getTransactionOperations, getTransactionEffects } from '@/lib/stellar';
import TransactionMobileView from '@/components/mobile/TransactionMobileView';
import TransactionDesktopView from '@/components/desktop/TransactionDesktopView';

export const revalidate = 60;

interface TransactionPageProps {
  params: Promise<{ hash: string }>;
}

export default async function TransactionPage({ params }: TransactionPageProps) {
  const { hash } = await params;

  const [transaction, operationsResponse, effectsResponse] = await Promise.all([
    getTransaction(hash),
    getTransactionOperations(hash, 20),
    getTransactionEffects(hash, 20),
  ]);

  const operations = operationsResponse._embedded.records;
  const effects = effectsResponse._embedded.records;
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
        />
      </div>
      <div className="hidden md:block">
        <TransactionDesktopView
          transaction={transactionData}
          operations={operations}
          effects={effects}
        />
      </div>
    </>
  );
}
