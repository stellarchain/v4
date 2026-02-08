'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Horizon } from '@stellar/stellar-sdk';
import { getBaseUrl, timeAgo } from '@/lib/stellar';

type Effect = Horizon.ServerApi.EffectRecord;

export default function EffectsPage() {
  const [effects, setEffects] = useState<Effect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const server = new Horizon.Server(getBaseUrl());
    server.effects()
      .order('desc')
      .limit(30)
      .call()
      .then((response) => {
        setEffects(response.records as Effect[]);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load effects');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-4 text-center">
          <p className="text-[var(--text-muted)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Effects</h1>
        <span className="text-xs text-[var(--text-muted)]">Latest</span>
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl overflow-hidden">
        <div className="divide-y divide-[var(--border-subtle)]">
          {effects.map((e) => (
            <Link
              key={e.id}
              href={`/effects/${e.id}`}
              className="block px-4 py-3 hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-[var(--text-primary)] truncate">{e.type}</div>
                  <div className="font-mono text-[11px] text-[var(--text-muted)] truncate">{e.account}</div>
                </div>
                <div className="text-[11px] text-[var(--text-tertiary)] whitespace-nowrap">{timeAgo(e.created_at)}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

