'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAccountOperations, getAccountTransactions, getOperationTypeLabel, shortenAddress, timeAgo } from '@/lib/stellar';
import type { Operation, Transaction } from '@/lib/stellar';
import GliderTabs from '@/components/ui/GliderTabs';
import InlineSkeleton from '@/components/ui/InlineSkeleton';
import CompactTransactionRow from '@/components/CompactTransactionRow';

type HistoryTab = 'transactions' | 'operations';

/** Historical reads do not require a current account balance/state record. */
export default function AccountHistoryView({ accountId }: { accountId: string }) {
  const [tab, setTab] = useState<HistoryTab>('transactions');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const load = async () => {
      try {
        if (tab === 'transactions') {
          const page = await getAccountTransactions(accountId, 25, 'desc', cursor ?? undefined);
          if (cancelled) return;
          setTransactions((current) => cursor ? [...current, ...page.records] : page.records);
          setNextCursor(page.meta.nextCursor);
        } else {
          const page = await getAccountOperations(accountId, 25, 'desc', cursor ?? undefined);
          if (cancelled) return;
          setOperations((current) => cursor ? [...current, ...page.records] : page.records);
          setNextCursor(page.meta.nextCursor);
        }
      } catch {
        if (!cancelled) setError('Historical activity is temporarily unavailable. Please retry.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [accountId, tab, cursor, retry]);

  const empty = tab === 'transactions' ? transactions.length === 0 : operations.length === 0;

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-4 space-y-4">
      <header className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Address</h1>
        <p className="mt-2 break-all font-mono text-sm text-[var(--text-primary)]">{accountId}</p>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">Current account state is unavailable. Historical activity may still be available.</p>
      </header>
      <GliderTabs tabs={[{ id: 'transactions', label: 'Transactions' }, { id: 'operations', label: 'Operations' }]}
        activeId={tab} onChange={(selected: HistoryTab) => {
          if (selected === tab) return;
          setLoading(true);
          setError(null);
          setTab(selected);
          setCursor(null);
          setNextCursor(null);
        }} />
      {error && <div role="alert" className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-primary)]">
        <p>{error}</p>
        <button type="button" className="mt-3 rounded-lg border border-[var(--border-default)] px-3 py-2 focus-visible:outline-2" onClick={() => setRetry((value) => value + 1)}>Retry</button>
      </div>}
      <div className="space-y-2" aria-busy={loading}>
        {tab === 'transactions' ? transactions.map((transaction) => <CompactTransactionRow key={transaction.hash} transaction={transaction} />)
          : operations.map((operation) => <Link key={operation.id} href={`/transaction/${operation.transaction_hash}?op=${operation.id}`}
            className="block rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 hover:bg-[var(--bg-tertiary)] focus-visible:outline-2">
            <span className="block text-sm font-semibold text-[var(--text-primary)]">{getOperationTypeLabel(operation.type)}</span>
            <span className="text-xs font-mono text-[var(--text-muted)]">{shortenAddress(operation.id)} · {timeAgo(operation.created_at)}</span>
          </Link>)}
        {loading && <div role="status" aria-label="Loading account history" className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4"><InlineSkeleton width="w-48" /></div>}
        {!loading && !error && empty && <p className="p-4 text-sm text-[var(--text-muted)]">No {tab} returned for this address.</p>}
      </div>
      {!loading && !error && nextCursor && <button type="button" className="rounded-lg border border-[var(--border-default)] px-4 py-2 text-sm text-[var(--text-primary)] focus-visible:outline-2" onClick={() => setCursor(nextCursor)}>Load more</button>}
    </section>
  );
}
