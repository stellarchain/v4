'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { ContractInvocation } from '@/lib/stellar';
import verifiedContracts from '@/data/verified-contracts.json';
import ContractMobileView from '@/components/mobile/ContractMobileView';
import ContractDesktopView from '@/components/desktop/ContractDesktopView';
import type { TokenRegistryEntry, ContractVerification } from '@/lib/shared/interfaces';
import { getDetailRouteValue } from '@/lib/shared/routeDetail';
import { apiEndpoints, getApiV1Data } from '@/services/api';

type ParsedEventType = 'transfer' | 'approve' | 'mint' | 'burn' | 'clawback' | 'unknown';

type ParsedEventData =
  | { from: string; to: string; amount: string }
  | { from: string; amount: string }
  | { to: string; amount: string }
  | { from: string; spender: string; amount: string; expirationLedger: number }
  | { eventName: string; subType?: string; account?: string; topics: unknown[]; value?: unknown }
  | Record<string, unknown>;

interface ParsedEvent {
  type: ParsedEventType;
  rawEventName?: string;
  contractId: string;
  ledger: number;
  timestamp?: string;
  txHash?: string;
  data: ParsedEventData;
}

interface EventSummary {
  totalEvents: number;
  transfers: number;
  approvals: number;
  mints: number;
  burns: number;
  clawbacks: number;
  unknown: number;
  uniqueAddresses: string[];
  totalVolume: string;
}

interface ContractStorageEntry {
  key: string;
  keyDisplay: string;
  keyType: string;
  value: string;
  valueDisplay: string;
  valueType: string;
  durability: 'temporary' | 'persistent' | 'instance';
  ttl?: number;
  expirationLedger?: number;
}

interface ContractStorageResult {
  contractId: string;
  entries: ContractStorageEntry[];
  instanceData?: Record<string, unknown>;
  totalEntries: number;
  fetchedAt: number;
}

interface ContractMetadataResult {
  sourceRepo?: string;
  homeDomain?: string;
  customMeta?: Record<string, string>;
}

interface ContractAccessControlResult {
  owner?: string;
  admin?: string;
  pendingOwner?: string;
  isPaused: boolean;
  roles?: Array<{ role: string; members: string[] }>;
}

