
import { getLiquidityPools } from '@/lib/stellar';
import MobileLiquidityPools from '@/components/mobile/MobileLiquidityPools';

export const revalidate = 60; // Revalidate every minute

export default async function LiquidityPoolsPage() {
    const initialPools = await getLiquidityPools(20);

    return (
        <>
            <div className="md:hidden">
                <MobileLiquidityPools initialPools={initialPools} />
            </div>
            <div className="hidden md:block p-8">
                <h1 className="text-3xl font-bold mb-4">Liquidity Pools</h1>
                <p className="text-gray-500">Desktop view coming soon. Please view on mobile.</p>
                {/* Placeholder for desktop view */}
            </div>
        </>
    );
}
