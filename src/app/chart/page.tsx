import type { Metadata } from 'next';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { CHART_METRICS } from '@/lib/shared/chartCatalog';

export const metadata: Metadata = {
  title: 'Historical charts',
  description: 'Browse indexed historical Stellar network, market, payment, account and contract metrics.',
};

export default function ChartIndexPage() {
  const groups = [...new Set(CHART_METRICS.map((metric) => metric.group))];
  return (
    <main className="mx-auto max-w-[1400px] space-y-6 p-4">
      <Card variant="bordered" className="flex flex-wrap items-start justify-between gap-4 p-4 shadow-sm">
        <div className="flex min-w-0 items-start gap-4">
          <Link href="/statistics" aria-label="Back to statistics" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--info-muted)] text-[var(--primary-blue)] transition-colors hover:bg-[var(--bg-tertiary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-blue)]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Network statistics</span>
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Historical charts</h1>
            <p className="mt-1 max-w-3xl text-sm text-[var(--text-secondary)]">Explore indexed network, market, payment, account and contract metric buckets. Coverage follows the data available for each metric and network.</p>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]/70 px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Metrics</div>
          <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-[var(--text-primary)]">{CHART_METRICS.length}</div>
        </div>
      </Card>
      {groups.map((group) => (
        <section key={group} className="space-y-3" aria-labelledby={`chart-group-${group}`}>
          <h2 id={`chart-group-${group}`} className="text-sm font-semibold text-[var(--text-primary)]">{group}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CHART_METRICS.filter((metric) => metric.group === group).map((metric) => (
              <Link key={metric.key} href={`/chart/${metric.key}`} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-blue)]">
                <Card variant="bordered" className="h-full p-4 shadow-sm transition-colors hover:border-[var(--primary-blue)]">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{metric.label}</span>
                  <span className="mt-2 block text-xs leading-relaxed text-[var(--text-secondary)]">{metric.description}</span>
                  <span className="mt-3 block text-xs font-medium text-[var(--primary-blue)]">View chart <span aria-hidden="true">↗</span></span>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
