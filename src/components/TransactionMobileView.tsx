'use client';

import { useState } from 'react';
import Link from 'next/link';
import { shortenAddress, timeAgo, getOperationTypeLabel, formatDate } from '@/lib/stellar';

interface Operation {
  id: string;
  type: string;
  source_account: string;
  transaction_successful: boolean;
  created_at: string;
  amount?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  to?: string;
  from?: string;
  starting_balance?: string;
  [key: string]: unknown;
}

interface Effect {
  id: string;
  type: string;
  account: string;
  amount?: string;
  asset_type?: string;
  asset_code?: string;
}

interface TransactionData {
  hash: string;
  source_account: string;
  source_account_sequence?: string;
  successful: boolean;
  created_at: string;
  ledger: number;
  operation_count: number;
  fee_charged: string;
  max_fee: string;
  memo?: string;
  memo_type: string;
  signatures: string[];
  envelope_xdr: string;
  result_xdr: string;
  result_meta_xdr?: string;
  fee_meta_xdr?: string;
}

interface TransactionMobileViewProps {
  transaction: TransactionData;
  operations: Operation[];
  effects: Effect[];
}

export default function TransactionMobileView({ transaction, operations, effects }: TransactionMobileViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'operations' | 'effects' | 'details' | 'raw'>('overview');
  const [copied, setCopied] = useState(false);

  // Find the primary transfer operation (payment, create_account, etc.)
  const primaryOp = operations.find(op =>
    op.type === 'payment' ||
    op.type === 'create_account' ||
    op.type === 'path_payment_strict_send' ||
    op.type === 'path_payment_strict_receive'
  );

  // Check if this is a transfer transaction (has amount and destination)
  const isTransfer = primaryOp && primaryOp.amount && primaryOp.to;

  const handleCopy = () => {
    navigator.clipboard.writeText(transaction.hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const feeXLM = (parseInt(transaction.fee_charged) / 10000000).toFixed(7);

  return (
    <div className="w-full bg-[var(--bg-primary)] min-h-screen pb-20 font-sans">
      <div className="w-full pt-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-2 px-4">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Transaction</h1>
          <Link
            href="/transactions"
            className="flex items-center gap-1 text-[var(--text-tertiary)] font-medium text-sm hover:text-[var(--text-primary)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
        </div>

        {/* Timestamp */}
        <div className="px-4 mb-6">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-mono">{formatDate(transaction.created_at)}</span>
            <span className="text-gray-400">•</span>
            <span>{timeAgo(transaction.created_at)}</span>
          </div>
        </div>

        {/* Conditional Layout: Transfer vs Non-Transfer */}
        {isTransfer ? (
          // TRANSFER LAYOUT: Two-card design
          <div className="relative space-y-2">
            {/* FROM Card - Mint Green */}
            <div className="bg-[#D1FAE5] rounded-[32px] p-6 pb-10 relative z-10 transition-transform shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 bg-white/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] text-white font-bold">
                    F
                  </div>
                  <span className="text-sm font-semibold text-emerald-900">From Account</span>
                  <svg className="w-3 h-3 text-emerald-800" fill="none" strokeWidth={2.5} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </div>
                {primaryOp?.amount && (
                  <div className="bg-white/60 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-900 shadow-sm">
                    {primaryOp?.asset_type === 'native' ? 'XLM' : primaryOp?.asset_code || 'XLM'}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-end px-1">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-emerald-950 tracking-tighter">
                      {parseFloat(primaryOp.amount!).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </span>
                    <span className="text-emerald-800/60 font-medium text-sm">~ sent</span>
                  </div>
                  <div className="mt-1">
                    <Link href={`/account/${transaction.source_account}`} className="text-sm font-mono text-emerald-800/70 hover:text-emerald-950 transition-colors flex items-center gap-1">
                      {shortenAddress(transaction.source_account, 8)}
                    </Link>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-xl font-bold text-emerald-900">
                    {primaryOp?.asset_type === 'native' ? 'XLM' : primaryOp?.asset_code || 'XLM'}
                  </span>
                </div>
              </div>
            </div>

            {/* Floating Connector */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <div className="w-10 h-10 bg-black text-white rounded-xl shadow-xl flex items-center justify-center border-[3px] border-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </div>
            </div>

            {/* TO Card - Cream Yellow */}
            <div className="bg-[#FEF9C3] rounded-[32px] p-6 pt-10 relative z-0 transition-transform -mt-5 shadow-sm">
              <div className="flex justify-between items-start mb-4 pt-1">
                <div className="flex items-center gap-2 bg-white/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
                  <div className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center text-[8px] text-white font-bold">
                    T
                  </div>
                  <span className="text-sm font-semibold text-yellow-900">To Destination</span>
                  <svg className="w-3 h-3 text-yellow-800" fill="none" strokeWidth={2.5} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </div>
                {primaryOp?.amount && (
                  <div className="bg-white/60 px-3 py-1.5 rounded-full text-xs font-bold text-yellow-900 shadow-sm">
                    {primaryOp?.asset_type === 'native' ? 'XLM' : primaryOp?.asset_code || 'XLM'}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-end px-1 pb-1">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-yellow-950 tracking-tighter">
                      {parseFloat(primaryOp!.amount!).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </span>
                  </div>
                  <div className="mt-1">
                    <Link href={`/account/${primaryOp!.to}`} className="text-sm font-mono text-yellow-900/70 hover:text-yellow-950 transition-colors">
                      {shortenAddress(primaryOp!.to!, 8)}
                    </Link>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-xl font-bold text-yellow-900">
                    {primaryOp?.asset_type === 'native' ? 'XLM' : primaryOp?.asset_code || 'XLM'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // NON-TRANSFER LAYOUT: Single card design
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-[32px] p-8 shadow-sm border border-slate-200">
              <div className="mb-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Transaction Type</h3>
                  <p className="text-xl font-bold text-slate-900 capitalize mt-0.5">
                    {operations.length === 1
                      ? getOperationTypeLabel(operations[0].type)
                      : `${transaction.operation_count} Operations`
                    }
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">Source Account</span>
                  <Link href={`/account/${transaction.source_account}`} className="text-sm font-mono font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                    {shortenAddress(transaction.source_account, 8)}
                  </Link>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">Operations</span>
                  <span className="text-sm font-bold text-slate-900">{transaction.operation_count}</span>
                </div>
                {operations[0]?.type && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-600">Primary Type</span>
                    <span className="text-sm font-bold text-slate-900 capitalize">{getOperationTypeLabel(operations[0].type)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status Button */}
        <div className="mt-6">
          <div className={`w-full py-4 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${transaction.successful ? 'bg-black' : 'bg-red-600'
            }`}>
            {transaction.successful ? 'Transaction Successful' : 'Transaction Failed'}
          </div>
        </div>

        {/* Details List */}
        <div className="mt-8 space-y-4 px-4">
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-500 font-medium">Network Fee</span>
            <span className="font-bold text-gray-900">{feeXLM} XLM</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8">
          <div className="flex gap-4 border-b border-gray-100 pb-2 mb-4 px-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('operations')}
              className={`pb-2 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'operations' ? 'text-black border-b-2 border-black' : 'text-gray-400'}`}
            >
              Operations
            </button>
            <button
              onClick={() => setActiveTab('effects')}
              className={`pb-2 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'effects' ? 'text-black border-b-2 border-black' : 'text-gray-400'}`}
            >
              Effects
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-2 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'details' ? 'text-black border-b-2 border-black' : 'text-gray-400'}`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`pb-2 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'raw' ? 'text-black border-b-2 border-black' : 'text-gray-400'}`}
            >
              Raw Data
            </button>
          </div>

          <div className="min-h-[100px] px-4">
            {activeTab === 'operations' && (
              <div className="space-y-2">
                {operations.map((op, idx) => (
                  <div key={op.id} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[10px] font-bold shadow-sm">{idx + 1}</span>
                        <span className="text-sm font-semibold text-gray-900 capitalize">{getOperationTypeLabel(op.type)}</span>
                      </div>
                      {op.amount && (
                        <span className="text-sm font-bold text-gray-900">
                          {parseFloat(op.amount).toLocaleString(undefined, { maximumFractionDigits: 7 })}
                          {' '}
                          {op.asset_type === 'native' ? 'XLM' : op.asset_code || 'XLM'}
                        </span>
                      )}
                    </div>
                    {(op.from || op.to) && (
                      <div className="flex items-center gap-2 text-xs font-mono text-gray-500 ml-7">
                        {op.from && (
                          <Link href={`/account/${op.from}`} className="hover:text-gray-900 transition-colors">
                            {shortenAddress(op.from, 6)}
                          </Link>
                        )}
                        {op.from && op.to && (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        )}
                        {op.to && (
                          <Link href={`/account/${op.to}`} className="hover:text-gray-900 transition-colors">
                            {shortenAddress(op.to, 6)}
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'effects' && (
              <div className="space-y-2">
                {effects.map((ef) => (
                  <div key={ef.id} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-sm font-semibold text-gray-900 capitalize">
                        {ef.type.replace(/_/g, ' ')}
                      </span>
                      {ef.amount && (
                        <span className="text-sm font-bold text-gray-900">
                          {parseFloat(ef.amount).toLocaleString(undefined, { maximumFractionDigits: 7 })}
                          {ef.asset_type === 'native' ? ' XLM' : ef.asset_code ? ` ${ef.asset_code}` : ''}
                        </span>
                      )}
                    </div>
                    {ef.account && (
                      <Link
                        href={`/account/${ef.account}`}
                        className="text-xs font-mono text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1"
                      >
                        {shortenAddress(ef.account, 6)}
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </Link>
                    )}
                  </div>
                ))}
                {effects.length === 0 && <span className="text-gray-400 text-sm">No effects</span>}
              </div>
            )}

            {activeTab === 'details' && (
              <div className="space-y-3">
                {/* Transaction Hash */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex justify-between items-start gap-3">
                    <span className="text-sm font-semibold text-gray-600">Transaction Hash</span>
                    <button
                      onClick={handleCopy}
                      className="text-xs font-mono text-gray-900 hover:text-black transition-colors text-right break-all flex items-center gap-1"
                    >
                      {shortenAddress(transaction.hash, 12)}
                      {copied ? (
                        <svg className="w-3.5 h-3.5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Ledger */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-600">Ledger</span>
                    <Link href={`/ledger/${transaction.ledger}`} className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors">
                      #{transaction.ledger.toLocaleString()}
                    </Link>
                  </div>
                </div>

                {/* Sequence Number */}
                {transaction.source_account_sequence && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-600">Sequence Number</span>
                      <span className="text-sm font-mono font-bold text-gray-900">{transaction.source_account_sequence}</span>
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex justify-between items-start gap-3">
                    <span className="text-sm font-semibold text-gray-600">Timestamp</span>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">{formatDate(transaction.created_at)}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{timeAgo(transaction.created_at)}</div>
                    </div>
                  </div>
                </div>

                {/* Fees */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-600">Fee Charged</span>
                      <span className="text-sm font-bold text-gray-900">{feeXLM} XLM</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Max Fee</span>
                      <span className="text-xs font-mono text-gray-700">
                        {(parseInt(transaction.max_fee) / 10000000).toFixed(7)} XLM
                      </span>
                    </div>
                  </div>
                </div>

                {/* Memo */}
                {transaction.memo && transaction.memo_type !== 'none' && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-sm font-semibold text-gray-600">Memo ({transaction.memo_type})</span>
                      <span className="text-sm font-mono text-gray-900 break-all text-right">{transaction.memo}</span>
                    </div>
                  </div>
                )}

                {/* Signatures */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-gray-600">Signatures</span>
                    <span className="text-xs bg-white px-2 py-1 rounded-full font-bold text-gray-900">
                      {transaction.signatures.length}
                    </span>
                  </div>
                  {transaction.signatures.length > 0 && (
                    <div className="space-y-1.5 mt-3">
                      {transaction.signatures.map((sig, idx) => (
                        <div key={idx} className="text-[10px] font-mono text-gray-500 break-all bg-white p-2 rounded">
                          {sig}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Operations Count */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-600">Total Operations</span>
                    <span className="text-sm font-bold text-gray-900">{transaction.operation_count}</span>
                  </div>
                </div>

                {/* Transaction Size (XDR) */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-600">Transaction Size</span>
                    <span className="text-sm font-bold text-gray-900">
                      {Math.round(transaction.envelope_xdr.length * 0.75).toLocaleString()} bytes
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'raw' && (
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-xs font-semibold text-gray-600 mb-2">Envelope XDR</div>
                  <p className="font-mono text-[10px] text-gray-500 break-all">{transaction.envelope_xdr}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-xs font-semibold text-gray-600 mb-2">Result XDR</div>
                  <p className="font-mono text-[10px] text-gray-500 break-all">{transaction.result_xdr}</p>
                </div>
                {transaction.result_meta_xdr && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs font-semibold text-gray-600 mb-2">Result Meta XDR</div>
                    <p className="font-mono text-[10px] text-gray-500 break-all">{transaction.result_meta_xdr}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
