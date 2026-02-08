'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getTokenMetadata } from '@/lib/tokenRegistry';
import { isContractAddress, normalizeContractAddress } from '@/lib/soroban';
import type { ContractInvocation } from '@/lib/stellar';
import { getContractInvocations } from '@/lib/stellar';
import Link from 'next/link';
import verifiedContracts from '@/data/verified-contracts.json';
import { verifyContract, toContractVerification } from '@/lib/contractVerification';
import { getContractMetadata, getContractAccessControl, detectContractType, getContractSpec } from '@/lib/contractMetadata';
import { getNFTInfo, getVaultInfo } from '@/lib/contractExtensions';
import { getContractEvents, getEventSummary, ParsedEvent } from '@/lib/eventParser';
import { getContractStorage, ContractStorageResult } from '@/lib/contractStorage';
import ContractMobileView from '@/components/mobile/ContractMobileView';
import ContractDesktopView from '@/components/desktop/ContractDesktopView';
import Loading from '@/components/ui/Loading';
import type { TokenRegistryEntry, ContractVerification } from '@/lib/types/token';
import type { ContractMetadataResult, ContractAccessControlResult, ContractSpecResult } from '@/lib/contractMetadata';
import type { NFTInfo, VaultInfo } from '@/lib/contractExtensions';
import type { EventSummary } from '@/lib/eventParser';

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

interface QuickData {
  id: string;
  tokenMetadata: TokenRegistryEntry | null;
  verifiedContract: VerifiedContract | undefined;
  type: string;
  accessControl: ContractAccessControlResult | null;
  isVerified: boolean;
}

interface FullContractData extends QuickData {
  events: ParsedEvent[];
  eventSummary: EventSummary | null;
  invocations: ContractInvocation[];
  storage: ContractStorageResult | null;
  spec: ContractSpecResult | null;
  verification: ContractVerification | null;
  nftInfo: NFTInfo | null;
  vaultInfo: VaultInfo | null;
  contractMetadata: ContractMetadataResult | null;
}

export default function ContractPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = normalizeContractAddress(rawId);

  const [contractData, setContractData] = useState<FullContractData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  const isInvalidId = !isContractAddress(id);
  const isLoading = isValidating || (!contractData && !error && !isInvalidId);

  useEffect(() => {
    if (isInvalidId) {
      setIsValidating(false);
      return;
    }

    const loadContractData = async () => {
      try {
        // Load quick data first
        const [tokenMetadata, contractType, accessControl] = await Promise.all([
          getTokenMetadata(id).catch(() => null),
          detectContractType(id).catch(() => null),
          getContractAccessControl(id).catch(() => null),
        ]);

        const verifiedContract = verifiedContracts.contracts.find(c => c.id === id);

        const quickData: QuickData = {
          id,
          tokenMetadata,
          verifiedContract,
          type: contractType || verifiedContract?.type || (tokenMetadata?.isSAC ? 'token' : tokenMetadata ? 'token' : 'contract'),
          accessControl,
          isVerified: !!verifiedContract,
        };

        // Set quick data first so UI can render
        setContractData({
          ...quickData,
          events: [],
          eventSummary: null,
          invocations: [],
          storage: null,
          spec: null,
          verification: null,
          nftInfo: null,
          vaultInfo: null,
          contractMetadata: null,
        });
        setIsValidating(false);

        // Load remaining data in parallel
        const [
          events,
          invocations,
          storage,
          specRes,
          verificationRes,
          nftInfoRes,
          vaultInfoRes,
          contractMetaRes
        ] = await Promise.allSettled([
          getContractEvents(id, 50).catch(() => [] as ParsedEvent[]),
          getContractInvocations(id, 50).catch(() => [] as ContractInvocation[]),
          getContractStorage(id).catch(() => null as ContractStorageResult | null),
          getContractSpec(id).catch(() => null),
          verifyContract(id),
          getNFTInfo(id),
          getVaultInfo(id),
          getContractMetadata(id),
        ]);

        const eventsData = events.status === 'fulfilled' ? events.value : [];
        const eventSummary = getEventSummary(eventsData);

        setContractData({
          ...quickData,
          events: eventsData,
          eventSummary,
          invocations: invocations.status === 'fulfilled' ? invocations.value : [],
          storage: storage.status === 'fulfilled' ? storage.value : null,
          spec: specRes.status === 'fulfilled' ? specRes.value : null,
          verification: verificationRes.status === 'fulfilled' ? toContractVerification(verificationRes.value) : null,
          nftInfo: nftInfoRes.status === 'fulfilled' ? nftInfoRes.value : null,
          vaultInfo: vaultInfoRes.status === 'fulfilled' ? vaultInfoRes.value : null,
          contractMetadata: contractMetaRes.status === 'fulfilled' ? contractMetaRes.value : null,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load contract data');
        setIsValidating(false);
      }
    };

    loadContractData();
  }, [id, isInvalidId]);

  if (isInvalidId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid Contract ID</h1>
        <p className="text-slate-500 mb-4 text-center">Contract IDs must start with &apos;C&apos; and be 56 characters long.</p>
        <p className="text-slate-400 font-mono text-sm mb-4 break-all max-w-lg text-center">{id}</p>
        <Link
          href="/"
          className="px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <Loading title="Loading contract" description="Fetching contract details and data." />;
  }

  if (error || !contractData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <h1 className="text-2xl font-bold mb-2">Error</h1>
        <p className="text-muted">{error || 'Failed to load contract.'}</p>
      </div>
    );
  }

  // Transform data to match component props
  const contractForView = {
    id: contractData.id,
    account: null,
    tokenMetadata: contractData.tokenMetadata,
    verifiedContract: contractData.verifiedContract,
    isVerified: contractData.isVerified,
    type: contractData.type,
    verification: contractData.verification,
    contractMetadata: contractData.contractMetadata,
    accessControl: contractData.accessControl,
    nftInfo: contractData.nftInfo,
    vaultInfo: contractData.vaultInfo,
    events: contractData.events,
    eventSummary: contractData.eventSummary,
    storage: contractData.storage,
    invocations: contractData.invocations,
  };

  return (
    <>
      <div className="hidden md:block">
        <ContractDesktopView
          contract={contractForView}
          operations={[]}
        />
      </div>
      <div className="md:hidden">
        <ContractMobileView
          contract={contractForView}
          operations={[]}
        />
      </div>
    </>
  );
}
