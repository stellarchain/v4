import Link from 'next/link';
import { Transaction, shortenAddress, timeAgo } from '@/lib/stellar';

interface TransactionCardProps {
  transaction: Transaction;
}

export default function TransactionCard({ transaction }: TransactionCardProps) {
  return (
    <Link
      href={`/transaction/${transaction.hash}`}
      className="block bg-[#111] rounded-xl p-4 hover:bg-[#151515] transition-all group"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            transaction.successful
              ? 'bg-[#1a2a1a]'
              : 'bg-[#2a1a1a]'
          }`}>
            {transaction.successful ? (
              <svg className="w-5 h-5 text-[#BFF549]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-mono text-[#BFF549] group-hover:text-white transition-colors truncate">
              {shortenAddress(transaction.hash, 8)}
            </p>
            <p className="text-xs text-[#555]">{timeAgo(transaction.created_at)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 text-sm shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-[#555] text-xs">From</p>
            <p className="text-white font-mono text-xs">
              {shortenAddress(transaction.source_account, 4)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[#555] text-xs">Ops</p>
            <p className="text-white font-semibold">{transaction.operation_count}</p>
          </div>
          <div className="text-center hidden md:block">
            <p className="text-[#555] text-xs">Ledger</p>
            <p className="text-white font-medium">#{transaction.ledger.toLocaleString()}</p>
          </div>
          <svg className="w-4 h-4 text-[#555] group-hover:text-[#BFF549] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
