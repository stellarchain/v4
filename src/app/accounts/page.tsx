import { fetchAllAccounts } from '@/lib/stellar';
import AccountDirectory from '@/components/AccountDirectory';

export const revalidate = 60; // Refresh more often

interface AccountsPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
    // Note: Search not supported by raw /accounts endpoint efficiently without indexer
    // We just list latest accounts for now.
    const accounts = await fetchAllAccounts(50);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Rich List</h1>
                            <span className="px-2.5 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[10px] font-semibold text-[var(--primary)] uppercase tracking-wider">
                                Top 50
                            </span>
                        </div>
                        <p className="text-[var(--text-muted)] text-sm mt-0.5">Top Stellar accounts ranked by XLM holdings</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Live data
                </div>
            </div>

            <AccountDirectory
                initialAccounts={accounts}
            />
        </div>
    );
}
