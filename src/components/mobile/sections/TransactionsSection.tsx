import { getTransactions } from '@/lib/stellar';
import TransactionsFeed from './TransactionsFeed';

export default async function TransactionsSection() {
  const transactionsResponse = await getTransactions(8);
  const transactions = transactionsResponse._embedded.records;

  return <TransactionsFeed initialTransactions={transactions} />;
}
