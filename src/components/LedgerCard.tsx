import Link from 'next/link';
import { Ledger, timeAgo } from '@/lib/stellar';

interface LedgerCardProps {
  ledger: Ledger;
}

export default function LedgerCard({ ledger }: LedgerCardProps) {
  return (
    <Link
      href={`/ledger/${ledger.sequence}`}
      className="block bg-[#111] border border-[#1a1a1a] p-4 hover:border-[#333] transition-all group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#1a1a1a] flex items-center justify-center group-hover:bg-[#222] transition-colors">
            <svg className="w-6 h-6 text-[#99A1AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-white group-hover:text-[#BFF549] transition-colors">
              #{ledger.sequence.toLocaleString()}
            </p>
            <p className="text-sm text-[#666]">{timeAgo(ledger.closed_at)}</p>
          </div>
        </div>

        <div className="flex items-center gap-8 text-sm">
          <div className="text-center">
            <p className="text-[#666]">Transactions</p>
            <p className="text-white font-medium">
              <span className="text-[#BFF549]">{ledger.successful_transaction_count}</span>
              {ledger.failed_transaction_count > 0 && (
                <span className="text-red-400 ml-1">/ {ledger.failed_transaction_count}</span>
              )}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[#666]">Operations</p>
            <p className="text-white font-medium">{ledger.operation_count}</p>
          </div>
          <div className="text-center hidden sm:block">
            <p className="text-[#666]">Protocol</p>
            <p className="text-white font-medium">v{ledger.protocol_version}</p>
          </div>
        </div>

        <svg className="w-5 h-5 text-[#666] group-hover:text-[#BFF549] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
