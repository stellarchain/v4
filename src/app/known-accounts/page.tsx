import { fetchLabeledAccounts } from '@/lib/stellar';
import KnownAccountsClient from './KnownAccountsClient';
import KnownAccountsDesktopView from '@/components/desktop/KnownAccountsDesktopView';

export const revalidate = 60;

export default async function KnownAccountsPage() {
  const initialData = await fetchLabeledAccounts(1, 25);

  return (
    <>
      {/* Mobile View */}
      <div className="block md:hidden">
        <KnownAccountsClient initialData={initialData} />
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <KnownAccountsDesktopView initialData={initialData} />
      </div>
    </>
  );
}
