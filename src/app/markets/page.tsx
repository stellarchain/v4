import { getMarketAssets } from '@/lib/stellar';
import MarketsTable from '@/components/MarketsTable';

export const revalidate = 60;

export default async function MarketsPage() {
  const assets = await getMarketAssets();

  return (
    <div className="space-y-4">
      <MarketsTable initialAssets={assets} />
    </div>
  );
}
