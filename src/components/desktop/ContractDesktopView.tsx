'use client';

import { useState } from 'react';
import Link from 'next/link';
import { shortenAddress, timeAgo, getOperationTypeLabel } from '@/lib/stellar';
import type { TokenRegistryEntry, ContractVerification } from '@/lib/types/token';
import type { ContractMetadataResult, ContractAccessControlResult } from '@/lib/contractMetadata';
import type { NFTInfo, VaultInfo } from '@/lib/contractExtensions';
import { ParsedEvent, EventSummary, formatEventAmount, isTransferEventData, isMintEventData, isBurnEventData, isApproveEventData, isCustomEventData, CustomEventData } from '@/lib/eventParser';
import { ContractStorageResult } from '@/lib/contractStorage';

interface Operation {
  id: string;
  type: string;
  source_account: string;
  transaction_successful: boolean;
  created_at: string;
  amount?: string;
  asset_type?: string;
  asset_code?: string;
  to?: string;
  from?: string;
  transaction_hash?: string;
  [key: string]: unknown;
}

interface VerifiedContract {
  id: string;
  name: string;
  type: string;
  sep41?: boolean;
  symbol?: string;
  decimals?: number;
  verified: boolean;
  website?: string;
  description?: string;
  iconUrl?: string;
}

interface ContractData {
  id: string;
  account: any | null;
  tokenMetadata: TokenRegistryEntry | null;
  verifiedContract: VerifiedContract | undefined;
  isVerified: boolean;
  type: string;
  verification?: ContractVerification | null;
  contractMetadata?: ContractMetadataResult | null;
  accessControl?: ContractAccessControlResult | null;
  nftInfo?: NFTInfo | null;
  vaultInfo?: VaultInfo | null;
  events?: ParsedEvent[];
  eventSummary?: EventSummary | null;
  storage?: ContractStorageResult | null;
}

interface ContractDesktopViewProps {
  contract: ContractData;
  operations: Operation[];
}

