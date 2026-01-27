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
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Rich List</h1>
                        <span className="px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[10px] font-medium text-[#777]">
                            Top 50
                        </span>
                    </div>
                    <p className="text-[var(--text-muted)] text-xs">Top Stellar accounts ranked by XLM holdings</p>
                </div>
            </div>

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
