'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { shortenAddress, timeAgo, ContractInvocation } from '@/lib/stellar';
import GliderTabs from '@/components/ui/GliderTabs';
import type { TokenRegistryEntry, ContractVerification } from '@/lib/shared/interfaces';
import type { ContractMetadataResult, ContractAccessControlResult, ContractSpecResult } from '@/lib/soroban/contractMetadata';
import type { NFTInfo, VaultInfo } from '@/lib/soroban/contractExtensions';
import { ParsedEvent, EventSummary, formatEventAmount, isTransferEventData, isCustomEventData, CustomEventData } from '@/lib/soroban/events';
import type { ContractStorageResult } from '@/lib/soroban/storage';
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
  eventSummary?: EventSummary | null;
  storage?: ContractStorageResult | null;
  invocations?: ContractInvocation[];
  spec?: ContractSpecResult | null;
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

interface ContractMobileViewProps {
  contract: ContractData;
  operations: Operation[];
  onTabChange?: (tabId: 'overview' | 'operations' | 'details' | 'history' | 'interface' | 'events') => void;
}

export default function ContractMobileView({ contract, operations, onTabChange }: ContractMobileViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'operations' | 'details' | 'history' | 'interface' | 'code'>('overview');
  const [copied, setCopied] = useState(false);
  const [copiedName, setCopiedName] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const sourceCode = contract.contractCode || null;

  // Primary color for consistency with other pages
  const primaryColor = '#0F4C81';

  const handleCopy = () => {
    navigator.clipboard.writeText(contract.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyName = (name: string) => {
    navigator.clipboard.writeText(name);
    setCopiedName(true);
    setTimeout(() => setCopiedName(false), 2000);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    const upperQuery = query.toUpperCase();
    if (query.length === 56 && upperQuery.startsWith('C')) {
      window.location.href = `/contract/${upperQuery}`;
    } else if (query.length === 56 && upperQuery.startsWith('G')) {
      window.location.href = `/account/${upperQuery}`;
    } else if (query.length === 64) {
      window.location.href = `/transaction/${query.toLowerCase()}`;
    } else if (/^\d+$/.test(query)) {
      window.location.href = `/ledger/${query}`;
    } else {
      window.location.href = `/account/${query}`;
    }
    setSearchQuery('');
  };

  const tokenInfo = contract.tokenMetadata || contract.verifiedContract;
  const isToken = contract.type === 'token' || contract.type === 'lending';
  const isNFT = contract.type === 'nft';
  const isVault = contract.type === 'vault';
  const sectionLoading = contract._loading || {};
  const changeTab = (tabId: 'overview' | 'operations' | 'details' | 'history' | 'interface' | 'code') => {
    setActiveTab(tabId);

    if (tabId !== 'code') {
      if (tabId === 'operations') {
        onTabChange?.('events');
      } else {
        onTabChange?.(tabId as 'overview' | 'operations' | 'details' | 'history' | 'interface');
      }
    }
  };

  const getContractDisplayName = (): string => {
    // Helper to check if a name is an asset string (CODE:ISSUER format)
    const isAssetString = (name: string) => name.includes(':') || name.length > 30;

    // For tokens, always prefer symbol if name looks like asset string
    if (isToken && tokenInfo?.symbol) {
      // Check all possible name sources
      const possibleName = contract.verifiedContract?.name || tokenInfo?.name;
      if (!possibleName || possibleName === 'Unknown Token' || isAssetString(possibleName)) {
        return tokenInfo.symbol;
      }
    }

    // Check verified contract name (but not if it's an asset string)
    if (contract.verifiedContract?.name && !isAssetString(contract.verifiedContract.name)) {
      return contract.verifiedContract.name;
    }

    if (contract.nftInfo?.name) return contract.nftInfo.name;
    if (contract.vaultInfo?.name) return contract.vaultInfo.name;

    // For tokens, use symbol as fallback
    if (isToken && tokenInfo?.symbol) {
      return tokenInfo.symbol;
    }

    // Check tokenInfo name (but not if it's an asset string)
    if (tokenInfo?.name && tokenInfo.name !== 'Unknown Token' && !isAssetString(tokenInfo.name)) {
      return tokenInfo.name;
    }

    return 'Smart Contract';
  };

  const getContractTypeLabel = (): string => {
    if (isNFT) return 'NFT Collection';
    if (isVault) return 'Vault Contract';
    if (contract.type === 'dex') return 'DEX Contract';
    if (contract.type === 'lending') return 'Lending Protocol';
    if (isToken) return 'Token Contract';
    return 'Smart Contract';
  };

  const contractDisplayName = getContractDisplayName();

  const formatTokenAmount = (value?: string, digits = 7) => {
    if (!value) return '0';
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: digits });
  };

  const getConversionRate = () => {
    if (!contract.vaultInfo) return null;
    const totalAssets = Number(contract.vaultInfo.totalAssets);
    const totalShares = Number(contract.vaultInfo.totalShares);
    if (totalShares === 0) return '1.000000';
    return (totalAssets / totalShares).toFixed(6);
  };

  const formatSpecType = (type: any): string => {
    if (typeof type === 'string') return type;
    if (typeof type === 'object') {
      if (type.subType) {
        return `${type.type}<${formatSpecType(type.subType)}>`;
      }
      return type.type || 'Any';
    }
    return 'unknown';
  };

  type ContractTabId = 'overview' | 'history' | 'operations' | 'interface' | 'details' | 'code';
  type ContractTab = { id: ContractTabId; label: string; count?: number; hide?: boolean };

  const tabs: ContractTab[] = [
    { id: 'overview', label: 'Overview' },
    {
      id: 'history',
      label: 'History',
      count: contract.totalInvokes ?? contract.invocations?.length ?? 0,
    },
    {
      id: 'operations',
      label: 'Events',
      count: contract.eventSummary?.totalEvents ?? 0,
    },
    { id: 'code', label: 'Code', hide: contract.type !== 'contract' },
    { id: 'interface', label: 'Interface' },
    { id: 'details', label: 'Details' },
  ];

  const visibleTabs = tabs
    .filter(tab => !tab.hide)
    .map(({ hide, ...tab }) => tab);

  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-secondary)] min-h-screen flex flex-col font-sans pb-24">
      {/* Header - matching liquidity pool page */}
      <header className="sticky top-0 z-10 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/contracts"
            className="p-2 rounded-full bg-[var(--bg-secondary)] shadow-sm hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: primaryColor }}>Smart Contract</h1>
        </div>
        <div className="flex-1 max-w-[180px] ml-auto">
          <form onSubmit={handleSearch} className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-4 h-4 text-[var(--text-muted)] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-10 pr-3 py-2 bg-[var(--bg-tertiary)] border-none rounded-full text-sm text-[var(--text-secondary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent)] focus:bg-[var(--bg-secondary)] transition-colors"
            />
          </form>
        </div>
      </header>

      <main className="px-4 pt-4 max-w-lg mx-auto w-full">
        {/* Metadata Row - matching liquidity pool page */}
        <div className="flex flex-wrap items-center gap-2 mb-4 text-xs font-medium text-[var(--text-tertiary)]">
          {/* Contract Type Badge */}
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
            style={{
              backgroundColor: `${primaryColor}15`,
              color: primaryColor,
              borderColor: `${primaryColor}40`
            }}
          >
            {isNFT ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            ) : isVault ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            )}
            {getContractTypeLabel()}
          </span>

          {/* SAC/SEP-41 Badge for tokens */}
          {isToken && (
            contract.tokenMetadata?.isSAC ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                SAC
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                style={{ backgroundColor: `${primaryColor}15`, color: primaryColor, borderColor: `${primaryColor}30` }}
              >
                SEP-41
              </span>
            )
          )}
        </div>

        {/* Summary Card */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-4 mb-4">
          {/* Header: Name and Admin/Owner */}
          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1">
              <button
                onClick={() => handleCopyName(contractDisplayName)}
                className="text-lg font-bold text-[var(--text-primary)] truncate block text-left hover:opacity-80 transition-opacity"
              >
                {sectionLoading.spec ? <InlineSkeleton width="w-28" /> : contractDisplayName}
                {copiedName && <span className="text-xs text-[var(--success)] ml-2 font-normal">Copied!</span>}
              </button>
              <button
                onClick={handleCopy}
                className="text-[11px] font-mono text-[var(--text-muted)] mt-1 hover:text-[var(--text-secondary)] transition-colors flex items-center gap-1"
              >
                {shortenAddress(contract.id)}
                {copied && <span className="text-[var(--success)]">Copied!</span>}
              </button>
            </div>
            {contract.accessControl && (contract.accessControl.owner || contract.accessControl.admin) && (
              <div className="text-right flex-shrink-0 ml-3">
                <div className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-widest">
                  {contract.accessControl.admin ? 'Admin' : 'Owner'}
                </div>
                <Link
                  href={`/account/${contract.accessControl.admin || contract.accessControl.owner}`}
                  className="text-sm font-mono mt-1 block"
                  style={{ color: primaryColor }}
                >
                  {shortenAddress(contract.accessControl.admin || contract.accessControl.owner!)}
                </Link>
              </div>
            )}
          </div>

          {/* Contract Details Section */}
          <div className="mt-4 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-2xl p-4">
            {/* Token Contract Details */}
            {isToken && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-widest">Decimals</span>
                  <span className="text-base font-bold text-[var(--text-primary)] font-mono">
                    {sectionLoading.spec ? <InlineSkeleton width="w-8" /> : (contract.tokenMetadata?.decimals ?? contract.verifiedContract?.decimals ?? 7)}
                  </span>
                </div>
                {contract.verifiedContract?.description && (
                  <>
                    <div className="my-3 border-t border-dashed border-[var(--border-subtle)]"></div>
                    <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {contract.verifiedContract.description}
                    </div>
                  </>
                )}
              </>
            )}

            {/* NFT Details */}
            {isNFT && contract.nftInfo && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-widest">Collection</span>
                  <span className="text-base font-bold text-[var(--text-primary)]">{contract.nftInfo.name}</span>
                </div>
                {contract.nftInfo.totalSupply !== undefined && (
                  <>
                    <div className="my-3 border-t border-dashed border-[var(--border-subtle)]"></div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-widest">Total Supply</span>
                      <span className="text-base font-bold text-[var(--text-primary)] font-mono">
                        {formatTokenAmount(contract.nftInfo.totalSupply.toString())}
                      </span>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Vault Details */}
            {isVault && contract.vaultInfo && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-widest">Total Assets</span>
                  <span className="text-base font-bold text-[var(--text-primary)] font-mono">
                    {formatTokenAmount(contract.vaultInfo.totalAssets)}
                  </span>
                </div>
                <div className="my-3 border-t border-dashed border-[var(--border-subtle)]"></div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-widest">Total Shares</span>
                  <span className="text-base font-bold text-[var(--text-primary)] font-mono">
                    {formatTokenAmount(contract.vaultInfo.totalShares)}
                  </span>
                </div>
              </>
            )}

            {/* Generic Contract (no specific type info) */}
            {!isToken && !isNFT && !isVault && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-widest">Type</span>
                  <span className="text-base font-bold text-[var(--text-primary)]">
                    {contract.type.charAt(0).toUpperCase() + contract.type.slice(1)}
                  </span>
                </div>
                {contract.verifiedContract?.description && (
                  <>
                    <div className="my-3 border-t border-dashed border-[var(--border-subtle)]"></div>
                    <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {contract.verifiedContract.description}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Bottom info row */}
          {(isVault && contract.vaultInfo) && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-subtle)]">
              <span className="text-xs text-[var(--text-muted)]">Conversion Rate</span>
              <span className="font-mono text-sm" style={{ color: primaryColor }}>
                1 share = <span className="font-bold">{getConversionRate()}</span> assets
              </span>
            </div>
          )}

          {/* Website/Links row */}
          {(contract.verifiedContract?.website || contract.contractMetadata?.homeDomain) && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-subtle)]">
              <span className="text-xs text-[var(--text-muted)]">Website</span>
              <a
                href={contract.verifiedContract?.website || `https://${contract.contractMetadata?.homeDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold flex items-center gap-1"
                style={{ color: primaryColor }}
              >
                {contract.contractMetadata?.homeDomain || new URL(contract.verifiedContract?.website || '').hostname}
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
        </div>

        {/* Tabs - Glider Style */}
        <GliderTabs
          className="mt-3 mb-1"
          tabs={visibleTabs}
          activeId={activeTab}
          onChange={changeTab}
        />

        {/* Tab Content */}
        <div className="min-h-[200px]">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Recent Invocations */}
              <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-widest">Recent Invocations</div>
                  <span className="text-[11px] font-semibold" style={{ color: primaryColor }}>
                    {sectionLoading.invocations ? <InlineSkeleton width="w-16" height="h-3" /> : `${Math.min(contract.invocations?.length || 0, 5)} of ${contract.totalInvokes ?? contract.invocations?.length ?? 0}`}
                  </span>
                </div>
                {sectionLoading.invocations ? (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <div key={`overview-invocations-skeleton-${idx}`} className="flex items-center gap-3 py-3">
                        <div className="w-9 h-9 bg-[var(--bg-tertiary)] animate-pulse rounded-lg" />
                        <div className="flex-1 min-w-0">
                          <InlineSkeleton width="w-24" />
                          <div className="mt-2">
                            <InlineSkeleton width="w-32" height="h-3" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !contract.invocations || contract.invocations.length === 0 ? (
                  <div className="text-center py-4 text-[var(--text-muted)] text-sm">No recent invocations found</div>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {contract.invocations.slice(0, 5).map((invocation, idx) => (
                      <Link
                        key={`overview-invocation-${idx}`}
                        href={`/transaction/${invocation.txHash}`}
                        className="flex items-center gap-3 py-3 hover:bg-[var(--bg-tertiary)] -mx-4 px-4 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-[var(--text-primary)]">{invocation.functionName}</div>
                          <div className="text-[11px] text-[var(--text-tertiary)]">{timeAgo(invocation.createdAt)}</div>
                        </div>
                        <svg className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ))}
                  </div>
                )}
                {contract.invocations && contract.invocations.length > 5 && (
                  <button
                    onClick={() => changeTab('history')}
                    className="w-full mt-3 py-2 text-center text-xs font-semibold"
                    style={{ color: primaryColor }}
                  >
                    View all {contract.totalInvokes ?? contract.invocations.length} invocations
                  </button>
                )}
              </div>

              {/* Recent Activity */}
              <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-widest">Recent Activity</div>
                  {!contract._loading?.events && (
                    <span className="text-[11px] font-semibold" style={{ color: primaryColor }}>{contract.events?.length || 0} events</span>
                  )}
                </div>
                {contract._loading?.events ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 py-2">
                        <div className="w-9 h-9 bg-[var(--bg-tertiary)] animate-pulse rounded-lg" />
                        <div className="flex-1">
                          <div className="h-4 w-20 bg-[var(--bg-tertiary)] animate-pulse rounded mb-1" />
                          <div className="h-3 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                        </div>
                        <div className="h-4 w-12 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                      </div>
                    ))}
                  </div>
                ) : !contract.events || contract.events.length === 0 ? (
                  <div className="text-center py-4 text-[var(--text-muted)] text-sm">No recent activity found</div>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {contract.events.slice(0, 5).map((event, idx) => {
                      const displayName = event.type !== 'unknown'
                        ? event.type
                        : (event.rawEventName || 'event');
                      const customData = isCustomEventData(event.data) ? event.data : null;
                      const subType = customData?.subType;

                      const eventContent = (
                        <div className="flex items-center gap-3 py-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${event.type === 'transfer' ? 'bg-blue-500/10 text-blue-400' :
                            event.type === 'mint' ? 'bg-green-500/10 text-green-400' :
                              event.type === 'burn' ? 'bg-orange-500/10 text-orange-400' :
                                event.type === 'approve' ? 'bg-purple-500/10 text-purple-400' :
                                  'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                            }`}
                            style={event.type === 'unknown' ? { backgroundColor: `${primaryColor}15`, color: primaryColor } : {}}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-[var(--text-primary)]">
                              {displayName}{subType && <span className="text-[var(--text-tertiary)] font-normal"> · {subType}</span>}
                            </div>
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
                          <svg className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      );

                      return event.txHash ? (
                        <Link key={idx} href={`/transaction/${event.txHash}`} className="block hover:bg-[var(--bg-tertiary)] -mx-4 px-4 transition-colors">
                          {eventContent}
                        </Link>
                      ) : (
                        <div key={idx}>{eventContent}</div>
                      );
                    })}
                  </div>
                )}
                {contract.events && contract.events.length > 5 && (
                  <button
                    onClick={() => changeTab('operations')}
                    className="w-full mt-3 py-2 text-center text-xs font-semibold"
                    style={{ color: primaryColor }}
                  >
                    View all {contract.events.length} events
                  </button>
                )}
              </div>

              {/* Storage Section */}
              <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" style={{ color: primaryColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                    <span className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-widest">Storage</span>
                  </div>
                  {!contract._loading?.storage && contract.storage && (
                    <span className="text-[11px] font-semibold" style={{ color: primaryColor }}>{contract.storage.totalEntries} entries</span>
                  )}
                </div>
                {contract._loading?.storage ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded-full" />
                          <div className="h-4 w-24 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                        </div>
                        <div className="h-4 w-16 bg-[var(--bg-tertiary)] animate-pulse rounded" />
                      </div>
                    ))}
                  </div>
                ) : !contract.storage || contract.storage.entries.length === 0 ? (
                  <div className="text-center py-4 text-[var(--text-muted)] text-sm">No storage data found</div>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {contract.storage.entries.map((entry, idx) => (
                      <div key={idx} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex-shrink-0 ${entry.durability === 'instance' ? 'text-white' :
                            entry.durability === 'persistent' ? 'bg-[var(--success)]/10 text-[var(--success)]' :
                              'bg-amber-500/10 text-amber-400'
                            }`}
                            style={entry.durability === 'instance' ? { backgroundColor: primaryColor } : {}}
                          >
                            {entry.durability}
                          </span>
                          <span className="text-xs font-medium text-[var(--text-secondary)] truncate">{entry.keyDisplay}</span>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <span className="text-xs font-mono text-[var(--text-tertiary)] truncate max-w-[120px] block">
                            {entry.valueDisplay}
                          </span>
                          {entry.expirationLedger && (
                            <div className="text-[10px] text-[var(--text-muted)]">Exp: {entry.expirationLedger}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)]">
              <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[var(--border-subtle)]">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Contract functions Invocations History</h3>
                <span className="rounded-full bg-[var(--bg-tertiary)] px-2.5 py-1 text-[10px] font-bold text-[var(--text-tertiary)]">
                  {sectionLoading.invocations ? <InlineSkeleton width="w-16" height="h-3" /> : `${contract.totalInvokes ?? contract.invocations?.length ?? 0} invocations`}
                </span>
              </div>
              {sectionLoading.invocations ? (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <div key={`history-skeleton-${idx}`} className="flex items-center gap-3 p-4">
                      <div className="w-9 h-9 rounded-lg bg-[var(--bg-tertiary)] animate-pulse flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <InlineSkeleton width="w-20" />
                        <div className="mt-2">
                          <InlineSkeleton width="w-40" height="h-3" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !contract.invocations || contract.invocations.length === 0 ? (
                <div className="text-center py-4 text-[var(--text-muted)] text-sm">No transaction history found</div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {contract.invocations.map((invocation, idx) => {
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
                        case 'harvest': return resultAmt ? `Harvested ${resultAmt} ${resultAsset}` : 'Harvested rewards';
                        case 'plant': return amount ? `Planted ${amount}${symbol ? ` ${symbol}` : ''}` : 'Planted tokens';
                        case 'transfer': return resultAmt || amount ? `Sent ${resultAmt || amount}${symbol ? ` ${symbol}` : ''}${targetAddr ? ` to ${targetAddr}` : ''}` : 'Transferred tokens';
                        case 'mint': return resultAmt || amount ? `Minted ${resultAmt || amount}${symbol ? ` ${symbol}` : ''}` : 'Minted tokens';
                        case 'burn': return resultAmt || amount ? `Burned ${resultAmt || amount}${symbol ? ` ${symbol}` : ''}` : 'Burned tokens';
                        case 'approve': return `Approved spending${targetAddr ? ` for ${targetAddr}` : ''}`;
                        case 'deposit': return resultAmt || amount ? `Deposited ${resultAmt || amount}${symbol ? ` ${symbol}` : ''}` : 'Made a deposit';
                        case 'withdraw': return resultAmt || amount ? `Withdrew ${resultAmt || amount} ${resultAsset}` : 'Made a withdrawal';
                        case 'stake': return resultAmt || amount ? `Staked ${resultAmt || amount}${symbol ? ` ${symbol}` : ''}` : 'Staked tokens';
                        case 'unstake': return resultAmt || amount ? `Unstaked ${resultAmt || amount}${symbol ? ` ${symbol}` : ''}` : 'Unstaked tokens';
                        case 'claim': return resultAmt ? `Claimed ${resultAmt} ${resultAsset}` : 'Claimed rewards';
                        case 'swap': return 'Swapped tokens';
                        case 'initialize': return 'Initialized contract';
                        default: return null;
                      }
                    };

                    const summary = getActionSummary();

                    return (
                      <Link
                        key={idx}
                        href={`/transaction/${invocation.txHash}`}
                        className="flex items-center gap-3 p-4 hover:bg-[var(--bg-tertiary)] transition-colors"
                      >
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-bold" style={{ color: primaryColor }}>
                              {invocation.functionName}
                            </span>
                          </div>
                          {summary && (
                            <div className="text-xs text-[var(--text-secondary)] mt-0.5">{summary}</div>
                          )}
                          <div className="text-[11px] text-[var(--text-muted)] mt-1">
                            {timeAgo(invocation.createdAt)}
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* EVENTS TAB */}
          {activeTab === 'operations' && (
            <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)]">
              {sectionLoading.events ? (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={`events-skeleton-${idx}`} className="flex items-center gap-3 p-4">
                      <div className="w-9 h-9 rounded-lg bg-[var(--bg-tertiary)] animate-pulse flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <InlineSkeleton width="w-24" />
                        <div className="mt-2">
                          <InlineSkeleton width="w-36" height="h-3" />
                        </div>
                      </div>
                      <InlineSkeleton width="w-10" />
                    </div>
                  ))}
                </div>
              ) : !contract.events || contract.events.length === 0 ? (
                <div className="text-center py-4 text-[var(--text-muted)] text-sm">No events found</div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {contract.events.map((event, idx) => {
                    const displayName = event.type !== 'unknown'
                      ? event.type
                      : (event.rawEventName || 'event');
                    const customData = isCustomEventData(event.data) ? event.data : null;
                    const decodedTopics = customData?.decodedTopics;
                    const decodedValue = customData?.decodedValue;
                    const subType = customData?.subType;

                    const eventContent = (
                      <div className="flex items-center gap-3 p-4">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${event.type === 'transfer' ? 'bg-blue-500/10 text-blue-400' :
                          event.type === 'mint' ? 'bg-green-500/10 text-green-400' :
                            event.type === 'burn' ? 'bg-orange-500/10 text-orange-400' :
                              event.type === 'approve' ? 'bg-purple-500/10 text-purple-400' :
                                event.type === 'clawback' ? 'bg-[var(--error)]/10 text-[var(--error)]' :
                                  'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                          }`}
                          style={!['transfer', 'mint', 'burn', 'approve', 'clawback'].includes(event.type) ? { backgroundColor: `${primaryColor}15`, color: primaryColor } : {}}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-[var(--text-primary)]">
                            {displayName}{subType && <span className="text-[var(--text-tertiary)] font-normal"> · {subType}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {event.timestamp && (
                              <span className="text-[11px] text-[var(--text-tertiary)]">{timeAgo(event.timestamp)}</span>
                            )}
                            {isTransferEventData(event.data) && (
                              <>
                                <span className="text-[var(--border-default)]">·</span>
                                <span className="text-[11px] font-mono text-[var(--text-tertiary)]">
                                  {shortenAddress(event.data.from)} → {shortenAddress(event.data.to)}
                                </span>
                              </>
                            )}
                          </div>
                          {decodedTopics && decodedTopics.length > 0 && (
                            <dl className="mt-2 grid gap-1 sm:grid-cols-2 text-[10px] text-[var(--text-muted)]">
                              {decodedTopics.map((topic: string, idx: number) => (
                                <div key={`decoded-topic-${idx}`} className="rounded-xl bg-[var(--bg-tertiary)] px-2 py-1 text-[var(--text-secondary)]">
                                  <dt className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">Topic {idx + 1}</dt>
                                  <dd className="font-mono truncate block leading-tight max-w-full">{topic}</dd>
                                </div>
                              ))}
                            </dl>
                          )}
                          {decodedValue && (
                            <div className="mt-2 rounded-xl bg-[var(--bg-tertiary)] px-2 py-1 text-[10px] text-[var(--text-muted)] font-mono">
                              <span className="text-[8px] uppercase tracking-wider text-[var(--text-secondary)] block">Value</span>
                              {decodedValue}
                            </div>
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
                        <svg className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    );

                    return event.txHash ? (
                      <Link
                        key={idx}
                        href={`/transaction/${event.txHash}`}
                        className="block hover:bg-[var(--bg-tertiary)] transition-colors"
                      >
                        {eventContent}
                      </Link>
                    ) : (
                      <div key={idx}>{eventContent}</div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* INTERFACE TAB */}
          {activeTab === 'interface' && (
            <div className="space-y-4">
              {sectionLoading.spec ? (
                <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-default)] p-4">
                  <div className="flex items-center justify-between mb-4">
                    <InlineSkeleton width="w-28" />
                    <InlineSkeleton width="w-14" height="h-5" />
                  </div>
                  <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <InlineSkeleton key={`spec-skeleton-${idx}`} width="w-full" height="h-3" />
                    ))}
                  </div>
                </div>
              ) : contract.spec ? (
                <div className="bg-[var(--bg-tertiary)] rounded-xl shadow-md border border-[var(--border-default)] overflow-hidden font-mono text-xs text-[var(--text-secondary)] relative group">
                  <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      onClick={() => {
                        const text = document.getElementById('contract-interface-code')?.innerText;
                        if (text) navigator.clipboard.writeText(text);
                      }}
                      className="bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-1 rounded text-[10px] font-sans font-medium transition-colors border border-[var(--border-default)] shadow-sm"
                    >
                      Copy
                    </button>
                  </div>

                  <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-tertiary)]">
                    <span className="font-bold text-[var(--text-muted)] text-[11px] uppercase tracking-wider">Contract Interface</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-medium px-2 py-0.5 rounded bg-[var(--bg-primary)]">Rust / WASM</span>
                  </div>
                  <div className="p-4 overflow-x-auto custom-scrollbar">
                    <pre id="contract-interface-code" className="whitespace-pre font-mono text-[11px] leading-relaxed">
                      <span className="text-[var(--text-tertiary)] italic block mb-4">// Protocol version: 20 (Soroban)</span>
                      {contract.spec.functions.map((fn, idx) => (
                        <div key={idx} className="mb-4 last:mb-0 group/fn">
                          {fn.doc && (
                            <div className="text-[var(--text-tertiary)] italic mb-1">
                              {fn.doc.split('\n').map((line, i) => (
                                <div key={i}>/// {line}</div>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap items-baseline">
                            <span className="text-[#c678dd] mr-2">fn</span>
                            <span className="text-[#61afef] font-bold mr-1">{fn.name}</span>
                            <span className="text-[var(--text-muted)]">(</span>
                            <div className="inline-flex flex-col md:flex-row md:items-baseline">
                              {fn.inputs.map((arg, argIdx) => (
                                <span key={argIdx} className="whitespace-nowrap">
                                  {argIdx > 0 && <span className="text-[var(--text-tertiary)] mr-1">, </span>}
                                  <span className="text-[#e06c75]">{arg.name}</span>
                                  <span className="text-[var(--text-tertiary)] mr-1">: </span>
                                  <span className="text-[#98c379]">{formatSpecType(arg.type)}</span>
                                </span>
                              ))}
                            </div>
                            <span className="text-[var(--text-muted)]">)</span>
                            {fn.outputs && fn.outputs.length > 0 && (
                              <>
                                <span className="text-[var(--text-tertiary)] mx-2">-&gt;</span>
                                <span className="text-[#98c379]">
                                  {fn.outputs.length === 1 ? formatSpecType(fn.outputs[0]) : `(${fn.outputs.map(formatSpecType).join(', ')})`}
                                </span>
                              </>
                            )}
                            <span className="text-[var(--text-muted)] ml-1">;</span>
                          </div>
                        </div>
                      ))}
                      {contract.spec.udts.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                          <div className="text-[var(--text-muted)] uppercase text-[10px] tracking-widest font-bold mb-4">// Types</div>
                          {contract.spec.udts.map((udt, idx) => (
                            <div key={idx} className="mb-4">
                              <div className="text-[var(--text-tertiary)] italic mb-1">/// {udt.doc}</div>
                              <div>
                                <span className="text-[#c678dd] mr-2">{udt.type}</span>
                                <span className="text-[#e5c07b] font-bold">{udt.name}</span>
                                <span className="text-[var(--text-muted)] ml-2">{'{'}</span>
                              </div>
                              <div className="pl-4 border-l-2 border-[var(--border-subtle)] ml-1 my-1">
                                {udt.fields.map((field, fIdx) => (
                                  <div key={fIdx}>
                                    <span className="text-[#e06c75]">{field.name}</span>
                                    {field.type && (
                                      <>
                                        <span className="text-[var(--text-tertiary)] mr-1">: </span>
                                        <span className="text-[#98c379]">{formatSpecType(field.type)}</span>
                                      </>
                                    )}
                                    <span className="text-[var(--text-tertiary)]">,</span>
                                  </div>
                                ))}
                              </div>
                              <div className="text-[var(--text-muted)]">{'}'}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-default)] p-4 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2">Interface Not Available</h3>
                  <p className="text-sm text-[var(--text-tertiary)] max-w-xs">
                    The XDR specification for this contract could not be retrieved.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* DETAILS TAB */}
          {activeTab === 'details' && (
            <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)]">
              <div className="divide-y divide-[var(--border-subtle)]">
                {[
                  { label: 'Contract ID', value: contract.id, mono: true },
                  { label: 'Type', value: contract.type.charAt(0).toUpperCase() + contract.type.slice(1) },
                  { label: 'Verified', value: contract.isVerified ? 'Yes' : 'No' },
                  ...(contract.verification ? [
                    { label: 'Build Verified', value: contract.verification.isVerified ? 'Yes' : 'No' },
                    ...(contract.verification.wasmHash ? [{ label: 'WASM Hash', value: contract.verification.wasmHash, mono: true }] : []),
                  ] : []),
                  ...(isToken ? [
                    { label: 'Token Name', value: contractDisplayName },
                    { label: 'Token Symbol', value: tokenInfo?.symbol || 'Unknown' },
                    { label: 'Decimals', value: (contract.tokenMetadata?.decimals ?? contract.verifiedContract?.decimals ?? 7).toString() },
                    { label: 'Is SAC', value: contract.tokenMetadata?.isSAC ? 'Yes' : 'No' },
                  ] : []),
                  ...(isNFT && contract.nftInfo ? [
                    { label: 'Collection Name', value: contract.nftInfo.name },
                    { label: 'Symbol', value: contract.nftInfo.symbol },
                    ...(contract.nftInfo.totalSupply !== undefined ? [{ label: 'Total Supply', value: contract.nftInfo.totalSupply.toString() }] : []),
                  ] : []),
                  ...(isVault && contract.vaultInfo ? [
                    { label: 'Vault Name', value: contract.vaultInfo.name },
                    { label: 'Symbol', value: contract.vaultInfo.symbol },
                    { label: 'Underlying Asset', value: contract.vaultInfo.underlyingAsset, mono: true, isContractLink: true },
                    { label: 'Total Assets', value: formatTokenAmount(contract.vaultInfo.totalAssets) },
                    { label: 'Total Shares', value: formatTokenAmount(contract.vaultInfo.totalShares) },
                    { label: 'Conversion Rate', value: `${getConversionRate()} assets/share` },
                  ] : []),
                  ...(contract.accessControl?.owner ? [{ label: 'Owner', value: contract.accessControl.owner, mono: true, isAccountLink: true }] : []),
                  ...(contract.accessControl?.admin ? [{ label: 'Admin', value: contract.accessControl.admin, mono: true, isAccountLink: true }] : []),
                  ...(contract.accessControl?.isPaused ? [{ label: 'Paused', value: 'Yes' }] : []),
                  ...(contract.contractMetadata?.homeDomain ? [{ label: 'Home Domain', value: contract.contractMetadata.homeDomain, isLink: true, linkPrefix: 'https://' }] : []),
                  ...(contract.verifiedContract?.website ? [{ label: 'Website', value: contract.verifiedContract.website, isLink: true }] : []),
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-start p-4">
                    <span className="text-xs text-[var(--text-tertiary)] font-medium">{item.label}</span>
                    {item.isLink ? (
                      <a href={item.linkPrefix ? item.linkPrefix + item.value : item.value} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold hover:underline truncate max-w-[180px]" style={{ color: primaryColor }}>
                        {item.value}
                      </a>
                    ) : item.isAccountLink ? (
                      <Link href={`/account/${item.value}`} className="text-xs font-semibold hover:underline font-mono truncate max-w-[180px]" style={{ color: primaryColor }}>
                        {shortenAddress(item.value)}
                      </Link>
                    ) : item.isContractLink ? (
                      <Link href={`/contract/${item.value}`} className="text-xs font-semibold hover:underline font-mono truncate max-w-[180px]" style={{ color: primaryColor }}>
                        {shortenAddress(item.value)}
                      </Link>
                    ) : (
                      <span className={`text-xs font-semibold text-[var(--text-secondary)] text-right ${item.mono ? 'font-mono break-all max-w-[180px]' : ''}`}>
                        {item.value}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CODE TAB */}
          {activeTab === 'code' && (
            <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)]">
              <div className="p-4 border-b border-[var(--border-subtle)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Source Code</h3>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">Contract source code</p>
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
                        fontSize: '10px',
                        maxHeight: '500px',
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
      </main>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
