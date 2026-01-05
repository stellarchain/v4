import { fetchKnownAccounts } from '@/lib/stellar';
import AccountDirectory from '@/components/AccountDirectory';

export const revalidate = 3600;

interface AccountsPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
    const resolvedSearchParams = await searchParams;
    const search = typeof resolvedSearchParams.search === 'string' ? resolvedSearchParams.search : undefined;
    const tag = typeof resolvedSearchParams.tag === 'string' ? resolvedSearchParams.tag : undefined;

    const accounts = await fetchKnownAccounts(50, search, tag);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#BFF549]/20 to-[#BFF549]/5 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#BFF549]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-semibold text-white tracking-tight">Known Accounts</h1>
                        <span className="px-2 py-0.5 rounded-full bg-[#1a1a1a] border border-[#333] text-[10px] font-medium text-[#777]">
                            Directory
                        </span>
                    </div>
                    <p className="text-[#555] text-xs">Explore recognized entities, exchanges, and applications on Stellar</p>
                </div>
            </div>

            <AccountDirectory
                initialAccounts={accounts}
                initialSearch={search}
                initialTag={tag}
            />
        </div>
    );
}
