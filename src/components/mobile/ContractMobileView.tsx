'use client';

import { useState } from 'react';
import Link from 'next/link';
import { shortenAddress, timeAgo, getOperationTypeLabel, ContractInvocation } from '@/lib/stellar';
import type { TokenRegistryEntry, ContractVerification } from '@/lib/types/token';
import type { ContractMetadataResult, ContractAccessControlResult } from '@/lib/contractMetadata';
import type { NFTInfo, VaultInfo } from '@/lib/contractExtensions';
import { ParsedEvent, EventSummary, formatEventAmount, isTransferEventData, isCustomEventData, CustomEventData } from '@/lib/eventParser';
import type { ContractStorageResult } from '@/lib/contractStorage';

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
  // New fields
  verification?: ContractVerification | null;
  contractMetadata?: ContractMetadataResult | null;
  accessControl?: ContractAccessControlResult | null;
  nftInfo?: NFTInfo | null;
  vaultInfo?: VaultInfo | null;
  events?: ParsedEvent[];
  eventSummary?: EventSummary | null;
  storage?: ContractStorageResult | null;
  invocations?: ContractInvocation[];
}

interface ContractMobileViewProps {
  contract: ContractData;
  operations: Operation[];
}

export default function ContractMobileView({ contract, operations }: ContractMobileViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'operations' | 'details' | 'history'>('overview');
  const [copied, setCopied] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(contract.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyHash = (hash: string, type: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(type);
    setTimeout(() => setCopiedHash(null), 2000);
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

  // Calculate vault conversion rate
  const getConversionRate = () => {
    if (!contract.vaultInfo) return null;
    const totalAssets = Number(contract.vaultInfo.totalAssets);
    const totalShares = Number(contract.vaultInfo.totalShares);
    if (totalShares === 0) return '1.000000';
    return (totalAssets / totalShares).toFixed(6);
  };

  return (
    <div className="bg-[#f0f4f3] text-slate-800 min-h-screen flex flex-col font-sans pb-24">
      <main className="flex-1 px-6 pt-2 pb-8 max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 mt-1">
          <Link
            href="/"
            className="flex items-center text-slate-400 hover:text-slate-700 transition-colors text-xs font-semibold uppercase tracking-wide"
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>

          <div className="flex items-center gap-2">
            {contract.verification?.isVerified && (
              <div className="flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-blue-100 text-blue-700 border-blue-200">
                <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Build Verified
              </div>
            )}
            {contract.isVerified && (
              <div className="flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-100 text-emerald-700 border-emerald-200">
                <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Verified
              </div>
            )}
          </div>
        </div>

        {/* Contract Info Card */}
        <div className="bg-white rounded-xl border border-slate-100 p-4 mb-5">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isNFT ? 'bg-gradient-to-br from-pink-500 to-rose-600' :
              isVault ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
              isToken ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-slate-600 to-slate-800'
            } text-white text-xl font-bold shadow-lg`}>
              {isNFT ? (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ) : isVault ? (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ) : (
                tokenInfo?.symbol?.slice(0, 2) || 'SC'
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest">
                {isNFT ? 'NFT Collection' :
                 isVault ? 'Vault Contract' :
                 contract.type === 'dex' ? 'DEX Contract' :
                 contract.type === 'lending' ? 'Lending Protocol' :
                 isToken ? 'Token Contract' : 'Smart Contract'}
              </div>
              <div className="text-xl font-bold text-slate-900 mt-0.5 truncate">
                {contractDisplayName}
              </div>
              {(isToken || isNFT || isVault) && (tokenInfo?.symbol || contract.nftInfo?.symbol || contract.vaultInfo?.symbol) && (
                <div className="text-sm font-semibold text-slate-500">
                  {contract.nftInfo?.symbol || contract.vaultInfo?.symbol || tokenInfo?.symbol}
                </div>
              )}
            </div>
          </div>

          {/* Contract ID */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest">Contract ID</span>
              <button
                onClick={handleCopy}
                className="text-[9px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wide flex items-center gap-1"
              >
                {copied ? 'Copied!' : 'Copy'}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <div className="font-mono text-xs text-slate-700 break-all mt-1">{contract.id}</div>
          </div>

          {/* Token Info (if applicable) */}
          {isToken && (
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest">Decimals</div>
                <div className="text-sm font-bold text-slate-900 mt-1">
                  {contract.tokenMetadata?.decimals ?? contract.verifiedContract?.decimals ?? 7}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest">Type</div>
                <div className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                  {contract.tokenMetadata?.isSAC ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                      SAC
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold bg-purple-50 text-purple-600 border border-purple-100">
                      SEP-41
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* NFT Info */}
          {isNFT && contract.nftInfo && (
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest">Collection</div>
                <div className="text-sm font-bold text-slate-900 mt-1">{contract.nftInfo.name}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest">Symbol</div>
                <div className="text-sm font-bold text-slate-900 mt-1">{contract.nftInfo.symbol}</div>
              </div>
              {contract.nftInfo.totalSupply !== undefined && (
                <div className="col-span-2">
                  <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest">Total Supply</div>
                  <div className="text-sm font-bold text-slate-900 mt-1">{formatTokenAmount(contract.nftInfo.totalSupply.toString())}</div>
                </div>
              )}
            </div>
          )}

          {/* Vault Info */}
          {isVault && contract.vaultInfo && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest">Underlying Asset</div>
                <Link
                  href={`/contract/${contract.vaultInfo.underlyingAsset}`}
                  className="text-sm font-mono font-semibold text-indigo-600 hover:text-indigo-700 mt-1 block truncate"
                >
                  {shortenAddress(contract.vaultInfo.underlyingAsset, 8)}
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest">Total Assets</div>
                  <div className="text-sm font-bold text-slate-900 mt-1">{formatTokenAmount(contract.vaultInfo.totalAssets)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest">Total Shares</div>
                  <div className="text-sm font-bold text-slate-900 mt-1">{formatTokenAmount(contract.vaultInfo.totalShares)}</div>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest">Conversion Rate</div>
                <div className="text-sm font-bold text-slate-900 mt-1">{getConversionRate()} assets/share</div>
              </div>
            </div>
          )}

          {/* Website link if verified */}
          {contract.verifiedContract?.website && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <a
                href={contract.verifiedContract.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Visit Website
              </a>
            </div>
          )}
        </div>

        {/* Build Verification Section */}
        {contract.verification && (
          <div className="bg-white rounded-xl border border-slate-100 p-4 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-sm font-bold text-slate-900">Build Verification</span>
              <span className={`ml-auto px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                contract.verification.isVerified
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {contract.verification.isVerified ? 'Verified' : 'Unverified'}
              </span>
            </div>

            <div className="space-y-3">
              {contract.verification.sourceRepo && (
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest mb-1">Source Repository</div>
                  <a
                    href={contract.verification.sourceRepo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    <span className="truncate">{contract.verification.sourceRepo.replace('https://github.com/', '')}</span>
                  </a>
                </div>
              )}

              {contract.verification.commitHash && (
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest mb-1">Commit Hash</div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-700">{contract.verification.commitHash.slice(0, 12)}...</span>
                    <button
                      onClick={() => handleCopyHash(contract.verification!.commitHash!, 'commit')}
                      className="text-[9px] font-bold text-indigo-600 hover:text-indigo-700 uppercase"
                    >
                      {copiedHash === 'commit' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {contract.verification.wasmHash && (
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest mb-1">WASM Hash</div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-700">{contract.verification.wasmHash.slice(0, 16)}...</span>
                    <button
                      onClick={() => handleCopyHash(contract.verification!.wasmHash!, 'wasm')}
                      className="text-[9px] font-bold text-indigo-600 hover:text-indigo-700 uppercase"
                    >
                      {copiedHash === 'wasm' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Access Control Section */}
        {contract.accessControl && (contract.accessControl.owner || contract.accessControl.admin || contract.accessControl.isPaused) && (
          <div className="bg-white rounded-xl border border-slate-100 p-4 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <span className="text-sm font-bold text-slate-900">Access Control</span>
              {contract.accessControl.isPaused && (
                <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-semibold bg-red-100 text-red-700">
                  Paused
                </span>
              )}
            </div>

            <div className="space-y-3">
              {(contract.accessControl.admin || contract.accessControl.owner) && (
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest mb-1">
                    {contract.accessControl.admin ? 'Admin' : 'Owner'}
                  </div>
                  <Link
                    href={`/account/${contract.accessControl.admin || contract.accessControl.owner}`}
                    className="font-mono text-xs text-indigo-600 hover:text-indigo-700 break-all"
                  >
                    {shortenAddress(contract.accessControl.admin || contract.accessControl.owner!, 8)}
                  </Link>
                </div>
              )}

              {contract.accessControl.pendingOwner && (
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest mb-1">Pending Owner</div>
                  <Link
                    href={`/account/${contract.accessControl.pendingOwner}`}
                    className="font-mono text-xs text-amber-600 hover:text-amber-700 break-all"
                  >
                    {shortenAddress(contract.accessControl.pendingOwner, 8)}
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contract Metadata Section */}
        {contract.contractMetadata && (contract.contractMetadata.homeDomain || contract.contractMetadata.sourceRepo || (contract.contractMetadata.customMeta && Object.keys(contract.contractMetadata.customMeta).length > 0)) && (
          <div className="bg-white rounded-xl border border-slate-100 p-4 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-bold text-slate-900">Contract Metadata</span>
            </div>

            <div className="space-y-3">
              {contract.contractMetadata.homeDomain && (
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest mb-1">Home Domain</div>
                  <a
                    href={`https://${contract.contractMetadata.homeDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    {contract.contractMetadata.homeDomain}
                  </a>
                </div>
              )}

              {contract.contractMetadata.sourceRepo && (
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest mb-1">Source Repository</div>
                  <a
                    href={contract.contractMetadata.sourceRepo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    <span className="truncate">{contract.contractMetadata.sourceRepo.replace('https://github.com/', '')}</span>
                  </a>
                </div>
              )}

              {contract.contractMetadata.customMeta && Object.keys(contract.contractMetadata.customMeta).length > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest mb-2">Custom Metadata</div>
                  <div className="space-y-2">
                    {Object.entries(contract.contractMetadata.customMeta).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-start">
                        <span className="text-[10px] text-slate-500 font-medium">{key}</span>
                        <span className="text-xs font-semibold text-slate-700 text-right max-w-[180px] truncate">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="flex gap-6 border-b border-slate-100 pb-4 mb-4">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'history', label: 'History', count: contract.invocations?.length || 0 },
            { id: 'operations', label: 'Events', count: contract.events?.length || 0 },
            { id: 'details', label: 'Details' },
          ].filter(tab => tab.id !== 'history' || (contract.invocations && contract.invocations.length > 0)).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`text-sm font-semibold relative ${
                activeTab === tab.id
                  ? 'text-slate-900 after:absolute after:-bottom-4 after:left-0 after:right-0 after:h-0.5 after:bg-slate-900'
                  : 'text-slate-400 hover:text-slate-600'
              } transition-colors`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-1 py-0.5 px-1.5 rounded-full text-[10px] ${
                  activeTab === tab.id ? 'bg-slate-100 text-slate-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[200px]">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Description */}
              {contract.verifiedContract?.description && (
                <div className="bg-white border border-slate-100 rounded-xl p-4">
                  <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest mb-2">Description</div>
                  <p className="text-sm text-slate-700 leading-relaxed">{contract.verifiedContract.description}</p>
                </div>
              )}

              {/* Recent Activity - Shows Events for Contracts */}
              <div className="bg-white border border-slate-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest">Recent Activity</div>
                  <span className="text-[10px] font-semibold text-slate-500">{contract.events?.length || 0} events</span>
                </div>
                {!contract.events || contract.events.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-sm">No recent activity found</div>
                ) : (
                  <div className="space-y-2">
                    {contract.events.slice(0, 5).map((event, idx) => {
                      // Get display name - use raw event name for custom events
                      const displayName = event.type !== 'unknown'
                        ? event.type
                        : (event.rawEventName || 'event');
                      const customData = isCustomEventData(event.data) ? event.data : null;
                      const subType = customData?.subType;

                      const eventContent = (
                        <div className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              event.type === 'transfer' ? 'bg-blue-50 text-blue-600' :
                              event.type === 'mint' ? 'bg-green-50 text-green-600' :
                              event.type === 'burn' ? 'bg-orange-50 text-orange-600' :
                              event.type === 'approve' ? 'bg-purple-50 text-purple-600' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-slate-900">
                                {displayName}{subType && <span className="text-slate-500 font-normal"> · {subType}</span>}
                              </div>
                              {event.timestamp && (
                                <div className="text-[10px] text-slate-500">{timeAgo(event.timestamp)}</div>
                              )}
                            </div>
                          </div>
                          {isTransferEventData(event.data) && (
                            <div className="text-right">
                              <div className="text-xs font-bold text-slate-900">
                                {formatEventAmount(event.data.amount || '0', contract.tokenMetadata?.decimals || 7)}
                              </div>
                              <div className="text-[9px] text-slate-500">{tokenInfo?.symbol || ''}</div>
                            </div>
                          )}
                          {customData?.account && (
                            <div className="text-right">
                              <div className="text-[10px] font-mono text-slate-500">
                                {shortenAddress(customData.account, 4)}
                              </div>
                            </div>
                          )}
                        </div>
                      );

                      return event.txHash ? (
                        <Link key={idx} href={`/transaction/${event.txHash}`} className="block">
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
                    onClick={() => setActiveTab('operations')}
                    className="w-full mt-3 py-2 text-center text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    View all {contract.events.length} events
                  </button>
                )}
              </div>

              {/* Storage Section */}
              <div className="bg-white border border-slate-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest">Storage</span>
                  </div>
                  {contract.storage && (
                    <span className="text-[10px] font-semibold text-slate-500">{contract.storage.totalEntries} entries</span>
                  )}
                </div>
                {!contract.storage || contract.storage.entries.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-sm">No storage data found</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {contract.storage.entries.map((entry, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            entry.durability === 'instance' ? 'bg-indigo-100 text-indigo-700' :
                            entry.durability === 'persistent' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {entry.durability}
                          </span>
                          <span className="text-xs font-medium text-slate-700">{entry.keyDisplay}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono text-slate-500 truncate max-w-[150px] block">
                            {entry.valueDisplay}
                          </span>
                          {entry.expirationLedger && (
                            <div className="text-[9px] text-slate-400">Exp: {entry.expirationLedger}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* HISTORY TAB - Contract Invocations */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {!contract.invocations || contract.invocations.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No transaction history found</div>
              ) : (
                contract.invocations.map((invocation, idx) => {
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
                    const targetAddr = addressParams[0]?.decoded ? shortenAddress(addressParams[0].decoded, 4) : '';

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
                        return null; // No summary for unknown functions
                    }
                  };

                  const summary = getActionSummary();

                  return (
                    <Link
                      key={idx}
                      href={`/transaction/${invocation.txHash}`}
                      className="block bg-white rounded-xl p-4  border border-slate-100 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-sky-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-mono text-xs text-sky-600">
                              {shortenAddress(invocation.sourceAccount, 4)}
                            </span>
                            <span className="text-slate-400 text-xs">invoked</span>
                            <span className="font-mono text-sm font-bold text-indigo-600">
                              {invocation.functionName}
                            </span>
                          </div>
                          {summary && (
                            <div className="text-xs text-slate-600 mb-1">
                              {summary}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 mt-1">
                            {new Date(invocation.createdAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          )}

          {/* EVENTS TAB (renamed from Operations) */}
          {activeTab === 'operations' && (
            <div className="space-y-3">
              {!contract.events || contract.events.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No events found</div>
              ) : (
                contract.events.map((event, idx) => {
                  // Get display name - use raw event name for custom events
                  const displayName = event.type !== 'unknown'
                    ? event.type
                    : (event.rawEventName || 'event');
                  const customData = isCustomEventData(event.data) ? event.data : null;
                  const subType = customData?.subType;

                  const eventContent = (
                    <div className="flex items-center gap-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        event.type === 'transfer' ? 'bg-blue-100 text-blue-600' :
                        event.type === 'mint' ? 'bg-green-100 text-green-600' :
                        event.type === 'burn' ? 'bg-orange-100 text-orange-600' :
                        event.type === 'approve' ? 'bg-purple-100 text-purple-600' :
                        event.type === 'clawback' ? 'bg-red-100 text-red-600' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-900">
                            {displayName}{subType && <span className="text-slate-500 font-normal"> · {subType}</span>}
                          </span>
                          {isTransferEventData(event.data) && (
                            <span className="text-xs font-bold text-slate-900">
                              {formatEventAmount(event.data.amount || '0', contract.tokenMetadata?.decimals || 7)} <span className="text-[9px] text-slate-500">{tokenInfo?.symbol || ''}</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {event.timestamp && (
                            <span className="text-[10px] text-slate-500">{timeAgo(event.timestamp)}</span>
                          )}
                          {isTransferEventData(event.data) && (
                            <>
                              <span className="text-slate-300">|</span>
                              <span className="text-[10px] font-mono text-slate-500">
                                {shortenAddress(event.data.from, 4)} → {shortenAddress(event.data.to, 4)}
                              </span>
                            </>
                          )}
                          {customData?.account && (
                            <>
                              <span className="text-slate-300">|</span>
                              <span className="text-[10px] font-mono text-slate-500">
                                {shortenAddress(customData.account, 4)}
                              </span>
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
                      className="block bg-white border border-slate-100 rounded-xl p-3 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors"
                    >
                      {eventContent}
                    </Link>
                  ) : (
                    <div
                      key={idx}
                      className="block bg-white border border-slate-100 rounded-xl p-3"
                    >
                      {eventContent}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* DETAILS TAB */}
          {activeTab === 'details' && (
            <div className="space-y-3">
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
                <div key={i} className="flex justify-between items-start py-2.5 border-b border-slate-100 last:border-0">
                  <span className="text-xs text-slate-500 font-medium">{item.label}</span>
                  {item.isLink ? (
                    <a href={item.linkPrefix ? item.linkPrefix + item.value : item.value} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-indigo-600 hover:underline truncate max-w-[180px]">
                      {item.value}
                    </a>
                  ) : item.isAccountLink ? (
                    <Link href={`/account/${item.value}`} className="text-xs font-semibold text-indigo-600 hover:underline font-mono truncate max-w-[180px]">
                      {shortenAddress(item.value, 6)}
                    </Link>
                  ) : item.isContractLink ? (
                    <Link href={`/contract/${item.value}`} className="text-xs font-semibold text-indigo-600 hover:underline font-mono truncate max-w-[180px]">
                      {shortenAddress(item.value, 6)}
                    </Link>
                  ) : (
                    <span className={`text-xs font-semibold text-slate-700 text-right ${item.mono ? 'font-mono break-all max-w-[180px]' : ''}`}>
                      {item.value}
                    </span>
                  )}
                </div>
              ))}
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