export default function ContractDesktopView({ contract, operations }: ContractDesktopViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'operations' | 'events' | 'storage'>('overview');
  const [expandedStorageRows, setExpandedStorageRows] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);
  const [copiedWasm, setCopiedWasm] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(contract.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyWasm = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedWasm(true);
    setTimeout(() => setCopiedWasm(false), 2000);
  };

  const tokenInfo = contract.tokenMetadata || contract.verifiedContract;
  const isToken = contract.type === 'token' || contract.type === 'lending';
  const isNFT = contract.type === 'nft';
  const isVault = contract.type === 'vault';

  // Get a meaningful display name for the contract
  const getContractDisplayName = (): string => {
    // Check verified contract first
    if (contract.verifiedContract?.name) return contract.verifiedContract.name;

    // Check specific contract types
    if (contract.nftInfo?.name) return contract.nftInfo.name;
    if (contract.vaultInfo?.name) return contract.vaultInfo.name;

    // Check tokenMetadata but exclude placeholder "Unknown Token"
    if (tokenInfo?.name && tokenInfo.name !== 'Unknown Token') {
      return tokenInfo.name;
    }

    // Fallback to generic "Smart Contract"
    return 'Smart Contract';
  };

  const contractDisplayName = getContractDisplayName();

  const formatTokenAmount = (value?: string, digits = 7) => {
    if (!value) return '0';
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: digits });
  };

  // Helper to extract GitHub commit URL from source repo
  const getCommitUrl = (sourceRepo?: string, commitHash?: string) => {
    if (!sourceRepo || !commitHash) return null;
    // Extract GitHub repo URL and append commit
    const match = sourceRepo.match(/github\.com\/([^/]+\/[^/]+)/);
    if (match) {
      return `https://github.com/${match[1]}/commit/${commitHash}`;
    }
    return null;
  };

  // Decode contract function name from operation
  const decodeContractFunctionName = (op: Operation): string => {
    try {
      const parameters = op.parameters as Array<{ type: string; value: string }> | undefined;
      if (!parameters) return 'Contract Call';
      const symParam = parameters.find(p => p.type === 'Sym');
      if (!symParam) return 'Contract Call';
      const decoded = atob(symParam.value);
      const functionName = decoded.replace(/[^\x20-\x7E]/g, '').replace(/^[^a-zA-Z_]+/, '').trim();
      return functionName || 'Contract Call';
    } catch {
      return 'Contract Call';
    }
  };

  const getTypeIcon = () => {
    switch (contract.type) {
      case 'dex':
        return (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      case 'lending':
        return (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'token':
        return (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case 'nft':
        return (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'vault':
        return (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        );
    }
  };

  // Get source repo from verification or metadata
  const sourceRepo = contract.verification?.sourceRepo || contract.contractMetadata?.sourceRepo;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <div className="mx-auto max-w-[1600px] p-6 lg:p-8">
        {/* Header Card */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-start gap-4 min-w-0">
              <Link
                href="/"
                className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition hover:text-slate-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>

              {/* Contract Icon */}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                isToken ? 'bg-gradient-to-br from-indigo-500 to-purple-600' :
                isNFT ? 'bg-gradient-to-br from-pink-500 to-rose-600' :
                isVault ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
                'bg-gradient-to-br from-slate-600 to-slate-800'
              } text-white shadow-lg`}>
                {getTypeIcon()}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {contract.type === 'dex' ? 'DEX Contract' :
                     contract.type === 'lending' ? 'Lending Protocol' :
                     contract.type === 'nft' ? 'NFT Contract' :
                     contract.type === 'vault' ? 'Vault Contract' :
                     isToken ? 'Token Contract' : 'Smart Contract'}
                  </span>
                  {contract.isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Verified
                    </span>
                  )}
                  {/* Source Verified Badge */}
                  {contract.verification?.isVerified && (
                    <a
                      href={sourceRepo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      Source Verified
                    </a>
                  )}
                  {isToken && (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${
                      contract.tokenMetadata?.isSAC
                        ? 'bg-blue-50 text-blue-600 border-blue-100'
                        : 'bg-purple-50 text-purple-600 border-purple-100'
                    }`}>
                      {contract.tokenMetadata?.isSAC ? 'SAC' : 'SEP-41'}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {contractDisplayName}
                  {isToken && tokenInfo?.symbol && tokenInfo.name !== 'Unknown Token' && (
                    <span className="text-lg font-semibold text-slate-500 ml-2">({tokenInfo.symbol})</span>
                  )}
                  {isNFT && contract.nftInfo?.symbol && (
                    <span className="text-lg font-semibold text-slate-500 ml-2">({contract.nftInfo.symbol})</span>
                  )}
                  {isVault && contract.vaultInfo?.symbol && (
                    <span className="text-lg font-semibold text-slate-500 ml-2">({contract.vaultInfo.symbol})</span>
                  )}
                </h1>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="group flex items-center gap-2 text-left text-sm font-mono font-medium text-slate-500 hover:text-slate-700 mt-1"
                >
                  <span className="truncate">{contract.id}</span>
                  <svg className="h-4 w-4 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {copied && <span className="text-[10px] font-semibold text-emerald-500">Copied</span>}
                </button>
              </div>
            </div>

            {/* Website Button */}
            {contract.verifiedContract?.website && (
              <a
                href={contract.verifiedContract.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Visit Website
              </a>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 space-y-6">
            {/* Token Stats (if token) */}
            {isToken && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Symbol</div>
                  <div className="text-xl font-bold text-slate-900">{tokenInfo?.symbol || '???'}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Decimals</div>
                  <div className="text-xl font-bold text-slate-900">
                    {contract.tokenMetadata?.decimals ?? contract.verifiedContract?.decimals ?? 7}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Type</div>
                  <div className="text-xl font-bold text-slate-900">
                    {contract.tokenMetadata?.isSAC ? 'SAC' : 'SEP-41'}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Operations</div>
                  <div className="text-xl font-bold text-slate-900">{operations.length}</div>
                </div>
              </div>
            )}

            {/* NFT Stats */}
            {isNFT && contract.nftInfo && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Symbol</div>
                  <div className="text-xl font-bold text-slate-900">{contract.nftInfo.symbol || '???'}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Supply</div>
                  <div className="text-xl font-bold text-slate-900">
                    {contract.nftInfo.totalSupply !== undefined ? formatTokenAmount(String(contract.nftInfo.totalSupply), 0) : 'N/A'}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Type</div>
                  <div className="text-xl font-bold text-slate-900">NFT</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Operations</div>
                  <div className="text-xl font-bold text-slate-900">{operations.length}</div>
                </div>
              </div>
            )}

            {/* Vault Stats */}
            {isVault && contract.vaultInfo && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Assets</div>
                  <div className="text-xl font-bold text-slate-900">
                    {formatTokenAmount(contract.vaultInfo.totalAssets, 2)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Shares</div>
                  <div className="text-xl font-bold text-slate-900">
                    {formatTokenAmount(contract.vaultInfo.totalShares, 2)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Asset Address</div>
                  <div className="text-sm font-bold text-slate-900 font-mono truncate" title={contract.vaultInfo.underlyingAsset}>
                    {shortenAddress(contract.vaultInfo.underlyingAsset, 6)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Decimals Offset</div>
                  <div className="text-xl font-bold text-slate-900">{contract.vaultInfo.decimalsOffset}</div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="w-full border-b border-slate-200 flex gap-8 px-2">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'events', label: 'Events', count: contract.events?.length },
                { id: 'storage', label: 'Storage', count: contract.storage?.totalEntries },
              ].filter(tab => tab.id !== 'events' || (contract.events && contract.events.length > 0))
               .filter(tab => tab.id !== 'storage' || (contract.storage && contract.storage.totalEntries > 0))
               .map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`pb-3 text-sm font-bold transition-all flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-b-2 border-sky-500 text-sky-600'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{tab.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Description */}
                {contract.verifiedContract?.description && (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 mb-3">About</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{contract.verifiedContract.description}</p>
                  </div>
                )}

                {/* Recent Activity - Events for Contracts */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <h3 className="text-sm font-bold text-slate-800">Recent Activity</h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">{contract.events?.length || 0} events</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {!contract.events || contract.events.length === 0 ? (
                      <div className="p-6 text-center text-sm text-slate-400">No recent activity found</div>
                    ) : (
                      contract.events.slice(0, 10).map((event, idx) => {
                        // Get display name - use raw event name for custom events
                        const displayName = event.type !== 'unknown'
                          ? event.type
                          : (event.rawEventName || 'event');
                        const customData = isCustomEventData(event.data) ? event.data : null;
                        const subType = customData?.subType;

                        const eventContent = (
                          <div className="flex items-center gap-4">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                              event.type === 'transfer' ? 'bg-blue-100 text-blue-600' :
                              event.type === 'mint' ? 'bg-green-100 text-green-600' :
                              event.type === 'burn' ? 'bg-orange-100 text-orange-600' :
                              event.type === 'approve' ? 'bg-purple-100 text-purple-600' :
                              'bg-slate-100 text-slate-500'
                            }`}>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-bold text-slate-800">
                                  {displayName}{subType && <span className="text-slate-500 font-normal text-xs ml-1">· {subType}</span>}
                                </span>
                                {isTransferEventData(event.data) && (
                                  <span className="text-sm font-mono font-bold text-slate-900">
                                    {formatEventAmount(event.data.amount || '0', contract.tokenMetadata?.decimals || 7)}{' '}
                                    <span className="text-[10px] text-slate-500">{tokenInfo?.symbol || ''}</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                {event.timestamp && <span>{timeAgo(event.timestamp)}</span>}
                                {isTransferEventData(event.data) && (
                                  <>
                                    <span className="text-slate-300">|</span>
                                    <span className="font-mono">{shortenAddress(event.data.from, 4)} → {shortenAddress(event.data.to, 4)}</span>
                                  </>
                                )}
                                {customData?.account && (
                                  <>
                                    <span className="text-slate-300">|</span>
                                    <span className="font-mono">{shortenAddress(customData.account, 4)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );

                        return event.txHash ? (
                          <Link
                            key={idx}
                            href={`/transaction/${event.txHash}`}
                            className="block p-4 hover:bg-sky-50 transition-colors"
                          >
                            {eventContent}
                          </Link>
                        ) : (
                          <div key={idx} className="block p-4 hover:bg-slate-50 transition-colors">
                            {eventContent}
                          </div>
                        );
                      })
                    )}
                  </div>
                  {contract.events && contract.events.length > 10 && (
                    <button
                      onClick={() => setActiveTab('events')}
                      className="w-full border-t border-slate-100 py-3 text-center text-xs font-bold text-sky-600 hover:bg-slate-50 transition-colors rounded-b-xl"
                    >
                      View All {contract.events.length} Events
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Events Tab */}
            {activeTab === 'events' && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <h3 className="text-sm font-bold text-slate-800">Contract Events</h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                    {contract.events?.length || 0}
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {!contract.events || contract.events.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-400">No events found</div>
                  ) : (
                    contract.events.map((event, idx) => {
                      const getEventBadgeColor = (type: string) => {
                        switch (type) {
                          case 'transfer': return 'bg-blue-100 text-blue-700 border-blue-200';
                          case 'mint': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
                          case 'burn': return 'bg-rose-100 text-rose-700 border-rose-200';
                          case 'approve': return 'bg-amber-100 text-amber-700 border-amber-200';
                          case 'clawback': return 'bg-purple-100 text-purple-700 border-purple-200';
                          default: return 'bg-slate-100 text-slate-700 border-slate-200';
                        }
                      };

                      const decimals = contract.tokenMetadata?.decimals ?? contract.verifiedContract?.decimals ?? 7;

                      // Get display name - use raw event name for custom events
                      const displayName = event.type !== 'unknown'
                        ? event.type
                        : (event.rawEventName || 'event');
                      const customData = isCustomEventData(event.data) ? event.data : null;
                      const subType = customData?.subType;

                      const eventContent = (
                        <div className="flex items-start gap-4">
                          <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-mono text-slate-500 flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getEventBadgeColor(event.type)}`}>
                                {displayName}
                              </span>
                              {subType && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                                  {subType}
                                </span>
                              )}
                              {event.timestamp && (
                                <span className="text-[10px] text-slate-400">{timeAgo(event.timestamp)}</span>
                              )}
                              {event.txHash && (
                                <span className="text-[10px] text-sky-500 ml-auto">View Transaction →</span>
                              )}
                            </div>

                            {/* Event-specific display */}
                            {isTransferEventData(event.data) && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-slate-500">From:</span>
                                  <span className="font-mono text-slate-700">
                                    {shortenAddress(event.data.from, 6)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-slate-500">To:</span>
                                  <span className="font-mono text-slate-700">
                                    {shortenAddress(event.data.to, 6)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-slate-500">Amount:</span>
                                  <span className="font-mono font-semibold text-slate-800">
                                    {formatEventAmount(event.data.amount, decimals)}
                                    {tokenInfo?.symbol && <span className="text-slate-500 ml-1">{tokenInfo.symbol}</span>}
                                  </span>
                                </div>
                              </div>
                            )}

                            {isMintEventData(event.data) && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-slate-500">To:</span>
                                  <span className="font-mono text-slate-700">
                                    {shortenAddress(event.data.to, 6)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-slate-500">Amount:</span>
                                  <span className="font-mono font-semibold text-emerald-600">
                                    +{formatEventAmount(event.data.amount, decimals)}
                                    {tokenInfo?.symbol && <span className="text-slate-500 ml-1">{tokenInfo.symbol}</span>}
                                  </span>
                                </div>
                              </div>
                            )}

                            {isBurnEventData(event.data) && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-slate-500">From:</span>
                                  <span className="font-mono text-slate-700">
                                    {shortenAddress(event.data.from, 6)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-slate-500">Amount:</span>
                                  <span className="font-mono font-semibold text-rose-600">
                                    -{formatEventAmount(event.data.amount, decimals)}
                                    {tokenInfo?.symbol && <span className="text-slate-500 ml-1">{tokenInfo.symbol}</span>}
                                  </span>
                                </div>
                              </div>
                            )}

                            {isApproveEventData(event.data) && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-slate-500">Owner:</span>
                                  <span className="font-mono text-slate-700">
                                    {shortenAddress(event.data.from, 6)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-slate-500">Spender:</span>
                                  <span className="font-mono text-slate-700">
                                    {shortenAddress(event.data.spender, 6)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-slate-500">Allowance:</span>
                                  <span className="font-mono font-semibold text-slate-800">
                                    {formatEventAmount(event.data.amount, decimals)}
                                    {tokenInfo?.symbol && <span className="text-slate-500 ml-1">{tokenInfo.symbol}</span>}
                                  </span>
                                </div>
                                {event.data.expirationLedger > 0 && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-slate-500">Expires at ledger:</span>
                                    <span className="font-mono text-slate-600">{event.data.expirationLedger.toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {event.type === 'unknown' && customData && (
                              <div className="space-y-1">
                                {customData.account && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-slate-500">Account:</span>
                                    <span className="font-mono text-slate-700">
                                      {shortenAddress(customData.account, 6)}
                                    </span>
                                  </div>
                                )}
                                {customData.value !== null && customData.value !== undefined && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-slate-500">Data:</span>
                                    <span className="font-mono text-slate-600 truncate max-w-[300px]">
                                      {typeof customData.value === 'object'
                                        ? JSON.stringify(customData.value).slice(0, 80)
                                        : String(customData.value).slice(0, 80)}
                                      {(typeof customData.value === 'object'
                                        ? JSON.stringify(customData.value).length
                                        : String(customData.value).length) > 80 && '...'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {event.type === 'unknown' && !customData && (
                              <div className="text-xs text-slate-500 font-mono">
                                {JSON.stringify(event.data, null, 2).slice(0, 100)}
                                {JSON.stringify(event.data).length > 100 && '...'}
                              </div>
                            )}
                          </div>
                        </div>
                      );

                      return event.txHash ? (
                        <Link
                          key={idx}
                          href={`/transaction/${event.txHash}`}
                          className="block p-4 hover:bg-sky-50 transition-colors"
                        >
                          {eventContent}
                        </Link>
                      ) : (
                        <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                          {eventContent}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Storage Tab */}
            {activeTab === 'storage' && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <h3 className="text-sm font-semibold text-slate-900">Contract Storage</h3>
                  <p className="text-xs text-slate-500">{contract.storage?.totalEntries || 0} entries</p>
                </div>
                {!contract.storage || contract.storage.entries.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-400">No storage entries found</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {contract.storage.entries.map((entry, idx) => {
                      const isExpanded = expandedStorageRows.has(idx);
                      const isLongValue = entry.valueDisplay.length > 50;

                      return (
                        <div
                          key={idx}
                          className={`px-4 py-3 ${isLongValue ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                          onClick={() => {
                            if (isLongValue) {
                              const newExpanded = new Set(expandedStorageRows);
                              if (isExpanded) {
                                newExpanded.delete(idx);
                              } else {
                                newExpanded.add(idx);
                              }
                              setExpandedStorageRows(newExpanded);
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase flex-shrink-0 ${
                              entry.durability === 'instance' ? 'bg-indigo-100 text-indigo-700' :
                              entry.durability === 'persistent' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {entry.durability}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-sm font-medium text-slate-700 truncate">{entry.keyDisplay}</div>
                                <span className="text-[10px] text-slate-400 flex-shrink-0">{entry.keyType}</span>
                              </div>
                              <div className={`text-xs text-slate-500 font-mono mt-1 ${isExpanded ? 'whitespace-pre-wrap break-all' : 'truncate'}`}>
                                {entry.valueDisplay}
                              </div>
                              {isLongValue && !isExpanded && (
                                <span className="text-[10px] text-sky-500 mt-1 inline-block">Click to expand</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2 pl-16">
                            <span className="text-[10px] text-slate-400">Type: {entry.valueType}</span>
                            {entry.expirationLedger && (
                              <span className="text-[10px] text-slate-400">TTL: {entry.expirationLedger.toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 space-y-6 flex-shrink-0">
            {/* Contract Details */}
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Contract Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-[11px] text-slate-500">Contract Type</span>
                  <span className="text-[11px] font-semibold text-slate-700 capitalize">{contract.type}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-[11px] text-slate-500">Verified</span>
                  <span className={`text-[11px] font-semibold ${contract.isVerified ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {contract.isVerified ? 'Yes' : 'No'}
                  </span>
                </div>
                {isToken && (
                  <>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-[11px] text-slate-500">Token Name</span>
                      <span className="text-[11px] font-semibold text-slate-700">{contractDisplayName}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-[11px] text-slate-500">Symbol</span>
                      <span className="text-[11px] font-semibold text-slate-700">{tokenInfo?.symbol || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-[11px] text-slate-500">Decimals</span>
                      <span className="text-[11px] font-semibold text-slate-700">
                        {contract.tokenMetadata?.decimals ?? contract.verifiedContract?.decimals ?? 7}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-[11px] text-slate-500">Is SAC</span>
                      <span className="text-[11px] font-semibold text-slate-700">
                        {contract.tokenMetadata?.isSAC ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center py-1">
                  <span className="text-[11px] text-slate-500">Total Operations</span>
                  <span className="text-[11px] font-semibold text-slate-700">{operations.length}</span>
                </div>
              </div>
            </section>

            {/* Event Summary */}
            {contract.eventSummary && contract.eventSummary.totalEvents > 0 && (
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Event Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Total Events</span>
                    <span className="text-xs font-medium text-slate-700">{contract.eventSummary.totalEvents}</span>
                  </div>
                  {contract.eventSummary.transfers > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Transfers</span>
                      <span className="text-xs font-medium text-blue-600">{contract.eventSummary.transfers}</span>
                    </div>
                  )}
                  {contract.eventSummary.mints > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Mints</span>
                      <span className="text-xs font-medium text-emerald-600">{contract.eventSummary.mints}</span>
                    </div>
                  )}
                  {contract.eventSummary.burns > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Burns</span>
                      <span className="text-xs font-medium text-rose-600">{contract.eventSummary.burns}</span>
                    </div>
                  )}
                  {contract.eventSummary.approvals > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Approvals</span>
                      <span className="text-xs font-medium text-amber-600">{contract.eventSummary.approvals}</span>
                    </div>
                  )}
                  {contract.eventSummary.clawbacks > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Clawbacks</span>
                      <span className="text-xs font-medium text-purple-600">{contract.eventSummary.clawbacks}</span>
                    </div>
                  )}
                  {contract.eventSummary.totalVolume && contract.eventSummary.totalVolume !== '0' && (
                    <div className="pt-2 mt-2 border-t border-slate-100">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Total Volume</span>
                        <span className="text-xs font-mono font-medium text-slate-700">
                          {formatEventAmount(
                            contract.eventSummary.totalVolume,
                            contract.tokenMetadata?.decimals ?? contract.verifiedContract?.decimals ?? 7
                          )}
                          {tokenInfo?.symbol && <span className="text-slate-500 ml-1">{tokenInfo.symbol}</span>}
                        </span>
                      </div>
                    </div>
                  )}
                  {contract.eventSummary.uniqueAddresses.length > 0 && (
                    <div className="pt-2 mt-2 border-t border-slate-100">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Unique Addresses</span>
                        <span className="text-xs font-medium text-slate-700">{contract.eventSummary.uniqueAddresses.length}</span>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Build Verification Section */}
            {contract.verification && (
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Build Verification</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-[11px] text-slate-500">Status</span>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${contract.verification.isVerified ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {contract.verification.isVerified ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Verified
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          Not Verified
                        </>
                      )}
                    </span>
                  </div>
                  {contract.verification.sourceRepo && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-[11px] text-slate-500">Source Repo</span>
                      <a
                        href={contract.verification.sourceRepo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 truncate max-w-[150px] flex items-center gap-1"
                      >
                        View
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}
                  {contract.verification.commitHash && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-[11px] text-slate-500">Commit</span>
                      {getCommitUrl(contract.verification.sourceRepo, contract.verification.commitHash) ? (
                        <a
                          href={getCommitUrl(contract.verification.sourceRepo, contract.verification.commitHash)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-mono font-semibold text-sky-600 hover:text-sky-700"
                        >
                          {contract.verification.commitHash.slice(0, 8)}
                        </a>
                      ) : (
                        <span className="text-[11px] font-mono font-semibold text-slate-700">
                          {contract.verification.commitHash.slice(0, 8)}
                        </span>
                      )}
                    </div>
                  )}
                  {contract.verification.wasmHash && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-[11px] text-slate-500">WASM Hash</span>
                      <button
                        onClick={() => handleCopyWasm(contract.verification!.wasmHash!)}
                        className="text-[11px] font-mono font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
                      >
                        {contract.verification.wasmHash.slice(0, 8)}...
                        <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        {copiedWasm && <span className="text-emerald-500 text-[9px]">Copied!</span>}
                      </button>
                    </div>
                  )}
                  {contract.verification.buildWorkflow && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-[11px] text-slate-500">Build Workflow</span>
                      <a
                        href={contract.verification.buildWorkflow}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                      >
                        View
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Access Control Section */}
            {contract.accessControl && (contract.accessControl.admin || contract.accessControl.owner || contract.accessControl.pendingOwner || contract.accessControl.isPaused) && (
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Access Control</h3>
                <div className="space-y-3">
                  {contract.accessControl.admin && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-[11px] text-slate-500">Admin</span>
                      <Link
                        href={`/account/${contract.accessControl.admin}`}
                        className="text-[11px] font-mono font-semibold text-sky-600 hover:text-sky-700"
                      >
                        {shortenAddress(contract.accessControl.admin, 6)}
                      </Link>
                    </div>
                  )}
                  {contract.accessControl.owner && !contract.accessControl.admin && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-[11px] text-slate-500">Owner</span>
                      <Link
                        href={`/account/${contract.accessControl.owner}`}
                        className="text-[11px] font-mono font-semibold text-sky-600 hover:text-sky-700"
                      >
                        {shortenAddress(contract.accessControl.owner, 6)}
                      </Link>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-[11px] text-slate-500">Pause State</span>
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${contract.accessControl.isPaused ? 'text-amber-600' : 'text-emerald-600'}`}>
                      <span className={`w-2 h-2 rounded-full ${contract.accessControl.isPaused ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      {contract.accessControl.isPaused ? 'Paused' : 'Active'}
                    </span>
                  </div>
                  {contract.accessControl.pendingOwner && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-[11px] text-slate-500">Pending Owner</span>
                      <Link
                        href={`/account/${contract.accessControl.pendingOwner}`}
                        className="text-[11px] font-mono font-semibold text-sky-600 hover:text-sky-700"
                      >
                        {shortenAddress(contract.accessControl.pendingOwner, 6)}
                      </Link>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Contract Metadata Section */}
            {contract.contractMetadata && (contract.contractMetadata.homeDomain || contract.contractMetadata.sourceRepo || contract.contractMetadata.customMeta) && (
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Contract Metadata</h3>
                <div className="space-y-3">
                  {contract.contractMetadata.homeDomain && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-[11px] text-slate-500">Home Domain</span>
                      <a
                        href={`https://${contract.contractMetadata.homeDomain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                      >
                        {contract.contractMetadata.homeDomain}
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}
                  {contract.contractMetadata.sourceRepo && !contract.verification?.sourceRepo && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-[11px] text-slate-500">Source Repo</span>
                      <a
                        href={contract.contractMetadata.sourceRepo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                      >
                        View
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}
                  {contract.contractMetadata.customMeta && Object.entries(contract.contractMetadata.customMeta).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                      <span className="text-[11px] text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[150px]" title={value}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* External Links */}
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4">External Links</h3>
              <div className="space-y-2">
                <a
                  href={`https://stellar.expert/explorer/public/contract/${contract.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <span className="text-xs font-semibold text-slate-700">Stellar Expert</span>
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <a
                  href={`https://stellarchain.io/accounts/${contract.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <span className="text-xs font-semibold text-slate-700">Stellarchain.io</span>
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                {sourceRepo && (
                  <a
                    href={sourceRepo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <span className="text-xs font-semibold text-slate-700">Source Repository</span>
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
