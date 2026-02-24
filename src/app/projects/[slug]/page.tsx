import ClientPage from './client-page';
import { apiEndpoints, getApiV1Data } from '@/services/api';

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const data = await getApiV1Data(apiEndpoints.v1.projects({
      page: 1,
      itemsPerPage: 500,
      'order[id]': 'asc',
    }));
    const members = Array.isArray(data?.member) ? data.member : [];

    return members
      .map((item: any) => String(item?.id || '').trim())
      .filter((id: string) => id.length > 0)
      .map((id: string) => ({ slug: id }));
  } catch {
    return [];
  }
}

export const dynamicParams = false;

export default function Page() {
  return <ClientPage />;
}
