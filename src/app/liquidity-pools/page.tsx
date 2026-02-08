'use client';

import { useEffect, useState } from 'react';
import { getBaseUrl } from '@/lib/stellar';
import type { LiquidityPool, PaginatedResponse } from '@/lib/stellar';
import MobileLiquidityPools from '@/components/mobile/MobileLiquidityPools';
import LiquidityPoolsDesktopView from '@/components/desktop/LiquidityPoolsDesktopView';
import Loading from '@/components/ui/Loading';

export default function LiquidityPoolsPage() {
    const [pools, setPools] = useState<PaginatedResponse<LiquidityPool> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const isLoading = !pools && !error;

    useEffect(() => {
        const loadPools = async () => {
            try {
                const response = await fetch(`${getBaseUrl()}/liquidity_pools?limit=20&order=desc`);
                if (!response.ok) throw new Error('Failed to fetch liquidity pools');
                const data: PaginatedResponse<LiquidityPool> = await response.json();
                setPools(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load liquidity pools.');
            }
        };

        loadPools();
    }, []);

    if (isLoading) {
        return <Loading title="Loading liquidity pools" description="Fetching liquidity pools data." />;
    }

    if (error || !pools) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4">
                <h1 className="text-2xl font-bold mb-2">Error</h1>
                <p className="text-muted">{error || 'Failed to load liquidity pools.'}</p>
            </div>
        );
    }

    return (
        <>
            <div className="md:hidden">
                <MobileLiquidityPools initialPools={pools} />
            </div>
            <div className="hidden md:block">
                <LiquidityPoolsDesktopView initialPools={pools} />
            </div>
        </>
    );
}
