import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { contractStateFields, formatContractObservation } from '@/lib/shared/contractOverview';
import type { ContractStorageResult } from '@/lib/soroban/storage';

interface ContractFunction {
  name: string;
  doc?: string;
  inputs: Array<{ name: string; type: { type: string } }>;
  outputs: Array<{ type: string }>;
}

function SectionIcon({ code = false }: { code?: boolean }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-blue)]/10 text-[var(--primary-blue)]">
      <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {code ? <path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16" /> : <><rect x="5" y="5" width="14" height="14" rx="3" /><path d="M9 9h6v6H9zM9 2v3m6-3v3m-6 14v3m6-3v3M2 9h3m-3 6h3m14-6h3m-3 6h3" /></>}
      </svg>
    </span>
  );
}

export default function ContractOverviewInfo({ storage, spec, lastSeenAt, archived, wasmSizeBytes }: {
  storage?: ContractStorageResult | null;
  spec?: unknown;
  lastSeenAt?: string | null;
  archived?: boolean | null;
  wasmSizeBytes?: number | null;
}) {
  const state = contractStateFields(storage?.entries ?? []);
  const addresses = state.filter((field) => field.address);
  const values = state.filter((field) => !field.address);
  const functions = (spec as { functions?: ContractFunction[] } | null)?.functions ?? [];
  const lastSeen = formatContractObservation(lastSeenAt);
  const hasState = state.length > 0 || !!lastSeen || archived != null || !!wasmSizeBytes;
  if (!hasState && !functions.length) return null;

  return (
    <div className="space-y-4">
      {hasState && <section aria-label="Indexed contract information">
        <Card variant="bordered">
          <header className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-4 sm:px-5">
            <SectionIcon />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Contract state</h3>
              <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">From indexed storage and contract metadata</p>
            </div>
            <Badge variant="info">Orion</Badge>
          </header>

          <div className="space-y-4 p-4 sm:p-5">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {!!wasmSizeBytes && <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-3 py-3">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">WASM size</dt>
                <dd className="mt-2 font-mono text-sm font-medium text-[var(--text-primary)]">{wasmSizeBytes.toLocaleString()} <span className="font-sans text-xs font-normal text-[var(--text-tertiary)]">bytes</span></dd>
              </div>}
              {archived != null && <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-3 py-3">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Archival status</dt>
                <dd className="mt-2"><Badge variant={archived ? 'warning' : 'neutral'}>{archived ? 'Archived' : 'Not archived'}</Badge></dd>
              </div>}
              {lastSeen && <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-3 py-3">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Last seen (Orion)</dt>
                <dd className="mt-2 font-mono text-[11px] leading-relaxed text-[var(--text-primary)]"><time dateTime={lastSeenAt!}>{lastSeen}</time></dd>
              </div>}
            </dl>

            {!!addresses.length && <dl className="space-y-2">
              {addresses.map((field) => <div key={field.label} className="rounded-xl border border-[var(--border-subtle)] px-3 py-3 transition-colors hover:border-[var(--border-default)]">
                <dt className="flex items-center gap-2 text-[11px] font-medium text-[var(--text-tertiary)]">
                  <svg aria-hidden="true" className="h-3.5 w-3.5 text-[var(--primary-blue)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m10 13 4-4m-5 6-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 2 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" /></svg>
                  {field.label}
                </dt>
                <dd className="mt-1.5">
                  <Link className="group flex items-start justify-between gap-3 rounded font-mono text-xs leading-relaxed text-[var(--text-primary)] hover:text-[var(--primary-blue)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary-blue)]" href={`/${field.address!.startsWith('C') ? 'contracts' : 'address'}/${field.address}`}>
                    <span className="min-w-0 break-all">{field.value}</span>
                    <svg aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--text-muted)] transition-colors group-hover:text-[var(--primary-blue)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
                  </Link>
                </dd>
              </div>)}
            </dl>}

            {!!values.length && <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {values.map((field) => <div key={field.label} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--bg-tertiary)] px-3 py-3">
                <dt className="text-xs text-[var(--text-secondary)]">{field.label}</dt>
                <dd>{field.value === 'Yes' || field.value === 'No'
                  ? <Badge variant={field.label === 'Active' && field.value === 'Yes' ? 'success' : field.label === 'Paused' && field.value === 'Yes' ? 'warning' : 'neutral'}>{field.value}</Badge>
                  : <span className="break-all font-mono text-sm font-medium text-[var(--text-primary)]">{field.value}</span>}</dd>
              </div>)}
            </dl>}
          </div>
        </Card>
      </section>}

      {!!functions.length && <section aria-label="Contract interface">
        <Card variant="bordered">
          <header className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-4 sm:px-5">
            <SectionIcon code />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Contract interface</h3>
              <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">Expand a function to inspect its signature and documentation</p>
            </div>
            <Badge>{functions.length} functions</Badge>
          </header>
          <div className="space-y-2 p-3 sm:p-4">{functions.map((fn) => <details key={fn.name} className="group rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] transition-colors open:border-[var(--primary-blue)]/30 open:bg-[var(--bg-secondary)]">
            <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-blue)] hover:bg-[var(--bg-tertiary)] [&::-webkit-details-marker]:hidden">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--primary-blue)]/10 font-mono text-[10px] font-medium text-[var(--primary-blue)]">fn</span>
              <span className="min-w-0 flex-1 break-all font-mono text-xs font-medium text-[var(--text-primary)]">{fn.name}</span>
              <span className="hidden text-[10px] tabular-nums text-[var(--text-tertiary)] sm:block">{fn.inputs.length} {fn.inputs.length === 1 ? 'argument' : 'arguments'}</span>
              <span className="hidden max-w-48 truncate rounded-md border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2 py-1 font-mono text-[10px] text-[var(--text-secondary)] sm:block" title={fn.outputs.map((output) => output.type).join(', ') || 'void'}>{fn.outputs.map((output) => output.type).join(', ') || 'void'}</span>
              <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform group-open:rotate-180 motion-reduce:transition-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </summary>
            <div className="space-y-3 border-t border-[var(--border-subtle)] p-3 sm:p-4">
              <pre className="whitespace-pre-wrap break-words rounded-lg bg-[var(--bg-tertiary)] p-3 font-mono text-[11px] leading-relaxed text-[var(--text-primary)]">{fn.name}({fn.inputs.map((arg) => `${arg.name}: ${arg.type.type}`).join(', ')}) → {fn.outputs.length ? fn.outputs.map((output) => output.type).join(', ') : 'void'}</pre>
              {fn.doc && <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-[var(--text-secondary)]">{fn.doc}</p>}
            </div>
          </details>)}</div>
        </Card>
      </section>}
    </div>
  );
}
