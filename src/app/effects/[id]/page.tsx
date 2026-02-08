'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Horizon } from '@stellar/stellar-sdk';
import { getBaseUrl } from '@/lib/stellar';
import { notFound } from 'next/navigation';

type Effect = Horizon.ServerApi.EffectRecord;

export default function EffectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [effect, setEffect] = useState<Effect | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchEffect = async () => {
      try {
        // Horizon doesn't have a direct effect(id) method, use raw fetch
        const response = await fetch(`${getBaseUrl()}/effects/${id}`);
        if (!response.ok) {
          throw new Error('Effect not found');
        }
        const data = await response.json();
        setEffect(data as Effect);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load effect');
        setLoading(false);
      }
    };

    fetchEffect();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !effect) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-4">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Effect</h1>
        <pre className="mt-4 text-xs bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl p-4 overflow-auto">
{JSON.stringify(effect, null, 2)}
        </pre>
      </div>
    </div>
  );
}

