'use client';

import { useEffect, useState } from 'react';
import { Horizon } from '@stellar/stellar-sdk';
import type { Operation } from '@/lib/stellar';
import LiveOperationFeed from '@/components/LiveOperationFeed';
import Loading from '@/components/ui/Loading';
import { createHorizonServer } from '@/services/horizon';

export default function OperationsPage() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadOperations = async () => {
      try {
        const server = createHorizonServer();
        const operationsResponse = await server.operations().order('desc').limit(25).call();
        const operationsData = (operationsResponse.records || []) as unknown as Operation[];

        setOperations(operationsData);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load operations');
        setIsLoading(false);
      }
    };

    loadOperations();
  }, []);

  if (isLoading) {
    return <Loading title="Loading operations" description="Fetching recent operations." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-[var(--info)]/20 to-[var(--info)]/5 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-[var(--info)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Operations</h1>
            <span className="w-1.5 h-1.5 bg-[var(--info)] rounded-full animate-pulse-soft" />
          </div>
          <p className="text-[var(--text-tertiary)] text-[13px]">Live feed of all operations on the Stellar network</p>
        </div>
      </div>

      <div>
        <LiveOperationFeed initialOperations={operations} limit={25} />
      </div>

      <div className="flex justify-center">
        <button className="px-4 py-3 bg-[var(--bg-secondary)] rounded-xl shadow-sm text-[var(--text-primary)] font-medium text-sm hover:shadow-md hover:-translate-y-0.5 transition-[box-shadow,transform]">
          Load More
        </button>
      </div>
    </div>
  );
}
