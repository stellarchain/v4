import { getStatistics } from '@/lib/stellar';
import StatisticsView from '@/components/StatisticsView';

export const revalidate = 60;

export default async function StatisticsPage() {
  const stats = await getStatistics();

  return <StatisticsView stats={stats} />;
}
