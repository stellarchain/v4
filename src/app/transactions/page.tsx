import { getTransactions, getPaymentTransactions } from '@/lib/stellar';
import TransactionPageClient from '@/components/TransactionPageClient';
import TransactionsDesktopView from '@/components/desktop/TransactionsDesktopView';

export const revalidate = 10;

export default async function TransactionsPage() {
  let transactions: Awaited<ReturnType<typeof getTransactions>>['_embedded']['records'] = [];
  let paymentTransactions: Awaited<ReturnType<typeof getPaymentTransactions>> = [];

  try {
    // Fetch both regular transactions and payment transactions in parallel
    const [transactionsResponse, payments] = await Promise.all([
      getTransactions(100),
      getPaymentTransactions(50), // Fetch 50 recent payments directly
    ]);

    transactions = transactionsResponse._embedded.records;
    paymentTransactions = payments;
  } catch (e) {
    // Avoid failing builds/prerender when upstream APIs rate-limit or error.
    console.error('Failed to fetch initial transactions:', e);
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
