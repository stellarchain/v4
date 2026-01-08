import { getTransaction, getTransactionOperations, getTransactionEffects, formatDate, shortenAddress, getOperationTypeLabel, timeAgo } from '@/lib/stellar';
import Link from 'next/link';
import DecodedParams from '@/components/DecodedParams';

export const revalidate = 60;

interface TransactionPageProps {
  params: Promise<{ hash: string }>;
}

export default async function TransactionPage({ params }: TransactionPageProps) {
  const { hash } = await params;

  const [transaction, operationsResponse, effectsResponse] = await Promise.all([
    getTransaction(hash),
    getTransactionOperations(hash, 20),
    getTransactionEffects(hash, 20),
  ]);

  const operations = operationsResponse._embedded.records;
  const effects = effectsResponse._embedded.records;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Link
          href="/transactions"
          className="w-10 h-10 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-[var(--text-tertiary)] hover:text-[var(--primary)] hover:border-[var(--border-default)] transition-colors flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`w-10 h-10 rounded flex items-center justify-center ${transaction.successful
              ? 'bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5'
              : 'bg-gradient-to-br from-red-500/20 to-red-500/5'
              }`}>
              {transaction.successful ? (
                <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-[var(--text-primary)]">Transaction</h1>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${transaction.successful
                  ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                  : 'bg-red-500/10 text-red-400'
                  }`}>
                  {transaction.successful ? 'Success' : 'Failed'}
                </span>
              </div>
              <p className="text-[var(--text-muted)] text-sm">{timeAgo(transaction.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-[var(--text-tertiary)] font-mono text-sm break-all">{hash}</p>
            <button className="p-1.5 hover:bg-[var(--bg-hover)] rounded transition-colors group" title="Copy hash">
              <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
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
              <span className="text-[var(--text-tertiary)]">Source Account:</span>
              <Link
                href={`/account/${transaction.source_account}`}
                className="text-[var(--primary)] hover:underline font-mono text-sm"
              >
                {shortenAddress(transaction.source_account, 8)}
              </Link>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-[var(--border-subtle)]">
              <span className="text-[var(--text-tertiary)]">Ledger:</span>
              <Link
                href={`/ledger/${transaction.ledger}`}
                className="text-[var(--primary)] hover:underline font-semibold"
              >
                #{transaction.ledger.toLocaleString()}
              </Link>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-[var(--border-subtle)]">
              <span className="text-[var(--text-tertiary)]">Created At:</span>
              <span className="text-[var(--text-primary)]">{formatDate(transaction.created_at)}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-[var(--text-tertiary)]">Memo:</span>
              <span className="text-[var(--text-primary)] capitalize">
                {transaction.memo || <span className="text-[var(--text-muted)]">{transaction.memo_type}</span>}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-sm p-6">
          <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">Details</h2>

          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <span className="text-[var(--text-muted)] text-xs">Operations</span>
              <span className="text-[var(--text-primary)] text-2xl font-bold">{transaction.operation_count}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[var(--text-muted)] text-xs">Fee Charged</span>
              <span className="text-[var(--text-primary)] font-semibold">
                {(parseInt(transaction.fee_charged) / 10000000).toFixed(7)} XLM
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[var(--text-muted)] text-xs">Max Fee</span>
              <span className="text-[var(--text-tertiary)] font-semibold">
                {(parseInt(transaction.max_fee) / 10000000).toFixed(7)} XLM
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-sm p-6">
        <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
          Signatures ({transaction.signatures.length})
        </h2>
        <div className="space-y-2">
          {transaction.signatures.map((sig, idx) => (
            <div key={idx} className="bg-[var(--bg-secondary)] rounded p-3">
              <p className="text-[var(--text-tertiary)] font-mono text-xs break-all">{sig}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Operations */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-sm p-6">
        <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
          Operations ({operations.length})
        </h2>
        <div className="space-y-3">
          {operations.map((op, idx) => (
            <div
              key={op.id}
              className="bg-[var(--bg-secondary)] rounded p-4 hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-[var(--bg-tertiary)] rounded flex items-center justify-center text-[var(--primary)] text-sm font-bold">
                    {idx + 1}
                  </span>
                  <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs font-medium">
                    {getOperationTypeLabel(op.type)}
                  </span>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${op.transaction_successful
                  ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                  : 'bg-red-500/10 text-red-400'
                  }`}>
                  {op.transaction_successful ? 'Success' : 'Failed'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[var(--text-muted)] text-xs mb-1">Source Account</p>
                  <Link
                    href={`/account/${op.source_account}`}
                    className="text-[var(--text-tertiary)] hover:text-[var(--primary)] font-mono text-xs"
                  >
                    {shortenAddress(op.source_account, 8)}
                  </Link>
                </div>
                {op.to && (
                  <div>
                    <p className="text-[var(--text-muted)] text-xs mb-1">To</p>
                    <Link
                      href={`/account/${op.to}`}
                      className="text-[var(--text-tertiary)] hover:text-[var(--primary)] font-mono text-xs"
                    >
                      {shortenAddress(op.to as string, 8)}
                    </Link>
                  </div>
                )}
                {op.amount && (
                  <div>
                    <p className="text-[var(--text-muted)] text-xs mb-1">Amount</p>
                    <p className="text-[var(--text-primary)] font-semibold">
                      {op.amount} {op.asset_type === 'native' ? 'XLM' : op.asset_code}
                    </p>
                  </div>
                )}
                {op.starting_balance && (
                  <div>
                    <p className="text-[var(--text-muted)] text-xs mb-1">Starting Balance</p>
                    <p className="text-[var(--text-primary)] font-semibold">{op.starting_balance} XLM</p>
                  </div>
                )}
              </div>
              <DecodedParams operation={op} />
            </div>
          ))}
        </div>
      </div>

      {/* Effects */}
      {effects.length > 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-sm p-6">
          <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
            Effects ({effects.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {effects.map((effect) => (
              <div
                key={effect.id}
                className="bg-[var(--bg-secondary)] rounded p-4 hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-xs font-medium capitalize">
                    {effect.type.replace(/_/g, ' ')}
                  </span>
                </div>
                <Link
                  href={`/account/${effect.account}`}
                  className="text-[var(--text-tertiary)] hover:text-[var(--primary)] font-mono text-xs"
                >
                  {shortenAddress(effect.account, 8)}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* XDR Data */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl shadow-sm p-6">
        <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">Raw Data</h2>
        <div className="space-y-4">
          <div>
            <p className="text-[var(--text-muted)] text-xs mb-2">Envelope XDR</p>
            <div className="bg-[var(--bg-secondary)] rounded p-3 max-h-24 overflow-auto">
              <p className="text-[var(--text-tertiary)] font-mono text-xs break-all">
                {transaction.envelope_xdr}
              </p>
            </div>
          </div>
          <div>
            <p className="text-[var(--text-muted)] text-xs mb-2">Result XDR</p>
            <div className="bg-[var(--bg-secondary)] rounded p-3 max-h-24 overflow-auto">
              <p className="text-[var(--text-tertiary)] font-mono text-xs break-all">
                {transaction.result_xdr}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
