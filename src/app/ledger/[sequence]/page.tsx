import { getLedger, getLedgerTransactionsWithDisplayInfo, getLedgerOperations } from '@/lib/stellar';
import LedgerMobileView from '@/components/mobile/LedgerMobileView';

export const revalidate = 60;

interface LedgerPageProps {
  params: Promise<{ sequence: string }>;
}

export default async function LedgerPage({ params }: LedgerPageProps) {
  const { sequence } = await params;
  const sequenceNum = parseInt(sequence);

  const [ledger, transactions, operationsResponse] = await Promise.all([
    getLedger(sequenceNum),
    getLedgerTransactionsWithDisplayInfo(sequenceNum, 10),
    getLedgerOperations(sequenceNum, 10),
  ]);

  const operations = operationsResponse._embedded.records;

  return (
    <LedgerMobileView
      ledger={ledger}
      transactions={transactions}
      operations={operations}
    />
  );
}
