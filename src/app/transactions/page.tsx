import { getTransactions, getPaymentTransactions } from '@/lib/stellar';
import TransactionPageClient from '@/components/TransactionPageClient';

export const revalidate = 10;

export default async function TransactionsPage() {
  // Fetch both regular transactions and payment transactions in parallel
  const [transactionsResponse, paymentTransactions] = await Promise.all([
    getTransactions(100),
    getPaymentTransactions(50), // Fetch 50 recent payments directly
  ]);

  const transactions = transactionsResponse._embedded.records;

  return (
    <div className="space-y-6">


      <TransactionPageClient
        initialTransactions={transactions}
        initialPaymentTransactions={paymentTransactions}
        limit={100}
      />
    </div>
  );
}
