'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import { getTokenMetadata } from '@/lib/soroban/tokens';
import { isContractAddress, normalizeContractAddress } from '@/lib/soroban';
import type { ContractInvocation } from '@/lib/stellar';
import { getContractInvocations } from '@/lib/stellar';
import Link from 'next/link';
import verifiedContracts from '@/data/verified-contracts.json';
import { verifyContract, toContractVerification } from '@/lib/soroban/verification';
import { getContractMetadata, getContractAccessControl, getContractSpec } from '@/lib/soroban/contractMetadata';
import { getNFTInfo, getVaultInfo } from '@/lib/soroban/contractExtensions';
import { getContractEvents, getEventSummary, ParsedEvent } from '@/lib/soroban/events';
import { getContractStorage, ContractStorageResult } from '@/lib/soroban/storage';
import ContractMobileView from '@/components/mobile/ContractMobileView';
import ContractDesktopView from '@/components/desktop/ContractDesktopView';
import type { TokenRegistryEntry, ContractVerification } from '@/lib/shared/interfaces';
import type { ContractMetadataResult, ContractAccessControlResult, ContractSpecResult } from '@/lib/soroban/contractMetadata';
import type { NFTInfo, VaultInfo } from '@/lib/soroban/contractExtensions';
import type { EventSummary } from '@/lib/soroban/events';
import { getDetailRouteValue } from '@/lib/shared/routeDetail';
import { apiEndpoints, getApiV1Data } from '@/services/api';

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

interface APIContractData {
  contractId: string;
  contractIdHex: string;
  assetIssuer: string | null;
  contractCode: string | null;
  wasmId: string | null;
  sourceCodeVerified: boolean;
  createdAt: string;
  totalTransactions: number;
  sac: boolean;
  network: number;
}

