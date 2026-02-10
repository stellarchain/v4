'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import { Horizon } from '@stellar/stellar-sdk';
import { getBaseUrl, normalizeTransactions } from '@/lib/stellar';
import type { LiquidityPool, Operation, Transaction, LiquidityPoolTrade, Effect } from '@/lib/stellar';
import Link from 'next/link';
import LiquidityPoolMobileView from '@/components/mobile/LiquidityPoolMobileView';
import LiquidityPoolDesktopView from '@/components/desktop/LiquidityPoolDesktopView';
import Loading from '@/components/ui/Loading';


export default function LiquidityPoolPage() {
  const params = useParams<{ id?: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pathId = (() => {
    const clean = pathname.replace(/\/+$/, '');
    if (clean.startsWith('/liquidity-pool/')) return clean.slice('/liquidity-pool/'.length);
    return '';
  })();
  const id = (searchParams.get('id') || params.id || pathId || '').trim();
  const [pool, setPool] = useState<LiquidityPool | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [trades, setTrades] = useState<LiquidityPoolTrade[]>([]);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isLoading = !pool && !error;

  useEffect(() => {
    if (!id) {
      setError('Pool id is missing');
      return;
    }

    const loadPoolData = async () => {
      try {
        const server = new Horizon.Server(getBaseUrl());

        const [poolRes, opsRes, txsRes, tradesRes, effectsRes] = await Promise.allSettled([
          server.liquidityPools().liquidityPoolId(id).call(),
          server.operations().forLiquidityPool(id).limit(20).order('desc').call(),
          server.transactions().forLiquidityPool(id).limit(20).order('desc').call(),
          server.trades().forLiquidityPool(id).limit(20).order('desc').call(),
          server.effects().forLiquidityPool(id).limit(20).order('desc').call(),
        ]);

        if (poolRes.status === 'fulfilled') {
          setPool(poolRes.value as unknown as LiquidityPool);
        } else {
          setError('Pool not found');
          return;
        }

        if (opsRes.status === 'fulfilled') {
          setOperations(((opsRes.value as any).records || []) as unknown as Operation[]);
        }

        if (txsRes.status === 'fulfilled') {
          setTransactions(normalizeTransactions((txsRes.value as any).records || []));
        }

        if (tradesRes.status === 'fulfilled') {
          setTrades(((tradesRes.value as any).records || []) as unknown as LiquidityPoolTrade[]);
        }

        if (effectsRes.status === 'fulfilled') {
          setEffects(((effectsRes.value as any).records || []) as unknown as Effect[]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching pool data');
      }
    };

    loadPoolData();
  }, [id]);

  if (isLoading) {
    return <Loading title="Loading liquidity pool" description="Fetching pool details and activity." />;
  }

  if (error || !pool) {
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

  return (
    <>
      <div className="hidden md:block">
        <LiquidityPoolDesktopView
          pool={pool}
          operations={operations}
          transactions={transactions}
          trades={trades}
          effects={effects}
        />
      </div>
      <div className="md:hidden">
        <LiquidityPoolMobileView
          pool={pool}
          operations={operations}
          transactions={transactions}
          trades={trades}
          effects={effects}
        />
      </div>
    </>
  );
}
