import { getLedgers } from '@/lib/stellar';
import LiveLedgerFeed from '@/components/LiveLedgerFeed';

export const revalidate = 10;

export default async function LedgersPage() {
  const ledgersResponse = await getLedgers(25);
  const ledgers = ledgersResponse._embedded.records;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Ledgers</h1>
            <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-pulse-soft" />
          </div>
          <p className="text-[var(--text-tertiary)] text-[13px]">Live feed of all ledgers on the Stellar network</p>
        </div>
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-4">
        <LiveLedgerFeed initialLedgers={ledgers} limit={25} />
      </div>

      <div className="flex justify-center">
        <button className="px-6 py-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] font-medium text-sm hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-default)] transition-all">
          Load More
        </button>
      </div>
    </div>
  );
}
