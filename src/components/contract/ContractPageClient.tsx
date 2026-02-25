'use client';

import { useState, useEffect } from 'react';
import ContractMobileView from '@/components/mobile/ContractMobileView';
import ContractDesktopView from '@/components/desktop/ContractDesktopView';
import type { TokenRegistryEntry, ContractVerification } from '@/lib/shared/interfaces';
import type { ContractMetadataResult, ContractAccessControlResult, ContractSpecResult } from '@/lib/soroban/contractMetadata';
import type { NFTInfo, VaultInfo } from '@/lib/soroban/contractExtensions';
import type { ParsedEvent, EventSummary } from '@/lib/soroban/events';
import type { ContractStorageResult } from '@/lib/soroban/storage';
import type { ContractInvocation } from '@/lib/stellar';

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

interface StreamedData {
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

interface ContractPageClientProps {
  quickData: QuickData;
}

export default function ContractPageClient({ quickData }: ContractPageClientProps) {
  const [streamedData, setStreamedData] = useState<StreamedData>({
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

  const [loadingStates, setLoadingStates] = useState({
    events: true,
    invocations: true,
    storage: true,
    spec: true,
  });

  // Listen for streamed data from server components
  useEffect(() => {
    const checkForData = () => {
      // Check for events data
      const eventsScript = document.getElementById('events-data');
      if (eventsScript && loadingStates.events) {
        try {
          const data = JSON.parse(eventsScript.textContent || '{}');
          setStreamedData(prev => ({ ...prev, events: data.events || [], eventSummary: data.eventSummary || null }));
          setLoadingStates(prev => ({ ...prev, events: false }));
        } catch (e) {
          console.error('Failed to parse events data', e);
        }
      }

      // Check for invocations data
      const invocationsScript = document.getElementById('invocations-data');
      if (invocationsScript && loadingStates.invocations) {
        try {
          const data = JSON.parse(invocationsScript.textContent || '{}');
          setStreamedData(prev => ({ ...prev, invocations: data.invocations || [] }));
          setLoadingStates(prev => ({ ...prev, invocations: false }));
        } catch (e) {
          console.error('Failed to parse invocations data', e);
        }
      }

      // Check for storage data
      const storageScript = document.getElementById('storage-data');
      if (storageScript && loadingStates.storage) {
        try {
          const data = JSON.parse(storageScript.textContent || '{}');
          setStreamedData(prev => ({ ...prev, storage: data.storage || null }));
          setLoadingStates(prev => ({ ...prev, storage: false }));
        } catch (e) {
          console.error('Failed to parse storage data', e);
        }
      }

      // Check for spec data
      const specScript = document.getElementById('spec-data');
      if (specScript && loadingStates.spec) {
        try {
          const data = JSON.parse(specScript.textContent || '{}');
          setStreamedData(prev => ({
            ...prev,
            spec: data.spec || null,
            verification: data.verification || null,
            nftInfo: data.nftInfo || null,
            vaultInfo: data.vaultInfo || null,
            contractMetadata: data.contractMetadata || null,
          }));
          setLoadingStates(prev => ({ ...prev, spec: false }));
        } catch (e) {
          console.error('Failed to parse spec data', e);
        }
      }
    };

    // Check immediately and then periodically
    checkForData();
    const interval = setInterval(checkForData, 100);

    // Stop checking after all data is loaded or after 30 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setLoadingStates({ events: false, invocations: false, storage: false, spec: false });
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [loadingStates]);

  // Combine quick data with streamed data
  const contractData = {
    id: quickData.id,
    account: null,
    tokenMetadata: quickData.tokenMetadata,
    verifiedContract: quickData.verifiedContract,
    isVerified: quickData.isVerified || !!streamedData.verification?.isVerified,
    type: quickData.type,
    verification: streamedData.verification,
    contractMetadata: streamedData.contractMetadata,
    accessControl: quickData.accessControl,
    nftInfo: streamedData.nftInfo,
    vaultInfo: streamedData.vaultInfo,
    events: streamedData.events,
    eventSummary: streamedData.eventSummary,
    storage: streamedData.storage,
    invocations: streamedData.invocations,
    spec: streamedData.spec,
    // Loading states for UI
    _loading: loadingStates,
  };

  return (
    <>
      <div className="hidden lg:block">
        <ContractDesktopView
          contract={contractData}
          operations={[]}
        />
      </div>
      <div className="block lg:hidden">
        <ContractMobileView
          contract={contractData}
          operations={[]}
        />
      </div>
    </>
  );
}