interface QuickData {
  id: string;
  tokenMetadata: TokenRegistryEntry | null;
  verifiedContract: VerifiedContract | undefined;
  type: string;
  accessControl: ContractAccessControlResult | null;
  isVerified: boolean;
  apiContractData: APIContractData | null;
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

type LazySection = 'history' | 'storage' | 'spec';
type ContractTab = 'overview' | 'history' | 'events' | 'storage' | 'operations' | 'interface' | 'details';
type LoadingSectionsState = {
  events: boolean;
  invocations: boolean;
  storage: boolean;
  spec: boolean;
};
type LoadedSectionsState = {
  overview: boolean;
  history: boolean;
  storage: boolean;
  spec: boolean;
};

const INITIAL_LOADING_SECTIONS: LoadingSectionsState = {
  events: true,
  invocations: true,
  storage: true,
  spec: true,
};

const INITIAL_LOADED_SECTIONS: LoadedSectionsState = {
  overview: false,
  history: false,
  storage: false,
  spec: false,
};

function emptyContractData(contractId: string): FullContractData {
  return {
    id: contractId,
    tokenMetadata: null,
    verifiedContract: undefined,
    type: 'contract',
    accessControl: null,
    isVerified: false,
    apiContractData: null,
    events: [],
    eventSummary: null,
    invocations: [],
    storage: null,
    spec: null,
    verification: null,
    nftInfo: null,
    vaultInfo: null,
    contractMetadata: null,
  };
}

function getFetchKey(contractId: string, section: 'overview' | LazySection): string {
  return `${contractId}:${section}`;
}

function inferContractType(
  apiContractData: APIContractData | null,
  verifiedContract: VerifiedContract | undefined
): string {
  if (apiContractData?.sac) return 'token';
  if (verifiedContract?.type) return verifiedContract.type;
  return 'contract';
}

async function fetchApiContractData(contractId: string): Promise<APIContractData | null> {
  try {
    const data = await getApiV1Data(apiEndpoints.v1.contractById(contractId)) as Partial<APIContractData>;
    return {
      contractId: data.contractId || contractId,
      contractIdHex: data.contractIdHex || '',
      assetIssuer: data.assetIssuer || null,
      contractCode: data.contractCode || null,
      wasmId: data.wasmId || null,
      sourceCodeVerified: Boolean(data.sourceCodeVerified),
      createdAt: data.createdAt || '',
      totalTransactions: Number(data.totalTransactions || 0),
      sac: Boolean(data.sac),
      network: Number(data.network || 0),
    };
  } catch {
    return null;
  }
}

async function fetchQuickData(contractId: string): Promise<QuickData> {
  const verifiedContract = verifiedContracts.contracts.find((contract) => contract.id === contractId);
  const [tokenMetadata, accessControl, apiContractData] = await Promise.all([
    getTokenMetadata(contractId).catch(() => null),
    getContractAccessControl(contractId).catch(() => null),
    fetchApiContractData(contractId),
  ]);

  const type = inferContractType(apiContractData, verifiedContract);

  return {
    id: contractId,
    tokenMetadata,
    verifiedContract,
    type,
    accessControl,
    isVerified: Boolean(apiContractData?.sourceCodeVerified || verifiedContract),
    apiContractData,
  };
}

async function fetchOverviewData(contractId: string, inferredType: string): Promise<Partial<FullContractData>> {
  const shouldFetchNftInfo = inferredType === 'nft';
  const shouldFetchVaultInfo = inferredType === 'vault';

  const [eventsRes, verificationRes, nftInfoRes, vaultInfoRes, contractMetaRes] = await Promise.allSettled([
    getContractEvents(contractId, 50).catch(() => [] as ParsedEvent[]),
    verifyContract(contractId),
    shouldFetchNftInfo ? getNFTInfo(contractId) : Promise.resolve(null),
    shouldFetchVaultInfo ? getVaultInfo(contractId) : Promise.resolve(null),
    getContractMetadata(contractId),
  ]);

  const eventsData = eventsRes.status === 'fulfilled' ? eventsRes.value : [];
  return {
    events: eventsData,
    eventSummary: getEventSummary(eventsData),
    verification: verificationRes.status === 'fulfilled' ? toContractVerification(verificationRes.value) : null,
    nftInfo: nftInfoRes.status === 'fulfilled' ? nftInfoRes.value : null,
    vaultInfo: vaultInfoRes.status === 'fulfilled' ? vaultInfoRes.value : null,
    contractMetadata: contractMetaRes.status === 'fulfilled' ? contractMetaRes.value : null,
  };
}

async function fetchLazySectionData(contractId: string, section: LazySection): Promise<Partial<FullContractData>> {
  if (section === 'history') {
    return {
      invocations: await getContractInvocations(contractId, 50).catch(() => [] as ContractInvocation[]),
    };
  }
  if (section === 'storage') {
    return {
      storage: await getContractStorage(contractId).catch(() => null as ContractStorageResult | null),
    };
  }
  return {
    spec: await getContractSpec(contractId).catch(() => null),
  };
}

const inFlightSectionFetches = new Map<string, Promise<Partial<FullContractData>>>();

async function fetchWithDedup(
  key: string,
  fetcher: () => Promise<Partial<FullContractData>>
): Promise<Partial<FullContractData>> {
  const existingFetch = inFlightSectionFetches.get(key);
  if (existingFetch) {
    return existingFetch;
  }

  const fetchPromise = fetcher();
  inFlightSectionFetches.set(key, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    inFlightSectionFetches.delete(key);
  }
}

export default function ContractPage() {
  const params = useParams<{ id?: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawId = getDetailRouteValue({
    pathname,
    searchParams,
    queryKey: 'id',
    routeParam: params.id,
    aliases: ['/contract', '/contracts'],
  });
  const id = normalizeContractAddress(rawId);
  const isInvalidId = !isContractAddress(id);

  const [contractData, setContractData] = useState<FullContractData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(() => !isInvalidId);
  const [loadingSections, setLoadingSections] = useState<LoadingSectionsState>(INITIAL_LOADING_SECTIONS);
  const [loadedSections, setLoadedSections] = useState<LoadedSectionsState>(INITIAL_LOADED_SECTIONS);

  useEffect(() => {
    if (isInvalidId) {
      return;
    }

    let cancelled = false;

    const loadContractData = async () => {
      setIsValidating(true);
      setError(null);
      setLoadedSections(INITIAL_LOADED_SECTIONS);
      setLoadingSections(INITIAL_LOADING_SECTIONS);
      try {
        // Stage 1: Soroban quick data required for first render.
        const quickData = await fetchQuickData(id);
        if (cancelled) return;
        setContractData({ ...emptyContractData(id), ...quickData });
        setIsValidating(false);

        // Stage 2: Overview data (events + metadata + verification).
        const overviewData = await fetchWithDedup(
          getFetchKey(id, 'overview'),
          () => fetchOverviewData(id, quickData.type)
        );

        if (cancelled) return;
        setContractData((prev) => (prev ? { ...prev, ...overviewData } : prev));
        setLoadedSections((prev) => ({ ...prev, overview: true }));
        setLoadingSections((prev) => ({ ...prev, events: false }));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load contract data');
        setIsValidating(false);
      setLoadingSections({ events: false, invocations: false, storage: false, spec: false });
      }
    };

    loadContractData();
    return () => {
      cancelled = true;
    };
  }, [id, isInvalidId]);

  const loadLazySection = async (section: LazySection) => {
    if (!id || isInvalidId) return;

    if (section === 'history' && loadedSections.history) return;
    if (section === 'storage' && loadedSections.storage) return;
    if (section === 'spec' && loadedSections.spec) return;

    const fetchKey = getFetchKey(id, section);

    if (section === 'history') {
      setLoadingSections((prev) => ({ ...prev, invocations: true }));
    } else if (section === 'storage') {
      setLoadingSections((prev) => ({ ...prev, storage: true }));
    } else if (section === 'spec') {
      setLoadingSections((prev) => ({ ...prev, spec: true }));
    }

    try {
      const sectionData = await fetchWithDedup(fetchKey, () => fetchLazySectionData(id, section));
      setContractData((prev) => (prev ? { ...prev, ...sectionData } : prev));

      if (section === 'history') {
        setLoadedSections((prev) => ({ ...prev, history: true }));
        setLoadingSections((prev) => ({ ...prev, invocations: false }));
      } else if (section === 'storage') {
        setLoadedSections((prev) => ({ ...prev, storage: true }));
        setLoadingSections((prev) => ({ ...prev, storage: false }));
      } else if (section === 'spec') {
        setLoadedSections((prev) => ({ ...prev, spec: true }));
        setLoadingSections((prev) => ({ ...prev, spec: false }));
      }
    } catch {
      if (section === 'history') {
        setLoadingSections((prev) => ({ ...prev, invocations: false }));
      } else if (section === 'storage') {
        setLoadingSections((prev) => ({ ...prev, storage: false }));
      } else {
        setLoadingSections((prev) => ({ ...prev, spec: false }));
      }
    }
  };

  const handleTabChange = (tabId: ContractTab) => {
    if (tabId === 'history') {
      void loadLazySection('history');
      return;
    }
    if (tabId === 'storage') {
      void loadLazySection('storage');
      return;
    }
    if (tabId === 'interface') {
      void loadLazySection('spec');
      return;
    }
    if ((tabId === 'events' || tabId === 'operations') && !loadedSections.overview) {
      setLoadingSections((prev) => ({ ...prev, events: true }));
    }
  };

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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <h1 className="text-2xl font-bold mb-2">Error</h1>
        <p className="text-muted">{error}</p>
      </div>
    );
  }

