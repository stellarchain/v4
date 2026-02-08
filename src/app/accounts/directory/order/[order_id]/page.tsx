'use client';

import Link from 'next/link';

export default function DirectoryOrderPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-4">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-4">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Order</h1>
        <p className="mt-2 text-sm text-[var(--text-tertiary)]">
          This route exists on stellarchain.io, but order-based directory flows are not implemented in this local app.
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            href="/accounts/directory"
            className="px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Account Directory
          </Link>
          <Link
            href="/accounts/directory/update"
            className="px-4 py-2 rounded-lg bg-[var(--info)] text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            Add Label
          </Link>
        </div>
      </div>
    </div>
  );
}

