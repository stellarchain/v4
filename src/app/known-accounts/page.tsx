import { fetchLabeledAccounts } from '@/lib/stellar';
import KnownAccountsClient from './KnownAccountsClient';

export const revalidate = 60;

export default async function KnownAccountsPage() {
  const initialData = await fetchLabeledAccounts(1, 25);

  return <KnownAccountsClient initialData={initialData} />;
}