  // Always render page shell; show per-section skeletons while values are loading.
  const baseData = contractData || emptyContractData(id);

  // Transform data to match component props
  const contractForView = {
    id: baseData.id,
    account: null,
    tokenMetadata: baseData.tokenMetadata,
    verifiedContract: baseData.verifiedContract,
    isVerified: baseData.isVerified,
    type: baseData.type,
    verification: baseData.verification,
    contractMetadata: baseData.contractMetadata,
    accessControl: baseData.accessControl,
    nftInfo: baseData.nftInfo,
    vaultInfo: baseData.vaultInfo,
    events: baseData.events,
    eventSummary: baseData.eventSummary,
    storage: baseData.storage,
    invocations: baseData.invocations,
    spec: baseData.spec,
    // Include API data for use in views
    totalTransactions: baseData.apiContractData?.totalTransactions,
    createdAt: baseData.apiContractData?.createdAt,
    wasmId: baseData.apiContractData?.wasmId || undefined,
    contractCode: baseData.apiContractData?.contractCode || undefined,
    sourceCodeVerified: baseData.apiContractData?.sourceCodeVerified,
    assetIssuer: baseData.apiContractData?.assetIssuer || undefined,
    isSAC: baseData.apiContractData?.sac,
    _loading: isValidating
      ? { events: true, invocations: true, storage: true, spec: true }
      : loadingSections,
  };

  return (
    <>
      <div className="hidden md:block">
        <ContractDesktopView
          contract={contractForView}
          operations={[]}
          onTabChange={handleTabChange}
        />
      </div>
      <div className="md:hidden">
        <ContractMobileView
          contract={contractForView}
          operations={[]}
          onTabChange={handleTabChange}
        />
      </div>
    </>
  );
}
