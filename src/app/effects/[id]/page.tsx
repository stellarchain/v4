import { notFound } from 'next/navigation';
import { getBaseUrlAsync } from '@/lib/stellar';

export const revalidate = 10;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EffectDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const baseUrl = await getBaseUrlAsync();

  const res = await fetch(`${baseUrl}/effects/${encodeURIComponent(id)}`, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 10 },
  }).catch(() => null);

  if (!res || !res.ok) notFound();
  const effect = await res.json();

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-6">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Effect</h1>
        <pre className="mt-4 text-xs bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl p-4 overflow-auto">
{JSON.stringify(effect, null, 2)}
        </pre>
      </div>
    </div>
  );
}

