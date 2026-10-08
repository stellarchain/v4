'use client';

import Link from 'next/link';
import GuideLayout from '@/components/guides/GuideLayout';
import Card from '@/components/ui/Card';

export default function LearnPage() {
  return (
    <GuideLayout title="Learn to read the explorer" description="Understand the main Stellar data types and use the explorer to inspect the evidence behind an activity.">
      <Card variant="bordered" className="p-5 md:p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Accounts and assets</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">A Stellar account has a public address, balances and settings. Classic assets are identified by their code and issuer; a matching code alone does not mean two assets are the same. Check the issuer when reviewing an asset.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/assets" className="inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-semibold text-[var(--info)] transition-colors hover:bg-[var(--info-muted)]">Browse assets →</Link>
          <a href="https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/accounts" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]">Stellar account documentation <span className="sr-only"> (opens in a new tab)</span> ↗</a>
        </div>
      </Card>
      <Card variant="bordered" className="p-5 md:p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Transactions, operations and ledgers</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">A transaction groups operations such as payments or trustline changes. Check its result and individual operations to understand what happened. A ledger records a network state update; its sequence helps locate the activity in time.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/transactions" className="inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-semibold text-[var(--info)] transition-colors hover:bg-[var(--info-muted)]">Explore transactions →</Link>
          <Link href="/ledgers" className="inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-semibold text-[var(--info)] transition-colors hover:bg-[var(--info-muted)]">Explore ledgers →</Link>
          <a href="https://developers.stellar.org/docs/learn/fundamentals/transactions" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]">Stellar transaction documentation <span className="sr-only"> (opens in a new tab)</span> ↗</a>
        </div>
      </Card>
      <Card variant="bordered" className="p-5 md:p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">History, coverage and labels</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Read the indexed range and metric description before comparing historical charts. An empty result can reflect coverage rather than an absence of activity. Directory labels and account assessments add context; inspect the underlying evidence before drawing conclusions.</p>
        <Link href="/statistics" className="mt-3 inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-semibold text-[var(--info)] transition-colors hover:bg-[var(--info-muted)]">Explore historical charts →</Link>
      </Card>
    </GuideLayout>
  );
}
