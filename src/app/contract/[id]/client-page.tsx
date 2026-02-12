'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
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
import type { TokenRegistryEntry, ContractVerification } from '@/lib/types/token';
import type { ContractMetadataResult, ContractAccessControlResult, ContractSpecResult } from '@/lib/contractMetadata';
import type { NFTInfo, VaultInfo } from '@/lib/contractExtensions';
import type { EventSummary } from '@/lib/eventParser';
import { getDetailRouteValue } from '@/lib/routeDetail';


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

const inFlightSectionFetches = new Map<string, Promise<Partial<FullContractData>>>();

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
  const [loadingSections, setLoadingSections] = useState({
    events: true,
    invocations: true,
    storage: true,
    spec: true,
  });
  const [loadedSections, setLoadedSections] = useState({
    overview: false,
    history: false,
    storage: false,
    spec: false,
  });

  useEffect(() => {
    if (isInvalidId) {
      return;
    }

    let cancelled = false;

    const loadContractData = async () => {
      setIsValidating(true);
      setError(null);
      setLoadedSections({ overview: false, history: false, storage: false, spec: false });
      setLoadingSections({ events: true, invocations: true, storage: true, spec: true });
      try {
        // Load quick data first
        const verifiedContract = verifiedContracts.contracts.find(c => c.id === id);

        // Fetch basic contract data from new API
        const fetchAPIContractData = async (): Promise<APIContractData | null> => {
          try {
            const response = await fetch(`https://api.stellarchain.dev/v1/contracts/${id}`, {
              headers: { 'Accept': 'application/ld+json' },
            });
            if (!response.ok) return null;
            const data = await response.json();
            return {
              contractId: data.contractId,
              contractIdHex: data.contractIdHex,
              assetIssuer: data.assetIssuer,
              contractCode: data.contractCode,
              wasmId: data.wasmId,
              sourceCodeVerified: data.sourceCodeVerified,
              createdAt: data.createdAt,
              totalTransactions: data.totalTransactions,
              sac: data.sac,
              network: data.network,
            };
          } catch {
            return null;
          }
        };

        const [tokenMetadata, accessControl, apiContractData] = await Promise.all([
          getTokenMetadata(id).catch(() => null),
          getContractAccessControl(id).catch(() => null),
          fetchAPIContractData(),
        ]);

        const contractType =
          verifiedContract?.type ||
          tokenMetadata?.isSAC ||
          tokenMetadata
            ? null
            : await detectContractType(id).catch(() => null);
        const inferredType =
          contractType ||
          verifiedContract?.type ||
          (tokenMetadata?.isSAC ? 'token' : tokenMetadata ? 'token' : 'contract');

        const quickData: QuickData = {
          id,
          tokenMetadata,
          verifiedContract,
          type: inferredType,
          accessControl,
          isVerified: apiContractData?.sourceCodeVerified || !!verifiedContract,
          apiContractData,
        };

        // Set quick data first so UI can render
        if (cancelled) return;
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

        // Load only overview-related data initially.
        const overviewKey = `${id}:overview`;
        const existingOverviewFetch = inFlightSectionFetches.get(overviewKey);
        const overviewFetch = existingOverviewFetch || (async () => {
          const shouldFetchNftInfo = inferredType === 'nft';
          const shouldFetchVaultInfo = inferredType === 'vault';

          const [eventsRes, verificationRes, nftInfoRes, vaultInfoRes, contractMetaRes] = await Promise.allSettled([
            getContractEvents(id, 50).catch(() => [] as ParsedEvent[]),
            verifyContract(id),
            shouldFetchNftInfo ? getNFTInfo(id) : Promise.resolve(null),
            shouldFetchVaultInfo ? getVaultInfo(id) : Promise.resolve(null),
            getContractMetadata(id),
          ]);

          const eventsData = eventsRes.status === 'fulfilled' ? eventsRes.value : [];
          return {
            events: eventsData,
            eventSummary: getEventSummary(eventsData),
            verification: verificationRes.status === 'fulfilled' ? toContractVerification(verificationRes.value) : null,
            nftInfo: nftInfoRes.status === 'fulfilled' ? nftInfoRes.value : null,
            vaultInfo: vaultInfoRes.status === 'fulfilled' ? vaultInfoRes.value : null,
            contractMetadata: contractMetaRes.status === 'fulfilled' ? contractMetaRes.value : null,
          } as Partial<FullContractData>;
        })();

        if (!existingOverviewFetch) {
          inFlightSectionFetches.set(overviewKey, overviewFetch);
        }

        const overviewData = await overviewFetch;
        inFlightSectionFetches.delete(overviewKey);

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

  const loadLazySection = async (section: 'history' | 'storage' | 'spec') => {
    if (!id || isInvalidId) return;

    if (section === 'history' && loadedSections.history) return;
    if (section === 'storage' && loadedSections.storage) return;
    if (section === 'spec' && loadedSections.spec) return;

    const fetchKey = `${id}:${section}`;
    const existingFetch = inFlightSectionFetches.get(fetchKey);

    if (section === 'history') {
      setLoadingSections((prev) => ({ ...prev, invocations: true }));
    } else if (section === 'storage') {
      setLoadingSections((prev) => ({ ...prev, storage: true }));
    } else if (section === 'spec') {
      setLoadingSections((prev) => ({ ...prev, spec: true }));
    }

    const sectionFetch = existingFetch || (async () => {
      if (section === 'history') {
        return {
          invocations: await getContractInvocations(id, 50).catch(() => [] as ContractInvocation[]),
        } as Partial<FullContractData>;
      }
      if (section === 'storage') {
        return {
          storage: await getContractStorage(id).catch(() => null as ContractStorageResult | null),
        } as Partial<FullContractData>;
      }
      return {
        spec: await getContractSpec(id).catch(() => null),
      } as Partial<FullContractData>;
    })();

    if (!existingFetch) {
      inFlightSectionFetches.set(fetchKey, sectionFetch);
    }

    const sectionData = await sectionFetch;
    inFlightSectionFetches.delete(fetchKey);
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
  };

  const handleTabChange = (tabId: 'overview' | 'history' | 'events' | 'storage' | 'operations' | 'interface' | 'details') => {
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
  const baseData = contractData || {
    id,
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
