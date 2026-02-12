import Link from 'next/link';
import { Transaction, shortenAddress, timeAgo } from '@/lib/stellar';
import { txRoute } from '@/lib/shared/routes';

interface TransactionCardProps {
  transaction: Transaction;
}

export default function TransactionCard({ transaction }: TransactionCardProps) {
  return (
    <Link
      href={txRoute(transaction.hash)}
      className="data-row block p-4 group"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`icon-container ${
            transaction.successful
              ? 'bg-[var(--success-muted)]'
              : 'bg-[var(--error-muted)]'
          }`}>
            {transaction.successful ? (
              <svg className="w-5 h-5 text-[var(--success)]" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-[var(--error)]" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-mono text-[var(--primary)] group-hover:text-[var(--primary-light)] transition-colors truncate">
              {shortenAddress(transaction.hash)}
            </p>
            <p className="text-[12px] text-[var(--text-tertiary)]">{timeAgo(transaction.created_at)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-4 text-[13px] shrink-0">
          <div className="text-right hidden sm:block">
            <p className="data-label">From</p>
            <p className="text-[var(--text-primary)] font-mono text-[12px]">
              {shortenAddress(transaction.source_account)}
            </p>
          </div>
          <div className="text-center">
            <p className="data-label">Ops</p>
            <p className="text-[var(--text-primary)] font-semibold">{transaction.operation_count}</p>
          </div>
          <div className="text-center hidden md:block">
            <p className="data-label">Ledger</p>
            <p className="text-[var(--text-primary)] font-mono">#{transaction.ledger_attr.toLocaleString()}</p>
          </div>
          <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-[color,transform]" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
