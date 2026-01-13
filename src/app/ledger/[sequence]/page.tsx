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
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-sm p-4 md:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/ledgers"
              className="w-9 h-9 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-tertiary)] hover:text-[var(--primary)] hover:border-[var(--border-default)] transition-colors flex items-center justify-center"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">
                Ledger #{ledger.sequence.toLocaleString()}
              </h1>
              <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                <span>{formatDate(ledger.closed_at)}</span>
                <span className="w-1 h-1 rounded-full bg-[var(--border-subtle)]" />
                <span>{timeAgo(ledger.closed_at)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:ml-auto">
            <span className="badge badge-primary text-[10px] px-2 py-0.5">Protocol v{ledger.protocol_version}</span>
            <span className="badge badge-info text-[10px] px-2 py-0.5">{ledger.operation_count} ops</span>
            <span className="badge badge-success text-[10px] px-2 py-0.5">{ledger.successful_transaction_count} success</span>
            {ledger.failed_transaction_count > 0 && (
              <span className="badge badge-error text-[10px] px-2 py-0.5">{ledger.failed_transaction_count} failed</span>
            )}
          </div>
        </div>

        <div className="mt-4 grid sm:grid-cols-3 gap-3">
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl p-3">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">Base Fee</div>
            <div className="text-lg font-semibold text-[var(--text-primary)] mt-1">{formatStroopsToXLM(ledger.base_fee_in_stroops)} XLM</div>
          </div>
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl p-3">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">Base Reserve</div>
            <div className="text-lg font-semibold text-[var(--text-primary)] mt-1">{formatStroopsToXLM(ledger.base_reserve_in_stroops)} XLM</div>
          </div>
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl p-3">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">Max Tx Set Size</div>
            <div className="text-lg font-semibold text-[var(--text-primary)] mt-1">{ledger.max_tx_set_size}</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-5">
        <div className="space-y-5">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Overview</h2>
              <span className="text-[11px] text-[var(--text-muted)] font-mono">#{ledger.sequence.toLocaleString()}</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-2.5">
                <span className="data-label">Hash</span>
                <span className="text-[var(--text-primary)] font-mono text-xs break-all text-right max-w-[65%]">{ledger.hash}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-2.5">
                <span className="data-label">Closed At</span>
                <span className="text-[var(--text-primary)] text-xs">{formatDate(ledger.closed_at)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-2.5">
                <span className="data-label">Transactions</span>
                <div className="text-xs text-[var(--text-primary)]">
                  <span className="text-[var(--primary)] font-semibold">{ledger.successful_transaction_count} successful</span>
                  {ledger.failed_transaction_count > 0 && (
                    <span className="text-[var(--error)] ml-2">{ledger.failed_transaction_count} failed</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="data-label">Operations</span>
                <span className="text-[var(--text-primary)] text-sm font-semibold">{ledger.operation_count}</span>
              </div>
            </div>
          </div>

          {transactions.length > 0 && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Transactions ({transactions.length})
                </h2>
                <span className="text-[11px] text-[var(--text-muted)]">Latest 10</span>
              </div>
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <TransactionCard key={tx.id} transaction={tx} />
                ))}
              </div>
            </div>
          )}

          {operations.length > 0 && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Operations ({operations.length})
                </h2>
                <span className="text-[11px] text-[var(--text-muted)]">Latest 10</span>
              </div>
              <div className="space-y-2">
                {operations.map((op) => (
                  <OperationCard key={op.id} operation={op} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-sm p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Supply & Fees</h2>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="data-label">Total Coins</span>
                <span className="text-xs font-semibold text-[var(--text-primary)]">{formatXLM(ledger.total_coins)} XLM</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="data-label">Fee Pool</span>
                <span className="text-xs font-semibold text-[var(--text-primary)]">{formatXLM(ledger.fee_pool)} XLM</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="data-label">Protocol</span>
                <span className="text-xs font-semibold text-[var(--text-primary)]">v{ledger.protocol_version}</span>
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-sm p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Previous Ledger</h2>
            <Link
              href={`/ledger/${sequenceNum - 1}`}
              className="text-[var(--text-tertiary)] hover:text-[var(--primary)] font-mono text-[11px] break-all transition-colors"
            >
              {ledger.prev_hash}
            </Link>
          </div>

          <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-sm p-3 flex flex-col gap-2.5">
            <Link
              href={`/ledger/${sequenceNum - 1}`}
              className="flex items-center justify-between px-3 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-tertiary)] hover:text-[var(--primary)] hover:border-[var(--border-default)] transition-all"
            >
              <span className="flex items-center gap-2 text-xs font-medium">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous Ledger
              </span>
              <span className="text-[11px] font-mono">#{(sequenceNum - 1).toLocaleString()}</span>
            </Link>
            <Link
              href={`/ledger/${sequenceNum + 1}`}
              className="flex items-center justify-between px-3 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-tertiary)] hover:text-[var(--primary)] hover:border-[var(--border-default)] transition-all"
            >
              <span className="flex items-center gap-2 text-xs font-medium">
                Next Ledger
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
              <span className="text-[11px] font-mono">#{(sequenceNum + 1).toLocaleString()}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
