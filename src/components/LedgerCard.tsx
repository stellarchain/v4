import Link from 'next/link';
import { Ledger, timeAgo } from '@/lib/stellar';

interface LedgerCardProps {
  ledger: Ledger;
}

export default function LedgerCard({ ledger }: LedgerCardProps) {
  return (
    <Link
      href={`/ledger/${ledger.sequence}`}
      className="data-row block p-4 group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="icon-container">
            <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold font-mono text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
              #{ledger.sequence.toLocaleString()}
            </p>
            <p className="text-[12px] text-[var(--text-tertiary)]">{timeAgo(ledger.closed_at)}</p>
          </div>
        </div>

        <div className="flex items-center gap-8 text-[13px]">
          <div className="text-center">
            <p className="data-label">Transactions</p>
            <p className="text-[var(--text-primary)] font-mono">
              <span className="text-[var(--primary)] font-medium">{ledger.successful_transaction_count}</span>
              {ledger.failed_transaction_count > 0 && (
                <span className="text-[var(--error)] ml-1">/ {ledger.failed_transaction_count}</span>
              )}
            </p>
          </div>
          <div className="text-center">
            <p className="data-label">Operations</p>
            <p className="text-[var(--text-primary)] font-mono font-medium">{ledger.operation_count}</p>
          </div>
          <div className="text-center hidden sm:block">
            <p className="data-label">Protocol</p>
            <p className="text-[var(--text-primary)] font-mono">v{ledger.protocol_version}</p>
          </div>
        </div>

        <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
