
import { getLiquidityPools } from '@/lib/stellar';
import MobileLiquidityPools from '@/components/mobile/MobileLiquidityPools';
import LiquidityPoolsDesktopView from '@/components/desktop/LiquidityPoolsDesktopView';

export const revalidate = 60; // Revalidate every minute

export default async function LiquidityPoolsPage() {
    const initialPools = await getLiquidityPools(20);

    return (
        <>
            <div className="md:hidden">
                <MobileLiquidityPools initialPools={initialPools} />
            </div>
            <div className="hidden md:block">
                <LiquidityPoolsDesktopView initialPools={initialPools} />
            </div>
        </>
    );
}
