import { getLedgers } from '@/lib/stellar';
import LedgersPageClient from '@/components/LedgersPageClient';

export const revalidate = 10;

export default async function LedgersPage() {
  const ledgersResponse = await getLedgers(50);
  const ledgers = ledgersResponse._embedded.records;

  return <LedgersPageClient initialLedgers={ledgers} limit={50} />;
}
