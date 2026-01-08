import { getLedger, getLedgerTransactions, getLedgerOperations, formatDate, formatStroopsToXLM, formatXLM, timeAgo } from '@/lib/stellar';
import TransactionCard from '@/components/TransactionCard';
import OperationCard from '@/components/OperationCard';
import Link from 'next/link';

export const revalidate = 60;

interface LedgerPageProps {
  params: Promise<{ sequence: string }>;
}

export default async function LedgerPage({ params }: LedgerPageProps) {
  const { sequence } = await params;
  const sequenceNum = parseInt(sequence);

  const [ledger, transactionsResponse, operationsResponse] = await Promise.all([
    getLedger(sequenceNum),
    getLedgerTransactions(sequenceNum, 10),
    getLedgerOperations(sequenceNum, 10),
  ]);

  const transactions = transactionsResponse._embedded.records;
  const operations = operationsResponse._embedded.records;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Link
          href="/ledgers"
          className="w-10 h-10 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-tertiary)] hover:text-[var(--primary)] hover:border-[var(--border-default)] transition-colors flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[var(--text-primary)]">Ledger #{ledger.sequence.toLocaleString()}</h1>
              <p className="text-[var(--text-muted)] text-sm">{timeAgo(ledger.closed_at)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Info */}
        <div className="lg:col-span-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-sm p-6">
          <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">Overview</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-[var(--border-subtle)]">
              <span className="text-[var(--text-tertiary)]">Hash:</span>
              <span className="text-[var(--text-primary)] font-mono text-xs break-all text-right max-w-[60%]">{ledger.hash}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-[var(--border-subtle)]">
              <span className="text-[var(--text-tertiary)]">Closed At:</span>
              <span className="text-[var(--text-primary)]">{formatDate(ledger.closed_at)}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-[var(--border-subtle)]">
              <span className="text-[var(--text-tertiary)]">Transactions:</span>
              <div className="flex items-center gap-2">
                <span className="text-[var(--primary)] font-semibold">{ledger.successful_transaction_count} successful</span>
                {ledger.failed_transaction_count > 0 && (
                  <span className="text-red-400">/ {ledger.failed_transaction_count} failed</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-[var(--text-tertiary)]">Operations:</span>
              <span className="text-[var(--text-primary)] font-semibold">{ledger.operation_count}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-sm p-6">
          <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">Network Stats</h2>

          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <span className="text-[var(--text-muted)] text-xs">Total Coins</span>
              <span className="text-[var(--text-primary)] font-semibold">{formatXLM(ledger.total_coins)} XLM</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[var(--text-muted)] text-xs">Fee Pool</span>
              <span className="text-[var(--text-primary)] font-semibold">{formatXLM(ledger.fee_pool)} XLM</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[var(--text-muted)] text-xs">Protocol Version</span>
              <span className="text-[var(--text-primary)] font-semibold">v{ledger.protocol_version}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fee Details */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-sm p-6">
          <div className="flex flex-col gap-2">
            <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider">Base Fee</span>
            <span className="text-[var(--text-primary)] text-2xl font-bold">{formatStroopsToXLM(ledger.base_fee_in_stroops)}</span>
            <span className="text-[var(--text-muted)] text-xs">XLM</span>
          </div>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-sm p-6">
          <div className="flex flex-col gap-2">
            <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider">Base Reserve</span>
            <span className="text-[var(--text-primary)] text-2xl font-bold">{formatStroopsToXLM(ledger.base_reserve_in_stroops)}</span>
            <span className="text-[var(--text-muted)] text-xs">XLM</span>
          </div>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-sm p-6">
          <div className="flex flex-col gap-2">
            <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider">Max Tx Set Size</span>
            <span className="text-[var(--text-primary)] text-2xl font-bold">{ledger.max_tx_set_size}</span>
            <span className="text-[var(--text-muted)] text-xs">transactions</span>
          </div>
        </div>
      </div>

      {/* Previous Hash */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-sm p-6">
        <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">Previous Ledger Hash</h2>
        <Link
          href={`/ledger/${sequenceNum - 1}`}
          className="text-[var(--text-tertiary)] hover:text-[var(--primary)] font-mono text-sm break-all transition-colors"
        >
          {ledger.prev_hash}
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex justify-between gap-4">
        <Link
          href={`/ledger/${sequenceNum - 1}`}
          className="flex items-center gap-2 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-tertiary)] hover:text-[var(--primary)] hover:border-[var(--border-default)] transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Ledger</span> #{(sequenceNum - 1).toLocaleString()}
        </Link>
        <Link
          href={`/ledger/${sequenceNum + 1}`}
          className="flex items-center gap-2 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-tertiary)] hover:text-[var(--primary)] hover:border-[var(--border-default)] transition-all"
        >
          <span className="hidden sm:inline">Ledger</span> #{(sequenceNum + 1).toLocaleString()}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Transactions */}
      {transactions.length > 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-sm p-6">
          <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
            Transactions ({transactions.length})
          </h2>
          <div className="space-y-2">
            {transactions.map((tx) => (
              <TransactionCard key={tx.id} transaction={tx} />
            ))}
          </div>
        </div>
      )}

      {/* Operations */}
      {operations.length > 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-sm p-6">
          <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
            Operations ({operations.length})
          </h2>
          <div className="space-y-2">
            {operations.map((op) => (
              <OperationCard key={op.id} operation={op} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
