import Link from 'next/link';
import { Operation, shortenAddress, timeAgo, getOperationTypeLabel, formatXLM } from '@/lib/stellar';

interface OperationCardProps {
  operation: Operation;
}

export default function OperationCard({ operation }: OperationCardProps) {
  const getOperationDetails = () => {
    switch (operation.type) {
      case 'payment':
        return {
          detail: `${formatXLM(operation.amount || '0')} ${operation.asset_type === 'native' ? 'XLM' : operation.asset_code}`,
          from: operation.from,
          to: operation.to,
        };
      case 'create_account':
        return {
          detail: `${formatXLM(operation.starting_balance || '0')} XLM`,
          from: operation.funder,
          to: operation.account,
        };
      default:
        return {
          detail: null,
          from: operation.source_account,
          to: null,
        };
    }
  };

  const details = getOperationDetails();

  return (
    <Link
      href={`/transaction/${operation.transaction_hash}`}
      className="block bg-[var(--bg-secondary)] rounded-xl p-4 hover:bg-[var(--bg-tertiary)] transition-all group"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${operation.transaction_successful ? 'bg-[var(--info-muted)]' : 'bg-[var(--error-muted)]'
            }`}>
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-xl text-xs font-medium">
                {getOperationTypeLabel(operation)}
              </span>
              <span className={`px-2 py-0.5 rounded-xl text-xs font-medium ${operation.transaction_successful
                  ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                  : 'bg-red-500/10 text-red-400'
                }`}>
                {operation.transaction_successful ? 'Success' : 'Failed'}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">{timeAgo(operation.created_at)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 text-sm shrink-0">
          {details.detail && (
            <div className="text-right">
              <p className="text-[var(--text-muted)] text-xs">Amount</p>
              <p className="text-[var(--text-primary)] font-semibold">{details.detail}</p>
            </div>
          )}
          {details.from && (
            <div className="text-right hidden sm:block">
              <p className="text-[var(--text-muted)] text-xs">From</p>
              <p className="text-[var(--text-primary)] font-mono text-xs">{shortenAddress(details.from, 4)}</p>
            </div>
          )}
          {details.to && (
            <div className="text-right hidden md:block">
              <p className="text-[var(--text-muted)] text-xs">To</p>
              <p className="text-[var(--text-primary)] font-mono text-xs">{shortenAddress(details.to, 4)}</p>
            </div>
          )}
          <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
