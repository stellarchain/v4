'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { RichListAccount } from '@/lib/stellar';
import TopAccountsMobileList from '@/components/mobile/TopAccountsMobileList';
import TopAccountsDesktopView from '@/components/desktop/TopAccountsDesktopView';
import AccountDetailsClientPage from '@/app/account/[id]/client-page';
import Loading from '@/components/ui/Loading';
import { getDetailRouteValue } from '@/lib/shared/routeDetail';
import { apiEndpoints, getApiData, getApiV1Data } from '@/services/api';

const ITEMS_PER_PAGE = 30;
const TOTAL_XLM_SUPPLY = 50_000_000_000;

export default function AccountsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const urlQuery = (searchParams.get('q') || '').trim();
    const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
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
    const [currentPage, setCurrentPage] = useState(urlPage);

    // Sync from URL on back/forward
    useEffect(() => {
        if (urlQuery !== searchQuery) {
            setSearchQuery(urlQuery);
            setDebouncedSearchQuery(urlQuery);
        }
        if (urlPage !== currentPage) {
            setCurrentPage(urlPage);
        }
    }, [urlQuery, urlPage]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Reset page when search changes (skip initial mount)
    const searchMountedRef = useRef(false);
    useEffect(() => {
        if (!searchMountedRef.current) {
            searchMountedRef.current = true;
            return;
        }
        setCurrentPage(1);
    }, [debouncedSearchQuery]);

    // Sync search + page to URL
    useEffect(() => {
        const currentQ = (searchParams.get('q') || '').trim();
        const currentP = parseInt(searchParams.get('page') || '1', 10) || 1;
        if (currentQ === debouncedSearchQuery && currentP === currentPage) return;

        const params = new URLSearchParams();
        if (debouncedSearchQuery) {
            params.set('q', debouncedSearchQuery);
        }
        if (currentPage > 1) {
            params.set('page', String(currentPage));
        }
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, [debouncedSearchQuery, currentPage, router, pathname, searchParams]);

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
                    page: currentPage,
                    itemsPerPage: ITEMS_PER_PAGE,
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

                const accounts = (result.member || [])
                    .filter((record: any) => {
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
                                description: undefined
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
    }, [hasDetailsRoute, debouncedSearchQuery, currentPage]);

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

    const totalPages = Math.ceil(totalAccounts / ITEMS_PER_PAGE);

    const handlePageChange = (page: number) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

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
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
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
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            </div>
        </>
    );
}
