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
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Transactions</h1>
            <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-pulse-soft" />
          </div>
          <p className="text-[var(--text-tertiary)] text-[13px]">Live feed of all transactions on the Stellar network</p>
        </div>
      </div>

      <TransactionPageClient
        initialTransactions={transactions}
        initialPaymentTransactions={paymentTransactions}
        limit={100}
      />
    </div>
  );
}
