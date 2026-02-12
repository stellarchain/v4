'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import type { RichListAccount } from '@/lib/stellar';
import TopAccountsMobileList from '@/components/mobile/TopAccountsMobileList';
import TopAccountsDesktopView from '@/components/desktop/TopAccountsDesktopView';
import AccountDetailsClientPage from '@/app/account/[id]/client-page';
import Loading from '@/components/ui/Loading';
import { getDetailRouteValue } from '@/lib/routeDetail';

export default function AccountsPage() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const detailsAccountId = getDetailRouteValue({
        pathname,
        searchParams,
        queryKey: 'id',
        aliases: ['/accounts'],
    });
    const hasDetailsRoute = Boolean(detailsAccountId);

    const [richListAccounts, setRichListAccounts] = useState<RichListAccount[]>([]);
    const [totalAccounts, setTotalAccounts] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (hasDetailsRoute) return;

        const fetchRichList = async () => {
            try {
                setLoading(true);
                const response = await fetch('https://api.stellarchain.dev/v1/accounts?page=1&order[accountMetric.rankPosition]=asc', {
                    headers: { 'Accept': 'application/ld+json' }
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch accounts');
                }
                const result = await response.json();

                // Calculate total supply from all accounts (sum of balances on this page as approximation)
                const TOTAL_XLM_SUPPLY = 50_000_000_000; // 50 billion XLM

                const accounts = (result.member || [])
                    .filter((record: any) => {
                        // Filter out burn account
                        const isBurnAccount = record.label?.toLowerCase().includes('burn');
                        return !isBurnAccount;
                    })
                    .map((record: any) => {
                        const balance = parseFloat(record.accountMetric?.nativeBalance || '0');
                        const percentOfCoins = balance > 0 ? ((balance / TOTAL_XLM_SUPPLY) * 100).toFixed(4) : '0.0000';

                        return {
                            rank: record.accountMetric?.rankPosition || 0,
                            account: record.address,
                            balance,
                            percent_of_coins: percentOfCoins,
                            transactions: parseInt(record.accountMetric?.totalTransactions || '0'),
                            label: record.label ? {
                                name: record.label,
                                verified: record.verified === true,
                                description: undefined // Not available in new API
                            } : undefined
                        };
                    });

                setRichListAccounts(accounts);
                setTotalAccounts(result.totalItems || accounts.length);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load accounts');
                console.error('Error fetching accounts:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchRichList();
    }, [hasDetailsRoute]);

    if (hasDetailsRoute) {
        return <AccountDetailsClientPage />;
    }

    if (loading) {
        return <Loading title="Loading accounts" description="Fetching top XLM holders." />;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="text-red-400 mb-4">{error}</div>
            </div>
        );
    }

    return (
        <>
            {/* Mobile View */}
            <div className="block md:hidden">
                <TopAccountsMobileList initialAccounts={richListAccounts} totalAccounts={totalAccounts} />
            </div>

            {/* Desktop View */}
            <div className="hidden md:block">
                <TopAccountsDesktopView initialAccounts={richListAccounts} totalAccounts={totalAccounts} />
            </div>
        </>
    );
}
