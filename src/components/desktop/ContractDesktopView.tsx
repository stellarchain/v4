'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { shortenAddress, timeAgo, getOperationTypeLabel, ContractInvocation } from '@/lib/stellar';
import type { TokenRegistryEntry, ContractVerification } from '@/lib/shared/interfaces';
import type { ContractMetadataResult, ContractAccessControlResult } from '@/lib/soroban/contractMetadata';
import type { NFTInfo, VaultInfo } from '@/lib/soroban/contractExtensions';
import { ParsedEvent, EventSummary, formatEventAmount, isTransferEventData, isMintEventData, isBurnEventData, isApproveEventData, isCustomEventData, CustomEventData } from '@/lib/soroban/events';
import { ContractStorageResult } from '@/lib/soroban/storage';
import GliderTabs from '@/components/ui/GliderTabs';
import InlineSkeleton from '@/components/ui/InlineSkeleton';

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
  eventsPagination?: {
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    hasMore?: boolean;
    nextBeforeId?: number | null;
    beforeId?: number | null;
  };
  eventSummary?: EventSummary | null;
  storage?: ContractStorageResult | null;
  invocations?: ContractInvocation[];
  historyInvocations?: ContractInvocation[];
  historyPagination?: {
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    hasMore?: boolean;
    nextBeforeId?: number | null;
    beforeId?: number | null;
  };
  spec?: unknown;
  // API data fields
  totalTransactions?: number;
  totalInvokes?: number;
  createdAt?: string;
  wasmId?: string;
  contractCode?: string;
  sourceCodeVerified?: boolean;
  assetIssuer?: string;
  isSAC?: boolean;
  _loading?: {
    events?: boolean;
    invocations?: boolean;
    storage?: boolean;
    spec?: boolean;
  };
}

interface ContractDesktopViewProps {
  contract: ContractData;
  operations: Operation[];
  onTabChange?: (tabId: 'overview' | 'history' | 'events' | 'storage') => void;
  onHistoryPageChange?: (page: number) => void;
  onEventsPageChange?: (page: number) => void;
}

