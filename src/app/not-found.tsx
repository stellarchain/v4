import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--primary-blue)]/10 flex items-center justify-center">
          <svg className="w-10 h-10 text-[var(--primary-blue)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          Page Not Found
        </h1>

        <p className="text-[var(--text-secondary)] mb-4">
          The page you are looking for doesn&apos;t exist, or it may have moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-4 py-2 bg-[var(--primary-blue)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Go Home
          </Link>
          <Link
            href="/transactions"
            className="px-4 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-lg font-medium border border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            Browse Transactions
          </Link>
        </div>

        <div className="mt-4 text-xs text-[var(--text-muted)]">
          Try checking the URL, or start from the home page.
        </div>
      </div>
    </div>
  );
}

