'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { RichListAccount } from '@/lib/stellar';
import TopAccountsMobileList from '@/components/mobile/TopAccountsMobileList';
import TopAccountsDesktopView from '@/components/desktop/TopAccountsDesktopView';
import AccountDetailsClientPage from '@/app/account/[id]/client-page';
import Loading from '@/components/ui/Loading';
import { getDetailRouteValue } from '@/lib/shared/routeDetail';
import { apiEndpoints, getApiData, getApiV1Data } from '@/services/api';

export default function AccountsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const urlQuery = (searchParams.get('q') || '').trim();
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
    const [xlmPriceUsd, setXlmPriceUsd] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState(urlQuery);
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(urlQuery);

    useEffect(() => {
        if (urlQuery !== searchQuery) {
            setSearchQuery(urlQuery);
            setDebouncedSearchQuery(urlQuery);
        }
    }, [urlQuery]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        const currentQ = (searchParams.get('q') || '').trim();
        if (currentQ === debouncedSearchQuery) return;

        const params = new URLSearchParams(searchParams.toString());
        if (debouncedSearchQuery) {
            params.set('q', debouncedSearchQuery);
        } else {
            params.delete('q');
        }
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, [debouncedSearchQuery, router, pathname, searchParams]);

    useEffect(() => {
        if (hasDetailsRoute) return;

        const getTransactions = (record: any) =>
            parseInt(String(record.accountMetric?.totalTransactions ?? record.accountMetric?.transactionsPerHour ?? '0'), 10) || 0;

        const fetchRichList = async () => {
            try {
                setLoading(true);
                const query = debouncedSearchQuery;
                const isAddressQuery = /^(G|C)[A-Z0-9]{10,}$/.test(query.toUpperCase());
                const params: Record<string, string | number> = {
                    page: 1,
                    itemsPerPage: 30,
                    'order[accountMetric.nativeBalance]': 'desc',
                };
                if (query) {
                    if (isAddressQuery) {
                        params.address = query;
                    } else {
                        params.label = query;
                    }
                }

                const result = await getApiV1Data(apiEndpoints.v1.accounts(params));

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
                            transactions: getTransactions(record),
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
    }, [hasDetailsRoute, debouncedSearchQuery]);

    useEffect(() => {
        let active = true;
        getApiData('/api/coins/stellar')
            .then((data: any) => {
                const price = Number(data?.coingecko_stellar?.market_data?.current_price?.usd || 0);
                if (active) setXlmPriceUsd(price > 0 ? price : null);
            })
            .catch(() => {
                if (active) setXlmPriceUsd(null);
            });
        return () => {
            active = false;
        };
    }, []);

    if (hasDetailsRoute) {
        return <AccountDetailsClientPage />;
    }

    if (loading && richListAccounts.length === 0) {
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
                <TopAccountsMobileList
                    initialAccounts={richListAccounts}
                    totalAccounts={totalAccounts}
                    xlmPriceUsd={xlmPriceUsd}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    loading={loading}
                />
            </div>

            {/* Desktop View */}
            <div className="hidden md:block">
                <TopAccountsDesktopView
                    initialAccounts={richListAccounts}
                    totalAccounts={totalAccounts}
                    xlmPriceUsd={xlmPriceUsd}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    loading={loading}
                />
            </div>
        </>
    );
}
