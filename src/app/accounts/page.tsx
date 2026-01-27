import { fetchAllAccounts } from '@/lib/stellar';
import AccountDirectory from '@/components/AccountDirectory';
import { getRichListAction } from '@/app/actions/stellar';
import TopAccountsMobileList from '@/components/mobile/TopAccountsMobileList';

export const revalidate = 60;

interface AccountsPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
    const knownAccounts = await fetchAllAccounts(50);
    const richListAccounts = await getRichListAction(1, 50);

    return (
        <div className="space-y-4 md:space-y-8">
            {/* Mobile View */}
            <div className="block md:hidden">
                <TopAccountsMobileList initialAccounts={richListAccounts} />
            </div>

            {/* Desktop View */}
            <div className="hidden md:block">
                <AccountDirectory initialAccounts={knownAccounts} />
            </div>
        </div>
    );
}
