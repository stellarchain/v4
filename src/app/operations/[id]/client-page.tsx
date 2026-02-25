'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Horizon } from '@stellar/stellar-sdk';
import { shortenAddress, timeAgo } from '@/lib/stellar';
import { txRoute, addressRoute } from '@/lib/shared/routes';
import Loading from '@/components/ui/Loading';
import { createHorizonServer } from '@/services/horizon';


type Operation = Horizon.ServerApi.OperationRecord;

export default function OperationDetailsPage() {
  const params = useParams<{ id?: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pathId = (() => {
    const clean = pathname.replace(/\/+$/, '');
    if (clean.startsWith('/operations/')) return clean.slice('/operations/'.length);
    return '';
  })();
  const id = (searchParams.get('id') || params.id || pathId || '').trim();
  const [op, setOp] = useState<Operation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isLoading = !error && !op;

  const loadOperationData = async (opId: string) => {
    const server = createHorizonServer();
    const operation = await server.operations().operation(opId).call();
    return operation as unknown as Operation;
  };

  useEffect(() => {
    if (!id) {
      setError('Missing operation id.');
      return;
    }

    const fetchOperation = async () => {
      try {
        setError(null);
        const operation = await loadOperationData(id);
        setOp(operation);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load operation.');
      }
    };

    fetchOperation();
  }, [id]);

  if (isLoading) {
    return <Loading title="Loading operation" description="Fetching operation details." />;
  }

  if (error || !op) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">Operation</h1>
            <div className="mt-1 text-sm text-[var(--text-tertiary)] font-mono break-all">{op.id}</div>
            <div className="mt-2 text-xs text-[var(--text-muted)]">{timeAgo(op.created_at)}</div>
          </div>
          <div className="shrink-0 flex gap-2">
            <Link
              href={txRoute(op.transaction_hash)}
              className="px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              View Tx
            </Link>
            <Link
              href={addressRoute(op.source_account)}
              className="px-3 py-2 rounded-lg bg-[var(--info)] text-xs font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Source
            </Link>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Type</div>
            <div className="mt-1 font-mono text-[var(--text-primary)]">{op.type}</div>
          </div>
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Source</div>
            <div className="mt-1 font-mono text-[var(--text-primary)]">{shortenAddress(op.source_account)}</div>
          </div>
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Tx Hash</div>
            <div className="mt-1 font-mono text-[var(--text-primary)]">{shortenAddress(op.transaction_hash)}</div>
          </div>
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--text-secondary)]">
            Raw JSON
          </summary>
          <pre className="mt-3 text-xs bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl p-4 overflow-auto">
{JSON.stringify(op, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
