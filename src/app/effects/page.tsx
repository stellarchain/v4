import Link from 'next/link';
import { getEffects, timeAgo } from '@/lib/stellar';

export const revalidate = 10;

export default async function EffectsPage() {
  const res = await getEffects(30);
  const effects = res._embedded.records;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Effects</h1>
        <span className="text-xs text-[var(--text-muted)]">Latest</span>
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl overflow-hidden">
        <div className="divide-y divide-[var(--border-subtle)]">
          {effects.map((e) => (
            <Link
              key={e.id}
              href={`/effects/${e.id}`}
              className="block px-5 py-3 hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-[var(--text-primary)] truncate">{e.type}</div>
                  <div className="font-mono text-[11px] text-[var(--text-muted)] truncate">{e.account}</div>
                </div>
                <div className="text-[11px] text-[var(--text-tertiary)] whitespace-nowrap">{timeAgo(e.created_at)}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

