import type { Metadata } from 'next';
import { CHART_METRICS, chartMetric } from '@/lib/shared/chartCatalog';
import ChartMetricClient from './ChartMetricClient';

export function generateStaticParams() {
  return CHART_METRICS.map((metric) => ({ slug: metric.key }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const metric = chartMetric(slug);
  return {
    title: metric ? `${metric.label} historical chart` : 'Historical chart',
    description: metric ? metric.description : 'Historical Stellar metric chart.',
  };
}

export default function ChartMetricPage() {
  return <ChartMetricClient />;
}
