import { getLiquidityPool, getLiquidityPoolOperations, getLiquidityPoolTransactions, getLiquidityPoolTrades, getLiquidityPoolEffects } from '@/lib/stellar';
import Link from 'next/link';
import LiquidityPoolMobileView from '@/components/mobile/LiquidityPoolMobileView';

export const revalidate = 60;

interface LiquidityPoolPageProps {
  params: Promise<{ id: string }>;
}

export default async function LiquidityPoolPage({ params }: LiquidityPoolPageProps) {
  const { id } = await params;

  let pool = null;
  let operations = null;
  let transactions = null;
  let trades = null;
  let effects = null;
  let error: string | null = null;

  try {
    const [poolRes, opsRes, txsRes, tradesRes, effectsRes] = await Promise.allSettled([
      getLiquidityPool(id),
      getLiquidityPoolOperations(id, 20),
      getLiquidityPoolTransactions(id, 20),
      getLiquidityPoolTrades(id, 20),
      getLiquidityPoolEffects(id, 20),
    ]);

    if (poolRes.status === 'fulfilled') {
      pool = poolRes.value;
    } else {
      error = 'Pool not found';
    }

    if (opsRes.status === 'fulfilled') {
      operations = opsRes.value._embedded.records;
    }

    if (txsRes.status === 'fulfilled') {
      transactions = txsRes.value._embedded.records;
    }

    if (tradesRes.status === 'fulfilled') {
      trades = tradesRes.value._embedded.records;
    }

    if (effectsRes.status === 'fulfilled') {
      effects = effectsRes.value._embedded.records;
    }
  } catch (e) {
    error = 'Error fetching pool data';
    console.error(e);
  }

  if (error || !pool) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 min-h-screen bg-[var(--bg-primary)]">
        <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-2xl flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Pool Not Found</h1>
        <p className="text-[var(--text-muted)] mb-6 text-center">This liquidity pool may not exist.</p>
        <p className="text-[var(--text-muted)] font-mono text-xs mb-8 break-all max-w-lg text-center px-4">{id}</p>
        <Link
          href="/liquidity-pools"
          className="px-6 py-3 bg-[var(--accent)] text-white font-semibold rounded-xl transition-colors"
        >
          Back to Pools
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="hidden md:block p-8 min-h-screen bg-[var(--bg-primary)]">
        <h1 className="text-3xl font-bold mb-4 text-[var(--text-primary)]">Liquidity Pool</h1>
        <p className="text-[var(--text-muted)]">Desktop view coming soon. Please view on mobile.</p>
      </div>
      <div className="md:hidden">
        <LiquidityPoolMobileView
          pool={pool}
          operations={operations || []}
          transactions={transactions || []}
          trades={trades || []}
          effects={effects || []}
        />
      </div>
    </>
  );
}
