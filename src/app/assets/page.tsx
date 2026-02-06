import Link from 'next/link';
import { getAssets } from '@/lib/stellar';
import { assetRoute } from '@/lib/routes';

export const revalidate = 60;

export default async function AssetsPage() {
  const res = await getAssets(50, 'desc');
  const assets = res._embedded.records;

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-4">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Assets</h1>
          <p className="text-sm text-[var(--text-tertiary)]">Latest assets from Horizon</p>
        </div>
        <Link href="/markets" className="text-sm font-medium text-[var(--info)] hover:underline">
          Markets
        </Link>
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1">
          {assets.map((a) => (
            <Link
              key={`${a.asset_code}:${a.asset_issuer}`}
              href={assetRoute(a.asset_code, a.asset_issuer)}
              className="px-4 py-3 border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-mono text-sm text-[var(--text-primary)] truncate">
                    {a.asset_code}
                  </div>
                  <div className="font-mono text-[11px] text-[var(--text-muted)] truncate">
                    {a.asset_issuer}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] text-[var(--text-tertiary)]">{Number((a as any).num_accounts || 0).toLocaleString()} holders</div>
                  <div className="text-[11px] text-[var(--text-muted)]">{Number((a as any).amount || 0).toLocaleString()} supply</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
