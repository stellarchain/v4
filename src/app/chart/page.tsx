import Link from 'next/link';
import Card from '@/components/ui/Card';
import { CHART_METRICS } from '@/lib/shared/chartCatalog';

export default function ChartIndexPage() {
  const groups = [...new Set(CHART_METRICS.map((metric) => metric.group))];
  return (
    <main className="mx-auto max-w-[1400px] space-y-6 p-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Historical charts</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Explore indexed network, market, payment, account and contract metric buckets. Coverage follows the data available for each metric and network.</p>
      </div>
      {groups.map((group) => (
        <section key={group} className="space-y-3" aria-labelledby={`chart-group-${group}`}>
          <h2 id={`chart-group-${group}`} className="text-sm font-semibold text-[var(--text-primary)]">{group}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CHART_METRICS.filter((metric) => metric.group === group).map((metric) => (
              <Link key={metric.key} href={`/chart/${metric.key}`} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-blue)]">
                <Card className="h-full p-4 transition-colors hover:border-[var(--primary-blue)]">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{metric.label}</span>
                  <span className="mt-2 block text-xs leading-relaxed text-[var(--text-secondary)]">{metric.description}</span>
                  <span className="mt-1 block font-mono text-xs text-[var(--text-secondary)]">{metric.key}</span>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
