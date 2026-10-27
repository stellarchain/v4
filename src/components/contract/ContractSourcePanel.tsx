'use client';

import { useEffect, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useNetwork } from '@/contexts/NetworkContext';
import { apiEndpoints, postApiV1Data } from '@/services/api';
import InlineSkeleton from '@/components/ui/InlineSkeleton';

export default function ContractSourcePanel({ contractId, wasmHash, indexedSource }: {
  contractId: string; wasmHash?: string; indexedSource?: string;
}) {
  const { network } = useNetwork();
  const key = `${network}:${contractId}:${wasmHash}`;
  const [result, setResult] = useState<{ key: string; source: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const source = indexedSource || (result?.key === key ? result.source : null);

  useEffect(() => {
    if (indexedSource || !wasmHash) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setResult(null);
    const load = async () => {
      try {
        // A concurrent tab may already be using the single decompiler worker.
        const deadline = Date.now() + 30_000;
        while (!controller.signal.aborted) {
          try {
            const data = await postApiV1Data(apiEndpoints.v1.contractDecompile(contractId, { network }), { wasmHash }, {
              signal: controller.signal, timeout: 35_000, headers: { Accept: 'application/json' },
            });
            if (data.wasmHash !== wasmHash.toLowerCase() || typeof data.sourceCode !== 'string' || !data.sourceCode.trim()) {
              throw new Error('Invalid decompilation response.');
            }
            if (!controller.signal.aborted) setResult({ key, source: data.sourceCode });
            break;
          } catch (failure) {
            if ((failure as { response?: { status?: number } })?.response?.status !== 429 || Date.now() >= deadline) throw failure;
            await new Promise<void>((resolve) => {
              const finish = () => { clearTimeout(timer); controller.signal.removeEventListener('abort', finish); resolve(); };
              const timer = setTimeout(finish, 2000);
              controller.signal.addEventListener('abort', finish, { once: true });
            });
          }
        }
      } catch {
        if (!controller.signal.aborted) setError('Decompilation is unavailable. Reload the page if the contract was upgraded, or retry later.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [contractId, wasmHash, network, indexedSource, key, retry]);

  return (
    <section aria-label="Contract source code" className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] overflow-hidden">
      <div className="p-4 border-b border-[var(--border-subtle)]">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{indexedSource ? 'Indexed code' : 'Decompiled code'}</h3>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{indexedSource
          ? 'May be decompiled output; availability alone does not verify source provenance.'
          : 'Reconstructed from WASM by Soroban Auditor. This is not the original source or a verified security audit.'}</p>
      </div>
      <div className="p-4">
        {loading && <div role="status" aria-live="polite" className="space-y-3">
          <p className="text-sm font-medium text-[var(--text-primary)]">Decompiling…</p>
          <InlineSkeleton width="w-48" />
          <InlineSkeleton width="w-full" />
        </div>}
        {error && <div role="alert" className="text-sm text-[var(--text-secondary)]">
          <p>{error}</p>
          <button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-3 rounded-lg border border-[var(--border-default)] px-3 py-2 focus-visible:outline-2">Retry decompilation</button>
        </div>}
        {source && <div className="w-full overflow-hidden"><SyntaxHighlighter language="rust" style={vscDarkPlus}
          customStyle={{ margin: 0, borderRadius: '0.5rem', fontSize: '0.75rem', maxHeight: '600px', maxWidth: '100%', overflow: 'auto' }}
          showLineNumbers wrapLines={false} wrapLongLines={false}>{source}</SyntaxHighlighter></div>}
        {!wasmHash && !source && <p className="text-sm text-[var(--text-muted)]">No WASM hash is available for decompilation.</p>}
      </div>
    </section>
  );
}
