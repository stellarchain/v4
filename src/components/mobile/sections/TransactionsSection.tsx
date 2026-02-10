'use client';

import type { Transaction } from '@/lib/stellar';
import TransactionsFeed from './TransactionsFeed';

interface TransactionsSectionProps {
  transactions: Transaction[];
}

export default function TransactionsSection({ transactions }: TransactionsSectionProps) {
  return <TransactionsFeed initialTransactions={transactions} />;
}
