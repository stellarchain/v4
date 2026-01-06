import { buildAddressGraph } from '@/lib/stellar_graph';
import AddressGraph from '@/components/AddressGraph';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ address: string }>;
}

export default async function GraphPage({ params }: PageProps) {
  const { address } = await params;

  // Validate address format (basic check)
  if (!address || address.length !== 56 || !address.startsWith('G')) {
    notFound();
  }

  let graphData;
  let error = null;

  try {
    graphData = await buildAddressGraph(address, 2, 50);
  } catch (e) {
    console.error('Failed to build graph:', e);
    error = 'Failed to load transaction graph. The address might not have enough transaction history.';
  }

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href={`/account/${address}`}
              className="text-[var(--text-tertiary)] hover:text-[var(--primary)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">
              Transaction Graph
            </h1>
          </div>
          <p className="text-[var(--text-tertiary)] text-[13px] mt-1 font-mono">
            {address.slice(0, 12)}...{address.slice(-12)}
          </p>
        </div>

        {graphData && (
          <div className="flex items-center gap-6 text-sm">
            <div>
              <div className="text-[var(--text-tertiary)] text-[11px] uppercase tracking-wide">Nodes</div>
              <div className="text-[var(--text-primary)] font-semibold">{graphData.nodes.length}</div>
            </div>
            <div>
              <div className="text-[var(--text-tertiary)] text-[11px] uppercase tracking-wide">Connections</div>
              <div className="text-[var(--text-primary)] font-semibold">{graphData.links.length}</div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-4">
        <div className="flex items-center gap-8 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: 'var(--primary)' }} />
            <span className="text-[var(--text-secondary)] text-xs">Source Address</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: 'var(--info)' }} />
            <span className="text-[var(--text-secondary)] text-xs">Destination</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: 'var(--text-tertiary)' }} />
            <span className="text-[var(--text-secondary)] text-xs">Intermediate</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[var(--text-secondary)] text-xs">Large Transaction (&gt;1000 XLM)</span>
          </div>
        </div>
      </div>

      {/* Graph Visualization */}
      {error ? (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-12 text-center">
          <svg className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-[var(--text-primary)] font-semibold mb-2">Failed to Load Graph</h3>
          <p className="text-[var(--text-tertiary)] text-sm">{error}</p>
        </div>
      ) : graphData ? (
        <div className="h-[700px] w-full max-w-full overflow-hidden rounded-xl border border-[var(--border-subtle)] relative bg-[var(--bg-secondary)]">
          <AddressGraph data={graphData} />
        </div>
      ) : (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-12 text-center">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-tertiary)] text-sm">Building transaction graph...</p>
        </div>
      )}
    </div>
  );
}
