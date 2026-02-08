'use client';

import { useEffect, useState } from 'react';
import type { RichListAccount } from '@/lib/stellar';
import TopAccountsMobileList from '@/components/mobile/TopAccountsMobileList';
import TopAccountsDesktopView from '@/components/desktop/TopAccountsDesktopView';
import Loading from '@/components/ui/Loading';

export default function AccountsPage() {
    const [richListAccounts, setRichListAccounts] = useState<RichListAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRichList = async () => {
            try {
                setLoading(true);
                const response = await fetch('https://api.stellarchain.io/v1/accounts/top?page=1&paginate=50', {
                    headers: { 'Accept': 'application/json' }
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch rich list');
                }
                const result = await response.json();
                const accounts = (result.data || []).map((record: any, index: number) => ({
                    rank: record.rank || (index + 1),
                    account: record.account,
                    balance: parseFloat(record.balance || '0'),
                    percent_of_coins: record.percent_of_coins,
                    transactions: parseInt(record.transactions || '0'),
                    label: record.label ? {
                        name: record.label.name,
                        verified: record.label.verified === 1,
                        description: record.label.description
                    } : undefined
                }));
                setRichListAccounts(accounts);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load accounts');
                console.error('Error fetching rich list:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchRichList();
    }, []);

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
                <TopAccountsMobileList initialAccounts={richListAccounts} />
            </div>

            {/* Desktop View */}
            <div className="hidden md:block">
                <TopAccountsDesktopView initialAccounts={richListAccounts} />
            </div>
        </>
    );
}
