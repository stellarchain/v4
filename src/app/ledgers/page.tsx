import { getLedgers } from '@/lib/stellar';
import LiveLedgerFeed from '@/components/LiveLedgerFeed';

export const revalidate = 10;

export default async function LedgersPage() {
  const ledgersResponse = await getLedgers(25);
  const ledgers = ledgersResponse._embedded.records;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-[#BFF549]/20 to-[#BFF549]/5 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-[#BFF549]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-white tracking-tight">Ledgers</h1>
            <span className="w-1.5 h-1.5 bg-[#BFF549] rounded-full animate-pulse-soft" />
          </div>
          <p className="text-[#555] text-xs">Live feed of all ledgers on the Stellar network</p>
        </div>
      </div>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-4">
        <LiveLedgerFeed initialLedgers={ledgers} limit={25} />
      </div>

      <div className="flex justify-center">
        <button className="px-6 py-3 bg-[#111] border border-[#1a1a1a] rounded-xl text-white font-medium text-sm hover:bg-[#151515] hover:border-[#333] transition-all">
          Load More
        </button>
      </div>
    </div>
  );
}
