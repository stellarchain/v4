import { getOperations } from '@/lib/stellar';
import LiveOperationFeed from '@/components/LiveOperationFeed';

export const revalidate = 10;

export default async function OperationsPage() {
  const operationsResponse = await getOperations(25);
  const operations = operationsResponse._embedded.records;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-white tracking-tight">Operations</h1>
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse-soft" />
          </div>
          <p className="text-[#555] text-xs">Live feed of all operations on the Stellar network</p>
        </div>
      </div>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-4">
        <LiveOperationFeed initialOperations={operations} limit={25} />
      </div>

      <div className="flex justify-center">
        <button className="px-6 py-3 bg-[#111] border border-[#1a1a1a] rounded-xl text-white font-medium text-sm hover:bg-[#151515] hover:border-[#333] transition-all">
          Load More
        </button>
      </div>
    </div>
  );
}
