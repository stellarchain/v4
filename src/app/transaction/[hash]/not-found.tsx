'use client';

import Link from 'next/link';
import { useNetwork } from '@/contexts/NetworkContext';

export default function TransactionNotFound() {
  const { networkConfig } = useNetwork();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--error)]/10 flex items-center justify-center">
          <svg className="w-10 h-10 text-[var(--error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          Transaction Not Found
        </h1>

        <p className="text-[var(--text-secondary)] mb-4">
          This transaction doesn&apos;t exist on{' '}
          <span
            className="font-semibold"
            style={{ color: networkConfig.color }}
          >
            {networkConfig.displayName}
          </span>.
        </p>

        <p className="text-sm text-[var(--text-muted)] mb-6">
          The transaction may exist on a different network, or the hash may be incorrect.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/transactions"
            className="px-4 py-2 bg-[var(--primary-blue)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            View Transactions
          </Link>
          <Link
            href="/"
            className="px-4 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-lg font-medium border border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
