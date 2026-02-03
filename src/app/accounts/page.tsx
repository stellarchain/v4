import { getRichListAction } from '@/app/actions/stellar';
import TopAccountsMobileList from '@/components/mobile/TopAccountsMobileList';
import TopAccountsDesktopView from '@/components/desktop/TopAccountsDesktopView';

export const revalidate = 60;

interface AccountsPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
    const richListAccounts = await getRichListAction(1, 50);

    return (
        <>
            {/* Mobile View */}
            <div className="block md:hidden">
                <TopAccountsMobileList initialAccounts={richListAccounts} />
            </div>

            {/* Desktop View */}
            <div className="hidden md:block">
                <TopAccountsDesktopView initialAccounts={richListAccounts} />
            </div>
        </>
    );
}
