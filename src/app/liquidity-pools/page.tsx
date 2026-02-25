'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { getLiquidityPools } from '@/lib/stellar';
import type { LiquidityPool, PaginatedResponse } from '@/lib/stellar';
import MobileLiquidityPools from '@/components/mobile/MobileLiquidityPools';
import LiquidityPoolsDesktopView from '@/components/desktop/LiquidityPoolsDesktopView';
import LiquidityPoolDetailsClientPage from '@/app/liquidity-pool/[id]/client-page';
import { getDetailRouteValue } from '@/lib/shared/routeDetail';

export default function LiquidityPoolsPage() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const detailsPoolId = getDetailRouteValue({
        pathname,
        searchParams,
        queryKey: 'id',
        aliases: ['/liquidity-pools'],
    });
    const hasDetailsRoute = Boolean(detailsPoolId);

    const [pools, setPools] = useState<PaginatedResponse<LiquidityPool> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (hasDetailsRoute) return;

        const loadPools = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await getLiquidityPools(20, 'desc');
                setPools(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load liquidity pools.');
            } finally {
                setIsLoading(false);
            }
        };

        loadPools();
    }, [hasDetailsRoute]);

    if (hasDetailsRoute) {
        return <LiquidityPoolDetailsClientPage />;
    }

    if (!isLoading && (error || !pools)) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4">
                <h1 className="text-2xl font-bold mb-2">Error</h1>
                <p className="text-muted">{error || 'Failed to load liquidity pools.'}</p>
            </div>
        );
    }

    const emptyPools: PaginatedResponse<LiquidityPool> = {
        records: [],
        _links: {
            self: { href: '' },
            next: { href: '' },
            prev: { href: '' },
        },
    };
    const poolsData = pools || emptyPools;

    return (
        <>
            <div className="md:hidden">
                <MobileLiquidityPools initialPools={poolsData} loading={isLoading} />
            </div>
            <div className="hidden md:block">
                <LiquidityPoolsDesktopView initialPools={poolsData} loading={isLoading} />
            </div>
        </>
    );
}
