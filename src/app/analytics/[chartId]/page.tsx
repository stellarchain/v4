import StatisticsPage from '../../statistics/page';

export function generateStaticParams() {
  return [{ chartId: 'transactions' }];
}

export default function Page() {
  return <StatisticsPage />;
}

export const revalidate = 60;
