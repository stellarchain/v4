'use client';

import { useEffect, useState } from 'react';
import { useNetwork } from '@/contexts/NetworkContext';
import { apiEndpoints, getApiV1Data } from '@/services/api';
import InlineSkeleton from '@/components/ui/InlineSkeleton';

export default function ContractWasmPanel({ contractId, wasmHash }: { contractId: string; wasmHash?: string }) {
  const { network } = useNetwork();
  const [file, setFile] = useState<{ url: string; size: number; key: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const key = `${network}:${contractId}:${wasmHash}`;
  const currentFile = file?.key === key ? file : null;

  useEffect(() => {
    if (!wasmHash || !/^[a-f0-9]{64}$/i.test(wasmHash)) return;
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setLoading(true);
    setError(null);
    setFile(null);

    const load = async () => {
      try {
        const binary: ArrayBuffer = await getApiV1Data(apiEndpoints.v1.contractWasm(contractId, { network }), {
          responseType: 'arraybuffer', signal: controller.signal, headers: { Accept: 'application/wasm' },
        });
        const digest = await crypto.subtle.digest('SHA-256', binary);
        const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
        if (hash !== wasmHash.toLowerCase()) throw new Error('WASM hash mismatch. Reload the contract page and try again.');
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(new Blob([binary], { type: 'application/wasm' }));
        setFile({ url: objectUrl, size: binary.byteLength, key });
      } catch (failure) {
        if (controller.signal.aborted) return;
        setError(failure instanceof Error && failure.message.startsWith('WASM hash mismatch')
          ? failure.message : 'WASM binary is unavailable. Please retry.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [contractId, wasmHash, network, key, retry]);

  return (
    <section aria-label="WASM binary" className="mb-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">WASM binary</h3>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">Compiled WebAssembly from Orion, checked against the contract&apos;s WASM hash.</p>
      </div>
      {!wasmHash && <p className="text-sm text-[var(--text-muted)]">WASM hash unavailable.</p>}
      {wasmHash && <p className="break-all font-mono text-xs text-[var(--text-secondary)]">SHA-256: {wasmHash}</p>}
      {loading && <div role="status" aria-label="Loading WASM binary"><InlineSkeleton width="w-48" /></div>}
      {error && <div role="alert" className="text-sm text-[var(--text-primary)]">
        <p>{error}</p>
        <button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-2 rounded-lg border border-[var(--border-default)] px-3 py-2 focus-visible:outline-2">Retry</button>
      </div>}
      {currentFile && <div className="flex flex-wrap items-center gap-3">
        <a href={currentFile.url} download={`${contractId}.wasm`} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-primary)] focus-visible:outline-2">Download WASM</a>
        <span className="text-xs text-[var(--text-muted)]">{currentFile.size.toLocaleString()} bytes</span>
      </div>}
    </section>
  );
}
