import { getLedgers, getTransactions, getOperations, getNetworkStats, formatXLM, formatStroopsToXLM } from '@/lib/stellar';
import StatsCard from '@/components/StatsCard';
import LiveLedgerFeed from '@/components/LiveLedgerFeed';
import LiveTransactionFeed from '@/components/LiveTransactionFeed';
import LiveOperationFeed from '@/components/LiveOperationFeed';
import Link from 'next/link';

export const revalidate = 10;

export default async function HomePage() {
  const [stats, ledgersResponse, transactionsResponse, operationsResponse] = await Promise.all([
    getNetworkStats(),
    getLedgers(8),
    getTransactions(8),
    getOperations(8),
  ]);

  const ledgers = ledgersResponse._embedded.records;
  const transactions = transactionsResponse._embedded.records;
  const operations = operationsResponse._embedded.records;

  return (
    <div className="space-y-6 w-full">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">
            Stellar Explorer
          </h1>
          <p className="text-[13px] text-[var(--text-tertiary)] mt-1">
            Real-time blockchain analytics and monitoring
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg">
          <span className="live-indicator" />
          <span className="text-[12px] text-[var(--text-secondary)] font-medium">Live</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Latest Ledger"
          value={`#${stats.ledger_count.toLocaleString()}`}
          subtitle={`Protocol v${stats.protocol_version}`}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
        <StatsCard
          title="Total XLM"
          value={formatXLM(stats.total_coins)}
          subtitle="In circulation"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Base Fee"
          value={`${formatStroopsToXLM(stats.base_fee)} XLM`}
          subtitle={`${stats.base_fee.toLocaleString()} stroops`}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <StatsCard
          title="Base Reserve"
          value={`${formatStroopsToXLM(stats.base_reserve)} XLM`}
          subtitle="Min balance"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
      </div>

      {/* Recent Ledgers */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className="section-header">Recent Ledgers</span>
            <span className="live-indicator" />
          </div>
          <Link
            href="/ledgers"
            className="text-[var(--text-tertiary)] hover:text-[var(--primary)] text-[12px] font-medium flex items-center gap-1 transition-colors"
          >
            View all
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        <LiveLedgerFeed initialLedgers={ledgers} limit={8} />
      </section>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="section-header">Recent Transactions</span>
              <span className="live-indicator" />
            </div>
            <Link
              href="/transactions"
              className="text-[var(--text-tertiary)] hover:text-[var(--primary)] text-[12px] font-medium flex items-center gap-1 transition-colors"
            >
              View all
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <LiveTransactionFeed initialTransactions={transactions} limit={8} />
        </section>

        {/* Recent Operations */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="section-header">Recent Operations</span>
              <span className="live-indicator" />
            </div>
            <Link
              href="/operations"
              className="text-[var(--text-tertiary)] hover:text-[var(--primary)] text-[12px] font-medium flex items-center gap-1 transition-colors"
            >
              View all
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <LiveOperationFeed initialOperations={operations} limit={8} />
        </section>
      </div>
    </div>
  );
}
