import Link from 'next/link';

export default function SacContractInfo({ issuer, admin, functions }: {
  issuer?: string; admin?: string; functions?: string[];
}) {
  return (
    <section aria-label="Stellar Asset Contract" className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Stellar Asset Contract (SAC)</h3>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">Built into the Stellar host. There is no WASM binary or decompiled source for this contract.</p>
      </div>
      <dl className="space-y-2 text-xs">
        <div><dt className="text-[var(--text-muted)]">Decimals</dt><dd className="mt-1 text-[var(--text-primary)]">7</dd></div>
        {issuer && <div><dt className="text-[var(--text-muted)]">Asset issuer</dt><dd className="mt-1 break-all font-mono"><Link href={`/address/${issuer}`} className="text-[var(--text-primary)] hover:underline">{issuer}</Link></dd></div>}
        {admin && <div><dt className="text-[var(--text-muted)]">Administrator</dt><dd className="mt-1 break-all font-mono"><Link href={`/${admin.startsWith('C') ? 'contracts' : 'address'}/${admin}`} className="text-[var(--text-primary)] hover:underline">{admin}</Link></dd></div>}
      </dl>
      {!!functions?.length && <div>
        <p className="text-xs text-[var(--text-muted)]">Interface · {functions.length} functions</p>
        <div className="mt-2 flex flex-wrap gap-2">{functions.map((name) => <span key={name} className="rounded-lg bg-[var(--bg-tertiary)] px-2 py-1 font-mono text-xs text-[var(--text-secondary)]">{name}</span>)}</div>
      </div>}
    </section>
  );
}