export default function ContractDesktopView({ contract, operations, onTabChange, onHistoryPageChange, onEventsPageChange }: ContractDesktopViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'operations' | 'events' | 'storage' | 'history' | 'code'>('overview');
  const [expandedStorageRows, setExpandedStorageRows] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);
  const [copiedWasm, setCopiedWasm] = useState(false);
  const sourceCode = contract.contractCode || null;

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
  const eventsPagination = contract.eventsPagination;
  const eventsList = contract.events ?? [];
  const historyInvocations = contract.historyInvocations ?? contract.invocations ?? [];
  const historyPagination = contract.historyPagination;
  const isToken = contract.type === 'token' || contract.type === 'lending';
  const isNFT = contract.type === 'nft';
  const isVault = contract.type === 'vault';
  const sectionLoading = contract._loading || {};

  const handleTabChange = (tabId: 'overview' | 'history' | 'events' | 'storage' | 'code') => {
    setActiveTab(tabId);

    if (tabId !== 'code') {
      onTabChange?.(tabId as 'overview' | 'history' | 'events' | 'storage');
    }
  };

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

  const formatEventDisplayName = (value: string) => {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
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
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[1400px] p-4 lg:p-4">
        {/* Header Card */}
        <div className="mb-4 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-4">
          <div className="flex items-center gap-4">
            {/* Back Button */}
            <Link
              href="/contracts"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-default)] text-[var(--text-muted)] transition hover:text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>

            {/* Divider */}
            <div className="h-8 w-px bg-[var(--border-default)]" />

            {/* Contract Icon */}
            <div className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${isToken ? 'bg-indigo-500' :
              isNFT ? 'bg-pink-500' :
                isVault ? 'bg-amber-500' :
                  'bg-[var(--text-secondary)]'
              } text-white`}>
              {getTypeIcon()}
            </div>

            {/* Contract Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <h1
                  className="text-lg font-semibold text-[var(--text-primary)] truncate max-w-[520px]"
                  title={contractDisplayName}
                >
                  {contractDisplayName}
                  {isToken && tokenInfo?.symbol && tokenInfo.name !== 'Unknown Token' && (
                    <span className="text-base font-medium text-[var(--text-muted)] ml-1.5">({tokenInfo.symbol})</span>
                  )}
                  {isNFT && contract.nftInfo?.symbol && (
                    <span className="text-base font-medium text-[var(--text-muted)] ml-1.5">({contract.nftInfo.symbol})</span>
                  )}
                  {isVault && contract.vaultInfo?.symbol && (
                    <span className="text-base font-medium text-[var(--text-muted)] ml-1.5">({contract.vaultInfo.symbol})</span>
                  )}
                </h1>

                {/* Badges */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] px-2 py-0.5 bg-[var(--bg-tertiary)] rounded">
                    {contract.type === 'dex' ? 'DEX' :
                      contract.type === 'lending' ? 'Lending' :
                        contract.type === 'nft' ? 'NFT' :
                          contract.type === 'vault' ? 'Vault' :
                            isToken ? 'Token' : 'Contract'}
                  </span>
                  {contract.isVerified && (
                    <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                      <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Verified
                    </span>
                  )}
                  {contract.verification?.isVerified && (
                    <a
                      href={sourceRepo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      Source
                    </a>
                  )}
                  {isToken && (
                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${contract.tokenMetadata?.isSAC
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}>
                      {contract.tokenMetadata?.isSAC ? 'SAC' : 'SEP-41'}
                    </span>
                  )}
                </div>
              </div>

              {/* Contract ID */}
              <button
                type="button"
                onClick={handleCopy}
                className="group flex max-w-full items-center gap-1.5 text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-secondary)] mt-0.5"
              >
                <span className="truncate">{contract.id}</span>
                <svg className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {copied && <span className="text-[10px] font-medium text-emerald-500">Copied</span>}
              </button>
            </div>

            {/* Website Button */}
            {contract.verifiedContract?.website && (
              <a
                href={contract.verifiedContract.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border-default)] rounded-md text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-strong)] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Website
              </a>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          <div className="flex-1 min-w-0 space-y-4">
            {/* Token Stats (if token) */}
            {isToken && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Symbol</div>
                  <div className="text-xl font-bold text-[var(--text-primary)]">{tokenInfo?.symbol || '???'}</div>
                </div>
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Decimals</div>
                  <div className="text-xl font-bold text-[var(--text-primary)]">
                    {contract.tokenMetadata?.decimals ?? contract.verifiedContract?.decimals ?? 7}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Type</div>
                  <div className="text-xl font-bold text-[var(--text-primary)]">
                    {contract.tokenMetadata?.isSAC ? 'SAC' : 'SEP-41'}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Operations</div>
                  <div className="text-xl font-bold text-[var(--text-primary)]">{operations.length}</div>
                </div>
              </div>
            )}

            {/* NFT Stats */}
            {isNFT && contract.nftInfo && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Symbol</div>
                  <div className="text-xl font-bold text-[var(--text-primary)]">{contract.nftInfo.symbol || '???'}</div>
                </div>
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Total Supply</div>
                  <div className="text-xl font-bold text-[var(--text-primary)]">
                    {contract.nftInfo.totalSupply !== undefined ? formatTokenAmount(String(contract.nftInfo.totalSupply), 0) : 'N/A'}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Type</div>
                  <div className="text-xl font-bold text-[var(--text-primary)]">NFT</div>
                </div>
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Operations</div>
                  <div className="text-xl font-bold text-[var(--text-primary)]">{operations.length}</div>
                </div>
              </div>
            )}

            {/* Vault Stats */}
            {isVault && contract.vaultInfo && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Total Assets</div>
                  <div className="text-xl font-bold text-[var(--text-primary)]">
                    {formatTokenAmount(contract.vaultInfo.totalAssets, 2)}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Total Shares</div>
                  <div className="text-xl font-bold text-[var(--text-primary)]">
                    {formatTokenAmount(contract.vaultInfo.totalShares, 2)}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Asset Address</div>
                  <div className="text-sm font-bold text-[var(--text-primary)] font-mono truncate" title={contract.vaultInfo.underlyingAsset}>
                    {shortenAddress(contract.vaultInfo.underlyingAsset)}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Decimals Offset</div>
                  <div className="text-xl font-bold text-[var(--text-primary)]">{contract.vaultInfo.decimalsOffset}</div>
                </div>
              </div>
            )}

            {/* Tabs */}
              <GliderTabs
                size="md"
                className="border-[var(--border-default)]"
                tabs={[
                  { id: 'overview', label: 'Overview' },
                  {
                    id: 'history',
                    label: 'History',
                    count: contract.totalInvokes ?? contract.invocations?.length ?? 0,
                  },
                  {
                    id: 'events',
                    label: 'Events',
                    count: contract.eventSummary?.totalEvents ?? 0,
                  },
                  {
                    id: 'storage',
                    label: 'Storage',
                    count: sectionLoading.storage ? undefined : contract.storage?.totalEntries ?? 0,
                  },
                // Only show Code tab for actual contracts (not tokens)
                ...(contract.type === 'contract' ? [{ id: 'code' as const, label: 'WASM' }] : []),
              ]}
              activeId={activeTab as 'overview' | 'history' | 'events' | 'storage' | 'code'}
              onChange={handleTabChange}
            />

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Description */}
                {contract.verifiedContract?.description && (
                  <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">About</h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{contract.verifiedContract.description}</p>
                  </div>
                )}

                {/* Recent Transactions */}
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-sm">
                  <div className="flex items-center justify-between px-4 pt-4 pb-3">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Recent Transactions</h3>
                    <span className="rounded-full bg-[var(--bg-tertiary)] px-2.5 py-1 text-[10px] font-bold text-[var(--text-tertiary)]">
                      {sectionLoading.invocations ? <InlineSkeleton width="w-16" height="h-3" /> : `${Math.min(contract.invocations?.length || 0, 5)} of ${contract.totalInvokes ?? contract.invocations?.length ?? 0}`}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full sc-table">
                      <thead>
                        <tr className="border-b border-[var(--border-subtle)]">
                          <th className="px-4 py-3 text-left text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Transaction</th>
                          <th className="px-4 py-3 text-right text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {sectionLoading.invocations ? (
                          Array.from({ length: 6 }).map((_, idx) => (
                            <tr key={`overview-history-skeleton-${idx}`}>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
                                  <div className="min-w-0">
                                    <InlineSkeleton width="w-44" />
                                    <div className="mt-2">
                                      <InlineSkeleton width="w-24" height="h-3" />
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <InlineSkeleton width="w-28" />
                              </td>
                            </tr>
                          ))
                        ) : !contract.invocations || contract.invocations.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="p-4 text-center text-sm text-[var(--text-muted)]">No transaction history found</td>
                          </tr>
                        ) : (
                          contract.invocations.slice(0, 5).map((invocation, idx) => {
                            const amountParam = invocation.parameters.find(p => p.type === 'I128' || p.type === 'U128');
                            const displayAmount = amountParam?.decoded;
                            const addressParams = invocation.parameters.filter(p =>
                              p.type === 'Address' && p.decoded && p.decoded !== invocation.contractId
                            );
                            const resultAmt = invocation.resultAmount
                              ? parseFloat(invocation.resultAmount).toLocaleString(undefined, { maximumFractionDigits: 7 })
                              : null;
                            const resultAsset = invocation.resultAsset || tokenInfo?.symbol || '';

                            const getActionSummary = () => {
                              const fn = invocation.functionName.toLowerCase();
                              const symbol = tokenInfo?.symbol || '';
                              const amount = displayAmount ? parseInt(displayAmount).toLocaleString() : '';
                              const targetAddr = addressParams[0]?.decoded ? shortenAddress(addressParams[0].decoded) : '';

                              switch (fn) {
                                case 'harvest':
                                  return resultAmt ? `Harvested ${resultAmt} ${resultAsset}` : 'Harvested rewards';
                                case 'plant':
                                  return amount ? `Planted ${amount}${symbol ? ` ${symbol}` : ''}` : 'Planted tokens';
                                case 'transfer':
                                  return resultAmt || amount ? `Sent ${resultAmt || amount}${symbol ? ` ${symbol}` : ''}${targetAddr ? ` to ${targetAddr}` : ''}` : 'Transferred tokens';
                                case 'mint':
                                  return resultAmt || amount ? `Minted ${resultAmt || amount}${symbol ? ` ${symbol}` : ''}` : 'Minted tokens';
                                case 'burn':
                                  return resultAmt || amount ? `Burned ${resultAmt || amount}${symbol ? ` ${symbol}` : ''}` : 'Burned tokens';
                                case 'approve':
                                  return `Approved spending${targetAddr ? ` for ${targetAddr}` : ''}`;
                                case 'deposit':
                                  return resultAmt || amount ? `Deposited ${resultAmt || amount}${symbol ? ` ${symbol}` : ''}` : 'Made a deposit';
                                case 'withdraw':
                                  return resultAmt || amount ? `Withdrew ${resultAmt || amount} ${resultAsset}` : 'Made a withdrawal';
                                case 'stake':
                                  return resultAmt || amount ? `Staked ${resultAmt || amount}${symbol ? ` ${symbol}` : ''}` : 'Staked tokens';
                                case 'unstake':
                                  return resultAmt || amount ? `Unstaked ${resultAmt || amount}${symbol ? ` ${symbol}` : ''}` : 'Unstaked tokens';
                                case 'claim':
                                  return resultAmt ? `Claimed ${resultAmt} ${resultAsset}` : 'Claimed rewards';
                                case 'swap':
                                  return 'Swapped tokens';
                                case 'initialize':
                                  return 'Initialized contract';
                                default:
                                  return `Invoked ${invocation.functionName}`;
                              }
                            };

                            const summary = getActionSummary();

                            return (
                              <tr key={`overview-invocation-${idx}`} className="hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer" onClick={() => window.location.href = `/transaction/${invocation.txHash}`}>
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-sky-50 dark:bg-sky-900/40 flex items-center justify-center flex-shrink-0">
                                      <svg className="w-4 h-4 text-sky-700 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                      </svg>
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Link href={`/account/${invocation.sourceAccount}`} onClick={(e) => e.stopPropagation()} className="font-mono text-xs text-sky-600 hover:underline">
                                          {shortenAddress(invocation.sourceAccount)}
                                        </Link>
                                        <span className="text-[var(--text-muted)] text-xs">invoked</span>
                                        <Link href={`/transaction/${invocation.txHash}`} className="font-mono text-sm font-bold text-indigo-600 hover:underline">
                                          {invocation.functionName}
                                        </Link>
                                      </div>
                                      {summary && (
                                        <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                                          {summary}
                                        </div>
                                      )}
                                      <Link href={`/transaction/${invocation.txHash}`} className="font-mono text-[10px] text-[var(--text-muted)] hover:text-sky-600 hover:underline">
                                        {shortenAddress(invocation.txHash)}
                                      </Link>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <span className="text-xs text-[var(--text-tertiary)]">
                                    {new Date(invocation.createdAt).toLocaleString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      timeZoneName: 'short'
                                    })}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  {contract.invocations && contract.invocations.length > 5 && (
                    <button
                      onClick={() => handleTabChange('history')}
                      className="w-full rounded-b-xl border-t border-[var(--border-subtle)] py-3 text-center text-xs font-bold text-sky-600 transition-colors hover:bg-[var(--bg-tertiary)]"
                    >
                      View All {contract.totalInvokes ?? contract.invocations.length} Invocations
                    </button>
                  )}
                </div>

                {/* Recent Events */}
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-sm">
                  <div className="flex items-center justify-between px-4 pt-4 pb-3">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Recent Events</h3>
                    <span className="rounded-full bg-[var(--bg-tertiary)] px-2.5 py-1 text-[10px] font-bold text-[var(--text-tertiary)]">
                      {sectionLoading.events ? <InlineSkeleton width="w-16" height="h-3" /> : `${Math.min(contract.events?.length || 0, 5)} of ${contract.eventSummary?.totalEvents ?? contract.events?.length ?? 0}`}
                    </span>
                  </div>
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {sectionLoading.events ? (
                      Array.from({ length: 5 }).map((_, idx) => (
                        <div key={`overview-events-skeleton-${idx}`} className="px-4 py-4 flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
                          <div className="min-w-0">
                            <InlineSkeleton width="w-28" />
                            <div className="mt-2">
                              <InlineSkeleton width="w-24" height="h-3" />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : !contract.events || contract.events.length === 0 ? (
                      <div className="p-4 text-center text-sm text-[var(--text-muted)]">No recent events found</div>
                    ) : (
                      contract.events.slice(0, 5).map((event, idx) => {
                        const displayName = event.type !== 'unknown'
                          ? event.type
                          : (event.rawEventName || 'event');
                        const customData = isCustomEventData(event.data) ? event.data : null;
                        const subType = customData?.subType;
                        const cleanedTopics = (customData?.decodedTopics || [])
                          .map((topic) => String(topic || '').replace(/^"+|"+$/g, '').trim())
                          .filter(Boolean);
                        const eventBadgeLabel = String(displayName || 'Event').toLowerCase() === 'contract'
                          ? 'Event'
                          : String(displayName || 'Event');
                        const topicLabel = cleanedTopics[0] && cleanedTopics[0].toLowerCase() !== eventBadgeLabel.toLowerCase()
                          ? cleanedTopics[0]
                          : null;
                        const transferFlow = isTransferEventData(event.data)
                          ? `${shortenAddress(event.data.from)} -> ${shortenAddress(event.data.to)}`
                          : null;
                        const customFlow = !transferFlow && cleanedTopics.length > 2
                          ? `${shortenAddress(cleanedTopics[1])} -> ${shortenAddress(cleanedTopics[2])}`
                          : null;
                        const valueText = customData?.decodedValue
                          ? String(customData.decodedValue).replace(/^"+|"+$/g, '').trim()
                          : '';

                        const eventContent = (
                          <div className="px-4 py-4 flex items-center gap-3 hover:bg-[var(--bg-tertiary)] transition-colors">
                            <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${event.type === 'transfer' ? 'bg-blue-500/10 text-blue-400' :
                              event.type === 'mint' ? 'bg-green-500/10 text-green-400' :
                                event.type === 'burn' ? 'bg-orange-500/10 text-orange-400' :
                                  event.type === 'approve' ? 'bg-purple-500/10 text-purple-400' :
                                    event.type === 'clawback' ? 'bg-[var(--error)]/10 text-[var(--error)]' :
                                      'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                              }`}>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700">
                                  {eventBadgeLabel}
                                </span>
                                {(topicLabel || subType) && (
                                  <span className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
                                    {topicLabel || subType}
                                  </span>
                                )}
                              </div>
                              {(transferFlow || customFlow || valueText) && (
                                <div className="text-[11px] text-[var(--text-secondary)] truncate">
                                  {transferFlow || customFlow || valueText}
                                </div>
                              )}
                              {event.timestamp && (
                                <div className="text-[11px] text-[var(--text-tertiary)]">{timeAgo(event.timestamp)}</div>
                              )}
                            </div>
                            {isTransferEventData(event.data) && (
                              <div className="text-right flex-shrink-0">
                                <div className="text-xs font-bold text-[var(--text-primary)]">
                                  {formatEventAmount(event.data.amount || '0', contract.tokenMetadata?.decimals || 7)}
                                </div>
                                <div className="text-[10px] text-[var(--text-tertiary)]">{tokenInfo?.symbol || ''}</div>
                              </div>
                            )}
                          </div>
                        );

                        return event.txHash ? (
                          <Link key={`overview-event-${idx}`} href={`/transaction/${event.txHash}`} className="block">
                            {eventContent}
                          </Link>
                        ) : (
                          <div key={`overview-event-${idx}`}>{eventContent}</div>
                        );
                      })
                    )}
                  </div>
                  {contract.events && contract.events.length > 5 && (
                    <button
                      onClick={() => handleTabChange('events')}
                      className="w-full rounded-b-xl border-t border-[var(--border-subtle)] py-3 text-center text-xs font-bold text-sky-600 transition-colors hover:bg-[var(--bg-tertiary)]"
                    >
                      View All {contract.eventSummary?.totalEvents ?? contract.events.length} Events
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* History Tab - Contract Invocations */}
            {activeTab === 'history' && (
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-sm">
                <div className="flex items-center justify-between px-4 pt-4 pb-3">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Contract functions Invocations History</h3>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-[var(--bg-tertiary)] px-2.5 py-1 text-[10px] font-bold text-[var(--text-tertiary)]">
                      {sectionLoading.invocations ? <InlineSkeleton width="w-16" height="h-3" /> : `${historyPagination?.totalItems ?? contract.totalInvokes ?? historyInvocations.length} invocations`}
                    </span>
                    {historyPagination && (historyPagination.currentPage > 1 || historyPagination.hasMore) && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onHistoryPageChange?.(Math.max(1, historyPagination.currentPage - 1))}
                          disabled={sectionLoading.invocations || historyPagination.currentPage <= 1}
                          className="px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-xs font-semibold text-[var(--text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                          Previous
                        </button>
                        <span className="text-xs text-[var(--text-muted)] min-w-[52px] text-center">
                          Page {historyPagination.currentPage}
                        </span>
                        <button
                          onClick={() => onHistoryPageChange?.(historyPagination.currentPage + 1)}
                          disabled={sectionLoading.invocations || !historyPagination.hasMore}
                          className="px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-xs font-semibold text-[var(--text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full sc-table">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)]">
                        <th className="px-4 py-3 text-left text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Transaction</th>
                        <th className="px-4 py-3 text-right text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {sectionLoading.invocations ? (
                        Array.from({ length: 6 }).map((_, idx) => (
                          <tr key={`history-skeleton-${idx}`}>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
                                <div className="min-w-0">
                                  <InlineSkeleton width="w-44" />
                                  <div className="mt-2">
                                    <InlineSkeleton width="w-24" height="h-3" />
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <InlineSkeleton width="w-28" />
                            </td>
                          </tr>
                        ))
                      ) : historyInvocations.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="p-4 text-center text-sm text-[var(--text-muted)]">No transaction history found</td>
                        </tr>
                      ) : (
                        historyInvocations.map((invocation, idx) => {
                          // Find the I128/U128 parameter for display (often the amount)
                          const amountParam = invocation.parameters.find(p => p.type === 'I128' || p.type === 'U128');
                          const displayAmount = amountParam?.decoded;

                          // Find address parameters (excluding the contract itself)
                          const addressParams = invocation.parameters.filter(p =>
                            p.type === 'Address' && p.decoded && p.decoded !== invocation.contractId
                          );

                          // Get result amount from effects (credited to source account)
                          const resultAmt = invocation.resultAmount
                            ? parseFloat(invocation.resultAmount).toLocaleString(undefined, { maximumFractionDigits: 7 })
                            : null;
                          const resultAsset = invocation.resultAsset || tokenInfo?.symbol || '';

                          // Generate human-readable summary based on function name
                          const getActionSummary = () => {
                            const fn = invocation.functionName.toLowerCase();
                            const symbol = tokenInfo?.symbol || '';
                            const amount = displayAmount ? parseInt(displayAmount).toLocaleString() : '';
                            const targetAddr = addressParams[0]?.decoded ? shortenAddress(addressParams[0].decoded) : '';

                            switch (fn) {
                              case 'harvest':
                                return resultAmt ? `Harvested ${resultAmt} ${resultAsset}` : 'Harvested rewards';
                              case 'plant':
                                return amount ? `Planted ${amount}${symbol ? ` ${symbol}` : ''}` : 'Planted tokens';
                              case 'transfer':
                                return resultAmt || amount ? `Sent ${resultAmt || amount}${symbol ? ` ${symbol}` : ''}${targetAddr ? ` to ${targetAddr}` : ''}` : 'Transferred tokens';
                              case 'mint':
                                return resultAmt || amount ? `Minted ${resultAmt || amount}${symbol ? ` ${symbol}` : ''}` : 'Minted tokens';
                              case 'burn':
                                return resultAmt || amount ? `Burned ${resultAmt || amount}${symbol ? ` ${symbol}` : ''}` : 'Burned tokens';
                              case 'approve':
                                return `Approved spending${targetAddr ? ` for ${targetAddr}` : ''}`;
                              case 'deposit':
                                return resultAmt || amount ? `Deposited ${resultAmt || amount}${symbol ? ` ${symbol}` : ''}` : 'Made a deposit';
                              case 'withdraw':
                                return resultAmt || amount ? `Withdrew ${resultAmt || amount} ${resultAsset}` : 'Made a withdrawal';
                              case 'stake':
                                return resultAmt || amount ? `Staked ${resultAmt || amount}${symbol ? ` ${symbol}` : ''}` : 'Staked tokens';
                              case 'unstake':
                                return resultAmt || amount ? `Unstaked ${resultAmt || amount}${symbol ? ` ${symbol}` : ''}` : 'Unstaked tokens';
                              case 'claim':
                                return resultAmt ? `Claimed ${resultAmt} ${resultAsset}` : 'Claimed rewards';
                              case 'swap':
                                return 'Swapped tokens';
                              case 'initialize':
                                return 'Initialized contract';
                              default:
                                return `Invoked ${invocation.functionName}`;
                            }
                          };

                          const summary = getActionSummary();

                          return (
                            <tr key={idx} className="hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer" onClick={() => window.location.href = `/transaction/${invocation.txHash}`}>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-lg bg-sky-50 dark:bg-sky-900/40 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-sky-700 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Link href={`/account/${invocation.sourceAccount}`} onClick={(e) => e.stopPropagation()} className="font-mono text-xs text-sky-600 hover:underline">
                                        {shortenAddress(invocation.sourceAccount)}
                                      </Link>
                                      <span className="text-[var(--text-muted)] text-xs">invoked</span>
                                      <Link href={`/transaction/${invocation.txHash}`} className="font-mono text-sm font-bold text-indigo-600 hover:underline">
                                        {invocation.functionName}
                                      </Link>
                                    </div>
                                    {summary && (
                                      <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                                        {summary}
                                      </div>
                                    )}
                                    <Link href={`/transaction/${invocation.txHash}`} className="font-mono text-[10px] text-[var(--text-muted)] hover:text-sky-600 hover:underline">
                                      {shortenAddress(invocation.txHash)}
                                    </Link>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <span className="text-xs text-[var(--text-tertiary)]">
                                  {new Date(invocation.createdAt).toLocaleString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    timeZoneName: 'short'
                                  })}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Events Tab */}
            {activeTab === 'events' && (
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-sm">
                <div className="flex items-center justify-between px-4 pt-4 pb-3">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Contract Events</h3>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-[var(--bg-tertiary)] px-2.5 py-1 text-[10px] font-bold text-[var(--text-tertiary)]">
                      {sectionLoading.events ? <InlineSkeleton width="w-10" height="h-3" /> : (eventsPagination?.totalItems ?? eventsList.length)}
                    </span>
                    {eventsPagination && (eventsPagination.currentPage > 1 || eventsPagination.hasMore) && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onEventsPageChange?.(Math.max(1, eventsPagination.currentPage - 1))}
                          disabled={sectionLoading.events || eventsPagination.currentPage <= 1}
                          className="px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-xs font-semibold text-[var(--text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                          Previous
                        </button>
                        <span className="text-xs text-[var(--text-muted)] min-w-[52px] text-center">
                          Page {eventsPagination.currentPage}
                        </span>
                        <button
                          onClick={() => onEventsPageChange?.(eventsPagination.currentPage + 1)}
                          disabled={sectionLoading.events || !eventsPagination.hasMore}
                          className="px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-xs font-semibold text-[var(--text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="divide-y divide-[var(--border-subtle)]">
                  {sectionLoading.events ? (
                    Array.from({ length: 8 }).map((_, idx) => (
                      <div key={`events-skeleton-${idx}`} className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="h-8 w-8 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
                          <div className="flex-1 min-w-0">
                            <InlineSkeleton width="w-20" />
                            <div className="mt-2">
                              <InlineSkeleton width="w-48" height="h-3" />
                            </div>
                            <div className="mt-2">
                              <InlineSkeleton width="w-36" height="h-3" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : eventsList.length === 0 ? (
                    <div className="p-4 text-center text-sm text-[var(--text-muted)]">No events found</div>
                  ) : (
                    eventsList.map((event, idx) => {
                      const getEventBadgeColor = (type: string) => {
                        switch (type) {
                          case 'transfer': return 'bg-blue-100 text-blue-700 border-blue-200';
                          case 'mint': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
                          case 'burn': return 'bg-rose-100 text-rose-700 border-rose-200';
                          case 'approve': return 'bg-amber-100 text-amber-700 border-amber-200';
                          case 'clawback': return 'bg-purple-100 text-purple-700 border-purple-200';
                          default: return 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-default)]';
                        }
                      };

                      const decimals = contract.tokenMetadata?.decimals ?? contract.verifiedContract?.decimals ?? 7;
                      const customData = isCustomEventData(event.data) ? event.data : null;
                      const decodedTopics = customData?.decodedTopics;
                      const decodedFrom = decodedTopics?.[1];
                      const decodedTo = decodedTopics?.[2];
                      const decodedAsset = decodedTopics?.[3];
                      const decodedValue = customData?.decodedValue;
                      const parsedDecodedSymbol = typeof decodedAsset === 'string'
                        ? decodedAsset.replace(/^"|"$/g, '').split(':')[0]
                        : '';
                      const displaySymbol = tokenInfo?.symbol || parsedDecodedSymbol;
                      const formatAddr = (value?: string) => (value ? shortenAddress(value) : 'UNKNOWN');

                      // Get display name - use raw event name for custom events
                      const decodedEventType = decodedTopics?.[0];
                      const normalizedDecodedType = typeof decodedEventType === 'string'
                        ? decodedEventType.replace(/^"|"$/g, '').trim()
                        : '';
                      const badgeType = (normalizedDecodedType || event.type || 'unknown').toLowerCase();
                      const displayName = normalizedDecodedType
                        ? formatEventDisplayName(normalizedDecodedType)
                        : formatEventDisplayName(event.type !== 'unknown'
                          ? event.type
                          : (event.rawEventName || 'event'));
                      const subType = customData?.subType;

                      const eventContent = (
                        <div className="flex items-start gap-4">
                          <div className="h-8 w-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[10px] font-mono text-[var(--text-tertiary)] flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getEventBadgeColor(badgeType)}`}>
                                {displayName}
                              </span>
                              {subType && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-default)]">
                                  {subType}
                                </span>
                              )}
                              {event.timestamp && (
                                <span className="text-[10px] text-[var(--text-muted)]">{timeAgo(event.timestamp)}</span>
                              )}
                              {event.txHash && (
                                <span className="text-[10px] text-sky-500 ml-auto">View Transaction →</span>
                              )}
                            </div>

                            {/* Event-specific display */}
                            {isTransferEventData(event.data) && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-[var(--text-tertiary)]">From:</span>
                                  <span className="font-mono text-[var(--text-secondary)]">
                                    {formatAddr(event.data.from || decodedFrom)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-[var(--text-tertiary)]">To:</span>
                                  <span className="font-mono text-[var(--text-secondary)]">
                                    {formatAddr(event.data.to || decodedTo)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-[var(--text-tertiary)]">Amount:</span>
                                  <span className="font-mono font-semibold text-[var(--text-primary)]">
                                    {event.data.amount ? formatEventAmount(event.data.amount, decimals) : (decodedValue || '0')}
                                    {displaySymbol && <span className="text-[var(--text-tertiary)] ml-1">{displaySymbol}</span>}
                                  </span>
                                </div>
                              </div>
                            )}

                            {isMintEventData(event.data) && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-[var(--text-tertiary)]">To:</span>
                                  <span className="font-mono text-[var(--text-secondary)]">
                                    {formatAddr(event.data.to || decodedTo)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-[var(--text-tertiary)]">Amount:</span>
                                  <span className="font-mono font-semibold text-emerald-600">
                                    +{event.data.amount ? formatEventAmount(event.data.amount, decimals) : (decodedValue || '0')}
                                    {displaySymbol && <span className="text-[var(--text-tertiary)] ml-1">{displaySymbol}</span>}
                                  </span>
                                </div>
                              </div>
                            )}

                            {isBurnEventData(event.data) && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-[var(--text-tertiary)]">From:</span>
                                  <span className="font-mono text-[var(--text-secondary)]">
                                    {formatAddr(event.data.from || decodedFrom)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-[var(--text-tertiary)]">Amount:</span>
                                  <span className="font-mono font-semibold text-rose-600">
                                    -{event.data.amount ? formatEventAmount(event.data.amount, decimals) : (decodedValue || '0')}
                                    {displaySymbol && <span className="text-[var(--text-tertiary)] ml-1">{displaySymbol}</span>}
                                  </span>
                                </div>
                              </div>
                            )}

                            {isApproveEventData(event.data) && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-[var(--text-tertiary)]">Owner:</span>
                                  <span className="font-mono text-[var(--text-secondary)]">
                                    {formatAddr(event.data.from || decodedFrom)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-[var(--text-tertiary)]">Spender:</span>
                                  <span className="font-mono text-[var(--text-secondary)]">
                                    {formatAddr(event.data.spender || decodedTo)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-[var(--text-tertiary)]">Allowance:</span>
                                  <span className="font-mono font-semibold text-[var(--text-primary)]">
                                    {event.data.amount ? formatEventAmount(event.data.amount, decimals) : (decodedValue || '0')}
                                    {displaySymbol && <span className="text-[var(--text-tertiary)] ml-1">{displaySymbol}</span>}
                                  </span>
                                </div>
                                {event.data.expirationLedger > 0 && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-[var(--text-tertiary)]">Expires at ledger:</span>
                                    <span className="font-mono text-[var(--text-secondary)]">{event.data.expirationLedger.toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {event.type === 'unknown' && customData && (
                              <div className="space-y-1">
                                {decodedFrom && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-[var(--text-tertiary)]">From:</span>
                                    <span className="font-mono text-[var(--text-secondary)]">
                                      {formatAddr(decodedFrom)}
                                    </span>
                                  </div>
                                )}
                                {decodedTo && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-[var(--text-tertiary)]">To:</span>
                                    <span className="font-mono text-[var(--text-secondary)]">
                                      {formatAddr(decodedTo)}
                                    </span>
                                  </div>
                                )}
                                {decodedValue && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-[var(--text-tertiary)]">Amount:</span>
                                    <span className="font-mono font-semibold text-[var(--text-primary)]">
                                      {decodedValue}
                                      {displaySymbol && <span className="text-[var(--text-tertiary)] ml-1">{displaySymbol}</span>}
                                    </span>
                                  </div>
                                )}
                                {customData.account && !decodedFrom && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-[var(--text-tertiary)]">Account:</span>
                                    <span className="font-mono text-[var(--text-secondary)]">
                                      {shortenAddress(customData.account)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {event.type === 'unknown' && !customData && (
                              decodedFrom || decodedTo || decodedValue ? (
                                <div className="space-y-1">
                                  {decodedFrom && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="text-[var(--text-tertiary)]">From:</span>
                                      <span className="font-mono text-[var(--text-secondary)]">{formatAddr(decodedFrom)}</span>
                                    </div>
                                  )}
                                  {decodedTo && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="text-[var(--text-tertiary)]">To:</span>
                                      <span className="font-mono text-[var(--text-secondary)]">{formatAddr(decodedTo)}</span>
                                    </div>
                                  )}
                                  {decodedValue && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="text-[var(--text-tertiary)]">Amount:</span>
                                      <span className="font-mono font-semibold text-[var(--text-primary)]">
                                        {decodedValue}
                                        {displaySymbol && <span className="text-[var(--text-tertiary)] ml-1">{displaySymbol}</span>}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xs text-[var(--text-muted)]">
                                  No decoded event details available
                                </div>
                              )
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
                        <div key={idx} className="p-4 hover:bg-[var(--bg-tertiary)] transition-colors">
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
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Contract Storage</h3>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {sectionLoading.storage ? <InlineSkeleton width="w-16" height="h-3" /> : `${contract.storage?.totalEntries || 0} entries`}
                  </p>
                </div>
                {sectionLoading.storage ? (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div key={`storage-skeleton-${idx}`} className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <InlineSkeleton width="w-16" height="h-5" />
                          <div className="flex-1">
                            <InlineSkeleton width="w-44" />
                            <div className="mt-2">
                              <InlineSkeleton width="w-56" height="h-3" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !contract.storage || contract.storage.entries.length === 0 ? (
                  <div className="p-4 text-center text-sm text-[var(--text-muted)]">No storage entries found</div>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {contract.storage.entries.map((entry, idx) => {
                      const isExpanded = expandedStorageRows.has(idx);
                      const isLongValue = entry.valueDisplay.length > 50;

                      return (
                        <div
                          key={idx}
                          className={`px-4 py-3 ${isLongValue ? 'cursor-pointer hover:bg-[var(--bg-tertiary)]' : ''}`}
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
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase flex-shrink-0 ${entry.durability === 'instance' ? 'bg-indigo-100 text-indigo-700' :
                              entry.durability === 'persistent' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                              {entry.durability}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-sm font-medium text-[var(--text-secondary)] truncate">{entry.keyDisplay}</div>
                                <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">{entry.keyType}</span>
                              </div>
                              <div className={`text-xs text-[var(--text-tertiary)] font-mono mt-1 ${isExpanded ? 'whitespace-pre-wrap break-all' : 'truncate'}`}>
                                {entry.valueDisplay}
                              </div>
                              {isLongValue && !isExpanded && (
                                <span className="text-[10px] text-sky-500 mt-1 inline-block">Click to expand</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2 pl-16">
                            <span className="text-[10px] text-[var(--text-muted)]">Type: {entry.valueType}</span>
                            {entry.expirationLedger && (
                              <span className="text-[10px] text-[var(--text-muted)]">TTL: {entry.expirationLedger.toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Code Tab */}
            {activeTab === 'code' && (
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-sm">
                <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Source Code</h3>
                  <p className="text-xs text-[var(--text-tertiary)]">Contract source code</p>
                </div>
                <div className="p-4">
                  {sourceCode ? (
                    <div className="w-full overflow-hidden">
                      <SyntaxHighlighter
                        language="rust"
                        style={vscDarkPlus}
                        customStyle={{
                          margin: 0,
                          borderRadius: '0.5rem',
                          fontSize: '0.75rem',
                          maxHeight: '600px',
                          maxWidth: '100%',
                          width: '100%',
                          border: '1px solid var(--border-subtle)',
                          overflow: 'auto',
                        }}
                        showLineNumbers
                        wrapLines={false}
                        wrapLongLines={false}
                      >
                        {sourceCode}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-[var(--text-muted)]">
                      No source code available
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 space-y-4 flex-shrink-0">
            {/* Contract Details */}
            <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Contract Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
                  <span className="text-[11px] text-[var(--text-tertiary)]">Contract Type</span>
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)] capitalize">{contract.type}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
                  <span className="text-[11px] text-[var(--text-tertiary)]">Verified</span>
                  <span className={`text-[11px] font-semibold ${contract.isVerified ? 'text-emerald-600' : 'text-[var(--text-muted)]'}`}>
                    {contract.isVerified ? 'Yes' : 'No'}
                  </span>
                </div>
                {isToken && (
                  <>
                    <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
                      <span className="text-[11px] text-[var(--text-tertiary)]">Token Name</span>
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)]">{contractDisplayName}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
                      <span className="text-[11px] text-[var(--text-tertiary)]">Symbol</span>
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)]">{tokenInfo?.symbol || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
                      <span className="text-[11px] text-[var(--text-tertiary)]">Decimals</span>
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                        {contract.tokenMetadata?.decimals ?? contract.verifiedContract?.decimals ?? 7}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
                      <span className="text-[11px] text-[var(--text-tertiary)]">Is SAC</span>
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                        {contract.tokenMetadata?.isSAC ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center py-1">
                  <span className="text-[11px] text-[var(--text-tertiary)]">Total Operations</span>
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                    {contract.totalTransactions ?? contract.invocations?.length ?? 0}
                  </span>
                </div>
              </div>
            </section>

            {/* Event Summary */}
            {contract.eventSummary && contract.eventSummary.totalEvents > 0 && (
              <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Event Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[var(--text-tertiary)]">Total Events</span>
                    <span className="text-xs font-medium text-[var(--text-secondary)]">{contract.eventSummary.totalEvents}</span>
                  </div>
                  {contract.eventSummary.transfers > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[var(--text-tertiary)]">Transfers</span>
                      <span className="text-xs font-medium text-blue-600">{contract.eventSummary.transfers}</span>
                    </div>
                  )}
                  {contract.eventSummary.mints > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[var(--text-tertiary)]">Mints</span>
                      <span className="text-xs font-medium text-emerald-600">{contract.eventSummary.mints}</span>
                    </div>
                  )}
                  {contract.eventSummary.burns > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[var(--text-tertiary)]">Burns</span>
                      <span className="text-xs font-medium text-rose-600">{contract.eventSummary.burns}</span>
                    </div>
                  )}
                  {contract.eventSummary.approvals > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[var(--text-tertiary)]">Approvals</span>
                      <span className="text-xs font-medium text-amber-600">{contract.eventSummary.approvals}</span>
                    </div>
                  )}
                  {contract.eventSummary.clawbacks > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[var(--text-tertiary)]">Clawbacks</span>
                      <span className="text-xs font-medium text-purple-600">{contract.eventSummary.clawbacks}</span>
                    </div>
                  )}
                  {contract.eventSummary.totalVolume && contract.eventSummary.totalVolume !== '0' && (
                    <div className="pt-2 mt-2 border-t border-[var(--border-subtle)]">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[var(--text-tertiary)]">Total Volume</span>
                        <span className="text-xs font-mono font-medium text-[var(--text-secondary)]">
                          {formatEventAmount(
                            contract.eventSummary.totalVolume,
                            contract.tokenMetadata?.decimals ?? contract.verifiedContract?.decimals ?? 7
                          )}
                          {tokenInfo?.symbol && <span className="text-[var(--text-tertiary)] ml-1">{tokenInfo.symbol}</span>}
                        </span>
                      </div>
                    </div>
                  )}
                  {contract.eventSummary.uniqueAddresses.length > 0 && (
                    <div className="pt-2 mt-2 border-t border-[var(--border-subtle)]">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[var(--text-tertiary)]">Unique Addresses</span>
                        <span className="text-xs font-medium text-[var(--text-secondary)]">{contract.eventSummary.uniqueAddresses.length}</span>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Build Verification Section */}
            {contract.verification && (
              <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Build Verification</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
                    <span className="text-[11px] text-[var(--text-tertiary)]">Status</span>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${contract.verification.isVerified ? 'text-emerald-600' : 'text-[var(--text-muted)]'}`}>
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
                    <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
                      <span className="text-[11px] text-[var(--text-tertiary)]">Source Repo</span>
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
                    <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
                      <span className="text-[11px] text-[var(--text-tertiary)]">Commit</span>
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
                        <span className="text-[11px] font-mono font-semibold text-[var(--text-secondary)]">
                          {contract.verification.commitHash.slice(0, 8)}
                        </span>
                      )}
                    </div>
                  )}
                  {contract.verification.wasmHash && (
                    <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
                      <span className="text-[11px] text-[var(--text-tertiary)]">WASM Hash</span>
                      <button
                        onClick={() => handleCopyWasm(contract.verification!.wasmHash!)}
                        className="text-[11px] font-mono font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1"
                      >
                        {contract.verification.wasmHash.slice(0, 8)}...
                        <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        {copiedWasm && <span className="text-emerald-500 text-[9px]">Copied!</span>}
                      </button>
                    </div>
                  )}
                  {contract.verification.buildWorkflow && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-[11px] text-[var(--text-tertiary)]">Build Workflow</span>
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
              <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Access Control</h3>
                <div className="space-y-3">
                  {contract.accessControl.admin && (
                    <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
                      <span className="text-[11px] text-[var(--text-tertiary)]">Admin</span>
                      <Link
                        href={`/account/${contract.accessControl.admin}`}
                        className="text-[11px] font-mono font-semibold text-sky-600 hover:text-sky-700"
                      >
                        {shortenAddress(contract.accessControl.admin)}
                      </Link>
                    </div>
                  )}
                  {contract.accessControl.owner && !contract.accessControl.admin && (
                    <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
                      <span className="text-[11px] text-[var(--text-tertiary)]">Owner</span>
                      <Link
                        href={`/account/${contract.accessControl.owner}`}
                        className="text-[11px] font-mono font-semibold text-sky-600 hover:text-sky-700"
                      >
                        {shortenAddress(contract.accessControl.owner)}
                      </Link>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
                    <span className="text-[11px] text-[var(--text-tertiary)]">Pause State</span>
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${contract.accessControl.isPaused ? 'text-amber-600' : 'text-emerald-600'}`}>
                      <span className={`w-2 h-2 rounded-full ${contract.accessControl.isPaused ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      {contract.accessControl.isPaused ? 'Paused' : 'Active'}
                    </span>
                  </div>
                  {contract.accessControl.pendingOwner && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-[11px] text-[var(--text-tertiary)]">Pending Owner</span>
                      <Link
                        href={`/account/${contract.accessControl.pendingOwner}`}
                        className="text-[11px] font-mono font-semibold text-sky-600 hover:text-sky-700"
                      >
                        {shortenAddress(contract.accessControl.pendingOwner)}
                      </Link>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Contract Metadata Section */}
            {contract.contractMetadata && (contract.contractMetadata.homeDomain || contract.contractMetadata.sourceRepo || contract.contractMetadata.customMeta) && (
              <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Contract Metadata</h3>
                <div className="space-y-3">
                  {contract.contractMetadata.homeDomain && (
                    <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
                      <span className="text-[11px] text-[var(--text-tertiary)]">Home Domain</span>
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
                    <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
                      <span className="text-[11px] text-[var(--text-tertiary)]">Source Repo</span>
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
                    <div key={key} className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)] last:border-0">
                      <span className="text-[11px] text-[var(--text-tertiary)] capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)] truncate max-w-[150px]" title={value}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* External Links */}
            <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 shadow-sm">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">External Links</h3>
              <div className="space-y-2">
                <a
                  href={`https://stellarchain.io/accounts/${contract.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors"
                >
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">Stellarchain.io</span>
                  <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                {sourceRepo && (
                  <a
                    href={sourceRepo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors"
                  >
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">Source Repository</span>
                    <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
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
