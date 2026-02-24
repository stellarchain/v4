import ClientPage from './client-page';
import { apiEndpoints, getApiV1Data } from '@/services/api';

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const maxPages = 200;
    const itemsPerPage = 500;
    const slugs = new Set<string>();

    for (let page = 1; page <= maxPages; page += 1) {
      const data = await getApiV1Data(apiEndpoints.v1.projects({
        page,
        itemsPerPage,
        'order[id]': 'asc',
      }));

      const members = Array.isArray(data?.member) ? data.member : [];
      for (const item of members) {
        const id = String(item?.id || '').trim();
        if (id) slugs.add(id);
      }

      const hasNext = Boolean(data?.view?.next);
      if (!hasNext || members.length === 0) break;
    }

    return Array.from(slugs).map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export const dynamicParams = false;

export default function Page() {
  return <ClientPage />;
}
