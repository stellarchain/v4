'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import { Horizon } from '@stellar/stellar-sdk';
import { normalizeTransactions } from '@/lib/stellar';
import type { LiquidityPool, Operation, Transaction, LiquidityPoolTrade, Effect } from '@/lib/stellar';
import Link from 'next/link';
import LiquidityPoolMobileView from '@/components/mobile/LiquidityPoolMobileView';
import LiquidityPoolDesktopView from '@/components/desktop/LiquidityPoolDesktopView';
import { getDetailRouteValue } from '@/lib/shared/routeDetail';
import { createHorizonServer } from '@/services/horizon';


export default function LiquidityPoolPage() {
  const params = useParams<{ id?: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = getDetailRouteValue({
    pathname,
    searchParams,
    queryKey: 'id',
    routeParam: params.id,
    aliases: ['/liquidity-pool', '/liquidity-pools'],
  });
  const [pool, setPool] = useState<LiquidityPool | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [trades, setTrades] = useState<LiquidityPoolTrade[]>([]);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingSections, setLoadingSections] = useState({
    operations: true,
    transactions: true,
    trades: true,
    effects: true,
  });
  const isLoadingPool = !pool && !error;

  useEffect(() => {
    if (!id) {
      setError('Pool id is missing');
      return;
    }

    const loadPoolData = async () => {
      try {
        setError(null);
        setLoadingSections({
          operations: true,
          transactions: true,
          trades: true,
          effects: true,
        });
        const server = createHorizonServer();

        // Load pool first so shell can render.
        const poolRes = await server.liquidityPools().liquidityPoolId(id).call();
        setPool(poolRes as unknown as LiquidityPool);

        // Load remaining sections progressively.
        const loadOperations = async () => {
          try {
            const res = await server.operations().forLiquidityPool(id).limit(20).order('desc').call();
            setOperations(((res as any).records || []) as unknown as Operation[]);
          } catch {
            // Ignore section errors; page still renders other data.
          } finally {
            setLoadingSections((prev) => ({ ...prev, operations: false }));
          }
        };

        const loadTransactions = async () => {
          try {
            const res = await server.transactions().forLiquidityPool(id).limit(20).order('desc').call();
            setTransactions(normalizeTransactions((res as any).records || []));
          } catch {
            // Ignore section errors; page still renders other data.
          } finally {
            setLoadingSections((prev) => ({ ...prev, transactions: false }));
          }
        };

        const loadTrades = async () => {
          try {
            const res = await server.trades().forLiquidityPool(id).limit(20).order('desc').call();
            setTrades(((res as any).records || []) as unknown as LiquidityPoolTrade[]);
          } catch {
            // Ignore section errors; page still renders other data.
          } finally {
            setLoadingSections((prev) => ({ ...prev, trades: false }));
          }
        };

        const loadEffects = async () => {
          try {
            const res = await server.effects().forLiquidityPool(id).limit(20).order('desc').call();
            setEffects(((res as any).records || []) as unknown as Effect[]);
          } catch {
            // Ignore section errors; page still renders other data.
          } finally {
            setLoadingSections((prev) => ({ ...prev, effects: false }));
          }
        };

        void loadOperations();
        void loadTransactions();
        void loadTrades();
        void loadEffects();
      } catch (err) {
        if (!pool) {
          setError('Pool not found');
        }
        setLoadingSections({
          operations: false,
          transactions: false,
          trades: false,
          effects: false,
        });
      }
    };

    loadPoolData();
  }, [id]);

  if (!isLoadingPool && (error || !pool)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 min-h-screen bg-[var(--bg-primary)]">
        <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Pool Not Found</h1>
        <p className="text-[var(--text-muted)] mb-4 text-center">This liquidity pool may not exist.</p>
        <p className="text-[var(--text-muted)] font-mono text-xs mb-4 break-all max-w-lg text-center px-4">{id}</p>
        <Link
          href="/liquidity-pools"
          className="px-4 py-3 bg-[var(--accent)] text-white font-semibold rounded-xl transition-colors"
        >
          Back to Pools
        </Link>
      </div>
    );
  }

  const poolForView: LiquidityPool = pool || {
    id: id || '',
    paging_token: '',
    fee_bp: 30,
    type: 'constant_product',
    total_trustlines: 0,
    total_shares: '0',
    reserves: [
      { asset: 'native', amount: '0' },
      { asset: 'native', amount: '0' },
    ],
    last_modified_ledger: 0,
    last_modified_time: '',
  };

  return (
    <>
      <div className="hidden md:block">
        <LiquidityPoolDesktopView
          pool={poolForView}
          operations={operations}
          transactions={transactions}
          trades={trades}
          effects={effects}
          loading={isLoadingPool}
          loadingSections={loadingSections}
        />
      </div>
      <div className="md:hidden">
        <LiquidityPoolMobileView
          pool={poolForView}
          operations={operations}
          transactions={transactions}
          trades={trades}
          effects={effects}
          loading={isLoadingPool}
          loadingSections={loadingSections}
        />
      </div>
    </>
  );
}
