'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import { buildAddressGraph } from '@/lib/stellar_graph';
import AddressGraph from '@/components/AddressGraph';
import Link from 'next/link';
import { notFound } from 'next/navigation';


export default function GraphPage() {
  const params = useParams<{ address?: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pathAddress = (() => {
    const clean = pathname.replace(/\/+$/, '');
    if (clean.startsWith('/graph/')) return clean.slice('/graph/'.length);
    return '';
  })();
  const address = (searchParams.get('address') || params.address || pathAddress || '').trim();
  const [graphData, setGraphData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address || address.length !== 56 || !address.startsWith('G')) {
      notFound();
      return;
    }

    buildAddressGraph(address, 2, 50)
      .then((data) => {
        setGraphData(data);
        setLoading(false);
      })
      .catch((e) => {
        console.error('Failed to build graph:', e);
        setError('Failed to load transaction graph. The address might not have enough transaction history.');
        setLoading(false);
      });
  }, [address]);

  if (!address || address.length !== 56 || !address.startsWith('G')) {
    notFound();
  }

  return (
    <div className="space-y-4 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/graph"
            className="w-10 h-10 bg-[var(--bg-secondary)] rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Transaction Graph</h1>
            </div>
            <p className="text-[var(--text-muted)] text-xs font-mono">
              {address.slice(0, 8)}...{address.slice(-8)}
            </p>
          </div>
        </div>

        {graphData && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Nodes</div>
              <div className="text-sm font-semibold text-[var(--text-primary)] font-mono">{graphData.nodes.length}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Connections</div>
              <div className="text-sm font-semibold text-[var(--text-primary)] font-mono">{graphData.links.length}</div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-[var(--bg-secondary)] rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]" />
            <span className="text-[var(--text-muted)]">Source</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--info)]" />
            <span className="text-[var(--text-muted)]">Destination</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--text-tertiary)]" />
            <span className="text-[var(--text-muted)]">Intermediate</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[var(--text-muted)]">Large (&gt;1000 XLM)</span>
          </div>
        </div>
      </div>

      {/* Graph Visualization */}
      {loading ? (
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-4 text-center shadow-sm">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-muted)] text-sm">Building transaction graph...</p>
        </div>
      ) : error ? (
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-4 text-center shadow-sm">
          <div className="w-16 h-16 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-[var(--text-primary)] font-medium mb-1">Failed to Load Graph</h3>
          <p className="text-[var(--text-muted)] text-sm max-w-md mx-auto">{error}</p>
        </div>
      ) : (
        <div className="h-[600px] w-full max-w-full overflow-hidden rounded-2xl relative bg-[var(--bg-secondary)] shadow-sm">
          <AddressGraph data={graphData} />
        </div>
      )}
    </div>
  );
}