interface ContractSpecResult {
  functions: Array<{
    name: string;
    doc: string;
    inputs: Array<{ name: string; type: { type: string }; doc: string }>;
    outputs: Array<{ type: string }>;
  }>;
  udts: Array<{
    name: string;
    doc: string;
    type: 'struct' | 'union' | 'enum';
    fields: Array<{ name: string; doc: string }>;
  }>;
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

interface APIContractEventItem {
  ledger: number;
  date: string;
  txHash: string;
  type: string;
  amountRaw?: string;
  amount?: string;
  from?: string;
  to?: string;
  spender?: string;
}

interface APIContractHistoryItem {
  txHash: string;
  ledger: number;
  date: string;
  eventType?: string;
  events?: number;
}

interface APIContractStorageItem {
  key: string;
  lastModifiedLedgerSeq?: number;
  liveUntilLedgerSeq?: number;
}

interface APIContractData {
  contractId: string;
  contractIdHex: string;
  assetCode?: string | null;
  assetIssuer?: string | null;
  contractCode?: string | null;
  wasmId?: string | null;
  sourceCodeVerified: boolean;
  createdAt: string;
  totalTransactions: number;
  sac: boolean;
  network: number;
  contractView?: {
    overview?: {
      name?: string | null;
      symbol?: string | null;
      decimals?: number | null;
      type?: string | null;
      operations?: number;
    };
    contractDetails?: {
      contractType?: string | null;
      verified?: boolean;
      tokenName?: string | null;
      isSac?: boolean;
      totalOperations?: number;
      assetCode?: string | null;
      assetIssuer?: string | null;
    };
    history?: {
      totalTransactions?: number;
      items?: APIContractHistoryItem[];
    };
    events?: {
      totalEvents?: number;
      transfers?: number;
      uniqueAddresses?: number;
      totalVolumeRaw?: string;
      totalVolume?: string;
      items?: APIContractEventItem[];
    };
    storage?: {
      entries?: number;
      latestLedger?: number;
      items?: APIContractStorageItem[];
    };
    buildVerification?: {
      status?: string;
    };
    snapshot?: {
      contractKind?: string | null;
      wasmId?: string | null;
      wasmSha256?: string | null;
      wasmCodeBase64?: string | null;
      contractSourceCode?: string | null;
    };
  };
  contractCodePayload?: {
    wasmSha256?: string | null;
  };
}

interface FullContractData {
  id: string;
  tokenMetadata: TokenRegistryEntry | null;
  verifiedContract: VerifiedContract | undefined;
  type: string;
  accessControl: ContractAccessControlResult | null;
  isVerified: boolean;
  apiContractData: APIContractData | null;
  events: ParsedEvent[];
  eventSummary: EventSummary | null;
  invocations: ContractInvocation[];
  storage: ContractStorageResult | null;
  spec: ContractSpecResult | null;
  verification: ContractVerification | null;
  contractMetadata: ContractMetadataResult | null;
}

type ContractTab = 'overview' | 'history' | 'events' | 'storage' | 'operations' | 'interface' | 'details';

type LoadingSectionsState = {
  events: boolean;
  invocations: boolean;
  storage: boolean;
  spec: boolean;
};

const INITIAL_LOADING_SECTIONS: LoadingSectionsState = {
  events: true,
  invocations: true,
  storage: true,
  spec: true,
};

const CONTRACT_ID_REGEX = /^C[A-Z2-7]{55}$/;

function normalizeContractAddress(value: string): string {
  return String(value || '').trim().toUpperCase();
}

function isContractAddress(value: string): boolean {
  return CONTRACT_ID_REGEX.test(value);
}

function inferContractType(
  apiContractData: APIContractData | null,
  verifiedContract: VerifiedContract | undefined
): string {
  const detailsType = apiContractData?.contractView?.contractDetails?.contractType?.toLowerCase() || '';

  if (detailsType.includes('token')) return 'token';
  if (detailsType.includes('nft')) return 'nft';
  if (detailsType.includes('vault')) return 'vault';
  if (apiContractData?.sac) return 'token';
  if (verifiedContract?.type) return verifiedContract.type;
  return 'contract';
}

function mapApiEventType(type: string): ParsedEventType {
  const normalized = type.toLowerCase();
  if (normalized === 'transfer') return 'transfer';
  if (normalized === 'approve') return 'approve';
  if (normalized === 'mint') return 'mint';
  if (normalized === 'burn') return 'burn';
  if (normalized === 'clawback') return 'clawback';
  return 'unknown';
}

function mapApiEvents(contractId: string, apiData: APIContractData): ParsedEvent[] {
  const items = apiData.contractView?.events?.items || [];

  return items.map((item) => {
    const type = mapApiEventType(item.type || 'unknown');
    const amount = String(item.amountRaw || item.amount || '0');

    if (type === 'transfer') {
      return {
        type,
        contractId,
        ledger: Number(item.ledger || 0),
        timestamp: item.date,
        txHash: item.txHash,
        data: {
          from: item.from || 'UNKNOWN',
          to: item.to || 'UNKNOWN',
          amount,
        },
      };
    }

    if (type === 'mint') {
      return {
        type,
        contractId,
        ledger: Number(item.ledger || 0),
        timestamp: item.date,
        txHash: item.txHash,
        data: {
          to: item.to || 'UNKNOWN',
          amount,
        },
      };
    }

    if (type === 'burn' || type === 'clawback') {
      return {
        type,
        contractId,
        ledger: Number(item.ledger || 0),
        timestamp: item.date,
        txHash: item.txHash,
        data: {
          from: item.from || 'UNKNOWN',
          amount,
        },
      };
    }

    if (type === 'approve') {
      return {
        type,
        contractId,
        ledger: Number(item.ledger || 0),
        timestamp: item.date,
        txHash: item.txHash,
        data: {
          from: item.from || 'UNKNOWN',
          spender: item.spender || 'UNKNOWN',
          amount,
          expirationLedger: 0,
        },
      };
    }

    return {
      type: 'unknown',
      rawEventName: item.type || 'event',
      contractId,
      ledger: Number(item.ledger || 0),
      timestamp: item.date,
      txHash: item.txHash,
      data: {
        eventName: item.type || 'event',
        topics: [],
        value: amount,
      },
    };
  });
}

function mapEventSummary(apiData: APIContractData, events: ParsedEvent[]): EventSummary {
  const eventsNode = apiData.contractView?.events;
  return {
    totalEvents: Number(eventsNode?.totalEvents || events.length || 0),
    transfers: Number(eventsNode?.transfers || events.filter((e) => e.type === 'transfer').length),
    approvals: events.filter((e) => e.type === 'approve').length,
    mints: events.filter((e) => e.type === 'mint').length,
    burns: events.filter((e) => e.type === 'burn').length,
    clawbacks: events.filter((e) => e.type === 'clawback').length,
    unknown: events.filter((e) => e.type === 'unknown').length,
    uniqueAddresses: [],
    totalVolume: String(eventsNode?.totalVolumeRaw || eventsNode?.totalVolume || '0'),
  };
}

function mapInvocations(contractId: string, apiData: APIContractData): ContractInvocation[] {
  const historyItems = apiData.contractView?.history?.items || [];

  return historyItems.map((item) => ({
    id: `${item.ledger}-${item.txHash}`,
    txHash: item.txHash,
    sourceAccount: contractId,
    contractId,
    functionName: (item.eventType || 'invoke').toLowerCase(),
    parameters: [],
    createdAt: item.date,
    ledger: Number(item.ledger || 0),
    successful: true,
  }));
}

function mapStorage(contractId: string, apiData: APIContractData): ContractStorageResult | null {
  const storageNode = apiData.contractView?.storage;
  if (!storageNode) return null;

  const entries = (storageNode.items || []).map((item) => ({
    key: item.key,
    keyDisplay: item.key,
    keyType: 'Base64',
    value: '',
    valueDisplay: item.lastModifiedLedgerSeq ? `Last Modified Ledger: ${item.lastModifiedLedgerSeq}` : 'N/A',
    valueType: 'Unknown',
    durability: 'persistent' as const,
    expirationLedger: item.liveUntilLedgerSeq,
    ttl: undefined,
  }));

  return {
    contractId,
    entries,
    totalEntries: Number(storageNode.entries || entries.length || 0),
    fetchedAt: Date.now(),
    instanceData: storageNode.latestLedger ? { latestLedger: storageNode.latestLedger } : undefined,
  };
}

function buildTokenMetadata(
  contractId: string,
  apiData: APIContractData,
  verifiedContract: VerifiedContract | undefined,
  type: string
): TokenRegistryEntry | null {
  if (type !== 'token' && type !== 'lending') {
    return null;
  }

  const overview = apiData.contractView?.overview;
  const details = apiData.contractView?.contractDetails;
  const symbol = overview?.symbol || apiData.assetCode || verifiedContract?.symbol || 'TOKEN';
  const category =
    verifiedContract?.type === 'token' ||
    verifiedContract?.type === 'lending' ||
    verifiedContract?.type === 'dex' ||
    verifiedContract?.type === 'nft' ||
    verifiedContract?.type === 'other'
      ? verifiedContract.type
      : undefined;

  return {
    contractId,
    name: overview?.name || details?.tokenName || verifiedContract?.name || symbol,
    symbol,
    decimals: Number(overview?.decimals ?? verifiedContract?.decimals ?? 7),
    isSAC: Boolean(details?.isSac ?? apiData.sac),
    underlyingAsset: apiData.assetCode
      ? {
          code: apiData.assetCode,
          issuer: apiData.assetIssuer || '',
        }
      : undefined,
    lastFetched: Date.now(),
    fetchedFromRPC: false,
    verified: Boolean(apiData.sourceCodeVerified || verifiedContract?.verified),
    iconUrl: verifiedContract?.iconUrl,
    description: verifiedContract?.description,
    domain: undefined,
    category,
  };
}

function buildVerification(apiData: APIContractData): ContractVerification | null {
  const status = apiData.contractView?.buildVerification?.status || '';
  const isVerifiedByStatus = status.toLowerCase().includes('verified') && !status.toLowerCase().includes('not');

  return {
    isVerified: Boolean(apiData.sourceCodeVerified || isVerifiedByStatus),
    wasmHash:
      apiData.contractView?.snapshot?.wasmSha256 ||
      apiData.contractCodePayload?.wasmSha256 ||
      undefined,
  };
}

async function fetchContractData(contractId: string): Promise<FullContractData> {
  const verifiedContract = verifiedContracts.contracts.find((contract) => contract.id === contractId);

  const apiData = (await getApiV1Data(
    apiEndpoints.v1.contractById(contractId, { source_code: 1 })
  )) as APIContractData;

  const type = inferContractType(apiData, verifiedContract);
  const tokenMetadata = buildTokenMetadata(contractId, apiData, verifiedContract, type);
  const events = mapApiEvents(contractId, apiData);

  return {
    id: contractId,
    tokenMetadata,
    verifiedContract,
    type,
    accessControl: null,
    isVerified: Boolean(apiData.sourceCodeVerified || verifiedContract?.verified),
    apiContractData: apiData,
    events,
    eventSummary: mapEventSummary(apiData, events),
    invocations: mapInvocations(contractId, apiData),
    storage: mapStorage(contractId, apiData),
    spec: null,
    verification: buildVerification(apiData),
    contractMetadata: null,
  };
}

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
    contractMetadata: null,
  };
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

  useEffect(() => {
    if (isInvalidId) return;

    let cancelled = false;

    const loadContractData = async () => {
      setIsValidating(true);
      setError(null);
      setLoadingSections(INITIAL_LOADING_SECTIONS);

      try {
        const data = await fetchContractData(id);
        if (cancelled) return;
        setContractData(data);
        setLoadingSections({
          events: false,
          invocations: false,
          storage: false,
          spec: false,
        });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load contract data');
        setLoadingSections({
          events: false,
          invocations: false,
          storage: false,
          spec: false,
        });
      } finally {
        if (!cancelled) {
          setIsValidating(false);
        }
      }
    };

    void loadContractData();

    return () => {
      cancelled = true;
    };
  }, [id, isInvalidId]);

  const handleTabChange = (_tabId: ContractTab) => {
    // No lazy Soroban RPC loading anymore.
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

  const baseData = contractData || emptyContractData(id);

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
    nftInfo: null,
    vaultInfo: null,
    events: baseData.events,
    eventSummary: baseData.eventSummary,
    storage: baseData.storage,
    invocations: baseData.invocations,
    spec: baseData.spec,
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
