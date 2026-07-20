'use client';

import { useCallback, useEffect, useState } from 'react';
import { Buffer } from 'buffer';
import { xdr } from '@stellar/stellar-sdk';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { ContractInvocation } from '@/lib/stellar';
import ContractMobileView from '@/components/mobile/ContractMobileView';
import ContractDesktopView from '@/components/desktop/ContractDesktopView';
import type { TokenRegistryEntry, ContractVerification } from '@/lib/shared/interfaces';
import { decodeScVal } from '@/lib/shared/xdr';
import { getDetailRouteValue } from '@/lib/shared/routeDetail';
import { apiEndpoints, getApiV1Data } from '@/services/api';
import { useNetwork, NETWORK_CONFIGS, type NetworkType } from '@/contexts/NetworkContext';
import { redirectToNetwork } from '@/lib/network/navigation';

type ParsedEventType = 'transfer' | 'approve' | 'mint' | 'burn' | 'clawback' | 'unknown';

type ParsedEventData =
  | { from: string; to: string; amount: string }
  | { from: string; amount: string }
  | { to: string; amount: string }
  | { from: string; spender: string; amount: string; expirationLedger: number }
  | { eventName: string; subType?: string; account?: string; topics: unknown[]; decodedTopics?: string[]; value?: unknown; decodedValue?: string }
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

interface APIContractData {
  id?: number;
  contractId: string;
  contractIdHex: string;
  assetCode?: string | null;
  assetIssuer?: string | null;
  contractCode?: string | null;
  sourceCode?: string | null;
  wasmId?: string | null;
  sourceCodeVerified: boolean;
  createdAt: string;
  totalTransactions: number;
  totalOperations?: number;
  totalEvents?: number;
  totalEffects?: number;
  totalStorageEntries?: number;
  totalInvokes?: number;
  isSac?: boolean | null;
  verifiedMetadata?: {
    displayName?: string;
    metadataType?: string;
    isSep41?: boolean;
    sep41?: boolean;
    symbol?: string;
    decimals?: number;
    isVerified?: boolean;
    verified?: boolean;
    website?: string;
    description?: string;
    iconUrl?: string;
  } | null;
  sac?: boolean | null;
  network: number;
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

type ContractInvocationsPage = {
  items: ContractInvocation[];
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  hasMore: boolean;
  nextBeforeId?: number | null;
  beforeId?: number | null;
};

const HISTORY_PAGE_SIZE = 10;
const EVENTS_PAGE_SIZE = 10;

type ContractEventsPage = {
  items: ParsedEvent[];
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  hasMore: boolean;
  nextBeforeId?: number | null;
  beforeId?: number | null;
};

interface ContractHolderBalance {
  relatedContractId: string;
  balanceRaw: string;
  inflowRaw: string;
  outflowRaw: string;
  label?: string;
  decimals?: number;
}

interface ContractTokenHolderBalance {
  address: string;
  balanceRaw: string;
  inflowRaw: string;
  outflowRaw: string;
}

interface ContractBalanceSummary {
  holdersCount: number;
  indexedBalanceRaw: string;
  inflowRaw: string;
  outflowRaw: string;
  hasMore: boolean;
}

type ContractBalancesPage = {
  items: ContractTokenHolderBalance[];
  summary: ContractBalanceSummary | null;
  hasMore: boolean;
  nextOffset: number | null;
  limit: number;
  offset: number;
};

type SacReconciliationStatus = 'matched' | 'differs' | 'not_enough_indexed_data' | 'market_unavailable';

interface SacMarketReconciliation {
  assetKey: string;
  indexedBalanceRaw: string | null;
  assetMarketSupplyRaw: string | null;
  differenceRaw: string | null;
  lastMarketUpdate?: string;
  status: SacReconciliationStatus;
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

type ContractEventRecord = {
  txHash?: string;
  ledger?: number;
  createdAt?: string;
  ledgerClosedAt?: string;
  eventType?: string;
  topicDecoded?: string[];
  valueDecoded?: string;
};

type ContractStorageEntryRecord = {
  storageKey?: string;
  entryXdr?: string;
  entryDecoded?: {
    key?: string;
    xdr?: string;
    hasContractData?: boolean;
    liveUntilLedgerSeq?: number;
    ttlLedgersRemaining?: number;
    lastModifiedLedgerSeq?: number;
  };
  lastModifiedLedgerSeq?: number;
  liveUntilLedgerSeq?: number;
  updatedAt?: string;
};

function sanitizeDecodedValue(raw?: string | null): string {
  return String(raw || '')
    .trim()
    .replace(/^"+|"+$/g, '')
    .replace(/^'+|'+$/g, '');
}

function toDecodedAddress(raw?: string | null): string | null {
  const value = sanitizeDecodedValue(raw);
  if (!value) return null;
  if (/^[GC][A-Z2-7]{55}$/.test(value)) return value;
  return null;
}

function toDecodedAmount(raw?: string | null): string | null {
  const value = sanitizeDecodedValue(raw);
  if (!value) return null;
  const normalized = value.replace(/,/g, '');
  if (/^-?\d+(\.\d+)?$/.test(normalized)) return normalized;
  return value || null;
}

function parseContractEvent(contractId: string, event: ContractEventRecord): ParsedEvent {
  const timestamp = event.ledgerClosedAt || event.createdAt;
  const decodedTopics = (event.topicDecoded || [])
    .map((topic) => decodeScValBase64(topic))
    .filter((topic): topic is string => Boolean(topic));
  const decodedValue = decodeScValBase64(event.valueDecoded);
  const topic0 = sanitizeDecodedValue(decodedTopics[0]);
  const topic1 = sanitizeDecodedValue(decodedTopics[1]);
  const topic2 = sanitizeDecodedValue(decodedTopics[2]);
  const topic3 = sanitizeDecodedValue(decodedTopics[3]);
  const eventName = sanitizeDecodedValue(event.eventType) || topic0 || 'contractEvent';
  const normalizedType = eventName.toLowerCase();
  const amount = toDecodedAmount(decodedValue);

  if (normalizedType.includes('transfer') && topic1 && topic2 && amount) {
    return {
      type: 'transfer',
      rawEventName: eventName,
      contractId,
      ledger: Number(event.ledger || 0),
      timestamp,
      txHash: event.txHash,
      data: {
        from: toDecodedAddress(topic1) || topic1,
        to: toDecodedAddress(topic2) || topic2,
        amount,
      },
    };
  }

  if (normalizedType.includes('approve') && topic1 && topic2 && amount) {
    return {
      type: 'approve',
      rawEventName: eventName,
      contractId,
      ledger: Number(event.ledger || 0),
      timestamp,
      txHash: event.txHash,
      data: {
        from: toDecodedAddress(topic1) || topic1,
        spender: toDecodedAddress(topic2) || topic2,
        amount,
        expirationLedger: Number(topic3 || 0),
      },
    };
  }

  if (normalizedType.includes('mint') && topic1 && amount) {
    return {
      type: 'mint',
      rawEventName: eventName,
      contractId,
      ledger: Number(event.ledger || 0),
      timestamp,
      txHash: event.txHash,
      data: {
        to: toDecodedAddress(topic1) || topic1,
        amount,
      },
    };
  }

  if (normalizedType.includes('burn') && topic1 && amount) {
    return {
      type: 'burn',
      rawEventName: eventName,
      contractId,
      ledger: Number(event.ledger || 0),
      timestamp,
      txHash: event.txHash,
      data: {
        from: toDecodedAddress(topic1) || topic1,
        amount,
      },
    };
  }

  if (normalizedType.includes('clawback') && topic1 && amount) {
    return {
      type: 'clawback',
      rawEventName: eventName,
      contractId,
      ledger: Number(event.ledger || 0),
      timestamp,
      txHash: event.txHash,
      data: {
        from: toDecodedAddress(topic1) || topic1,
        amount,
      },
    };
  }

  return {
    type: 'unknown',
    rawEventName: eventName,
    contractId,
    ledger: Number(event.ledger || 0),
    timestamp,
    txHash: event.txHash,
    data: {
      eventName,
      subType: topic0 && topic0 !== eventName ? topic0 : undefined,
      topics: event.topicDecoded || [],
      decodedTopics,
      value: event.valueDecoded || '',
      decodedValue: decodedValue ?? undefined,
    },
  };
}

const CONTRACT_ID_REGEX = /^C[A-Z2-7]{55}$/;

function normalizeContractAddress(value: string): string {
  return String(value || '').trim().toUpperCase();
}

function decodeScValBase64(encoded?: string): string | null {
  if (!encoded) return null;
  try {
    const buffer = Buffer.from(encoded, 'base64');
    const scVal = xdr.ScVal.fromXDR(buffer);
    return decodeScVal(scVal).display;
  } catch {
    return encoded;
  }
}

function isContractAddress(value: string): boolean {
  return CONTRACT_ID_REGEX.test(value);
}

function inferContractType(
  apiContractData: APIContractData | null,
  verifiedContract: VerifiedContract | undefined
): string {
  if (apiContractData?.assetCode) return 'token';
  if (isSacContract(apiContractData)) return 'token';
  if (verifiedContract?.type) return verifiedContract.type;
  return 'contract';
}

function isSacContract(apiData?: APIContractData | null): boolean {
  return Boolean(apiData?.isSac ?? apiData?.sac);
}

function isTokenLikeContract(apiData?: APIContractData | null): boolean {
  return Boolean(apiData?.assetCode || isSacContract(apiData));
}

function maxCount(...values: Array<number | string | null | undefined>): number {
  return values.reduce<number>((max, value) => {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) && numeric > max ? numeric : max;
  }, 0);
}

function mapEventSummary(apiData: APIContractData | null, events: ParsedEvent[], totalOverride?: number): EventSummary {
  const totalEvents = maxCount(apiData?.totalEvents, events.length, totalOverride);
  return {
    totalEvents,
    transfers: 0,
    approvals: 0,
    mints: 0,
    burns: 0,
    clawbacks: 0,
    unknown: totalEvents,
    uniqueAddresses: [],
    totalVolume: '0',
  };
}

function mapStorage(contractId: string, apiData: APIContractData): ContractStorageResult | null {
  if (!apiData.totalStorageEntries) return null;

  return {
    contractId,
    entries: [],
    totalEntries: Number(apiData.totalStorageEntries || 0),
    fetchedAt: Date.now(),
    instanceData: undefined,
  };
}

function normalizeScValTypeName(rawType?: string): string {
  if (!rawType) return 'Unknown';
  return rawType.replace(/^scv/, '');
}

function decodeStorageScVal(encoded?: string): { display?: string; type?: string } {
  if (!encoded) return {};
  try {
    const scVal = xdr.ScVal.fromXDR(Buffer.from(encoded, 'base64'));
    return {
      display: decodeScVal(scVal).display,
      type: normalizeScValTypeName(scVal.switch().name),
    };
  } catch {
    return {};
  }
}

function decodeStorageEntryXdr(encoded?: string): {
  keyDisplay?: string;
  keyType?: string;
  valueDisplay?: string;
  valueType?: string;
  durability?: 'temporary' | 'persistent' | 'instance';
} {
  if (!encoded) return {};

  try {
    const ledgerEntry = xdr.LedgerEntryData.fromXDR(Buffer.from(encoded, 'base64'));
    if (ledgerEntry.switch().name !== 'contractData') return {};

    const contractData = ledgerEntry.contractData();
    const keyScVal = contractData.key();
    const valueScVal = contractData.val();
    const keyDisplay = decodeScVal(keyScVal).display || keyScVal.switch().name;
    const valueDisplay = decodeScVal(valueScVal).display || valueScVal.switch().name;
    const keyType = normalizeScValTypeName(keyScVal.switch().name);
    const valueType = normalizeScValTypeName(valueScVal.switch().name);
    const durabilityName = contractData.durability().name as 'temporary' | 'persistent' | 'instance';

    return {
      keyDisplay,
      keyType,
      valueDisplay,
      valueType,
      durability: durabilityName,
    };
  } catch {
    return {};
  }
}

async function fetchContractStorage(contractId: string, totalStorageEntries?: number): Promise<ContractStorageResult | null> {
  const data = await getApiV1Data(
    apiEndpoints.v1.contractStorage(contractId, { page: 1, itemsPerPage: 30 })
  );

  const records: ContractStorageEntryRecord[] = data.member || [];
  if (records.length === 0 && !totalStorageEntries) return null;

  const entries: ContractStorageEntry[] = records.map((item, index) => {
    const key = item.storageKey || item.entryDecoded?.key || '';
    const xdrPayload = item.entryXdr || item.entryDecoded?.xdr || '';

    const keyFromScVal = decodeStorageScVal(key);
    const decodedFromEntry = decodeStorageEntryXdr(xdrPayload);

    const keyDisplay = decodedFromEntry.keyDisplay || keyFromScVal.display || key || `Entry #${index + 1}`;
    const keyType = decodedFromEntry.keyType || keyFromScVal.type || 'ScVal';
    const valueDisplay = decodedFromEntry.valueDisplay || `Storage entry (ledger ${item.lastModifiedLedgerSeq || item.entryDecoded?.lastModifiedLedgerSeq || 'N/A'})`;
    const valueType = decodedFromEntry.valueType || 'ContractData';
    const durability = decodedFromEntry.durability || 'persistent';
    const ttl = item.entryDecoded?.ttlLedgersRemaining;
    const expirationLedger = item.liveUntilLedgerSeq || item.entryDecoded?.liveUntilLedgerSeq;

    return {
      key,
      keyDisplay,
      keyType,
      value: xdrPayload,
      valueDisplay,
      valueType,
      durability,
      ttl,
      expirationLedger,
    };
  });

  return {
    contractId,
    entries,
    totalEntries: Number(totalStorageEntries ?? records.length),
    fetchedAt: Date.now(),
    instanceData: undefined,
  };
}

async function fetchContractEvents(
  contractId: string,
  page: number = 1,
  itemsPerPage: number = EVENTS_PAGE_SIZE
): Promise<ContractEventsPage> {
  const data = await getApiV1Data(
    apiEndpoints.v1.contractEvents(contractId, { page, itemsPerPage })
  );
  const records: ContractEventRecord[] = data.member || [];
  const items = records.map((item) => parseContractEvent(contractId, item));
  const totalItems = Number(data.totalItems ?? data.meta?.totalItems ?? items.length ?? 0);
  const hasMore = Boolean(data.meta?.hasMore);
  const nextBeforeId = data.meta?.nextBeforeId ?? null;
  const beforeId = data.meta?.beforeId ?? null;

  return {
    items,
    totalItems,
    currentPage: page,
    itemsPerPage,
    hasMore,
    nextBeforeId,
    beforeId,
  };
}

type ContractTransactionRecord = {
  txHash?: string;
  ledger?: number;
  createdAt?: string;
  sourceAccount?: string;
  hostFunctions?: unknown;
  totalOperations?: number;
  successful?: boolean;
};

function parseHostFunctionName(hostFunctions?: unknown): string {
  if (!hostFunctions) return 'invoke';

  let payload = hostFunctions;

  try {
    if (typeof hostFunctions === 'string') {
      payload = JSON.parse(hostFunctions);
    }
    if (!payload || typeof payload !== 'object') return 'invoke';

    const record = payload as {
      functionName?: unknown;
      invokeContracts?: unknown;
      hostFunctionInvocations?: unknown;
    };
    if (typeof record.functionName === 'string' && record.functionName.trim() !== '') {
      return record.functionName;
    }

    const invoking = Array.isArray(record.invokeContracts)
      ? record.invokeContracts
      : Array.isArray(record.hostFunctionInvocations)
        ? record.hostFunctionInvocations
        : [];
    const first = invoking[0] as { functionName?: unknown } | undefined;
    if (typeof first?.functionName === 'string' && first.functionName.trim() !== '') {
      return first.functionName;
    }
  } catch {
    // ignore
  }
  return 'invoke';
}

async function fetchContractTransactions(
  contractId: string,
  page: number = 1,
  itemsPerPage: number = 5
): Promise<ContractInvocationsPage> {
  const data = await getApiV1Data(
    apiEndpoints.v1.contractTransactions(contractId, {
      page,
      itemsPerPage,
      invocationsOnly: true,
    })
  );

  const records: ContractTransactionRecord[] = data.member || [];
  const items = records.map((item) => ({
    id: `${item.ledger ?? 0}-${item.txHash ?? ''}`,
    txHash: item.txHash || '',
    sourceAccount: item.sourceAccount || contractId,
    contractId,
    functionName: parseHostFunctionName(item.hostFunctions),
    parameters: [],
    createdAt: item.createdAt || '',
    ledger: Number(item.ledger ?? 0),
    successful: item.successful ?? true,
  }));
  const totalItems = Number(data.totalItems ?? data.meta?.totalItems ?? items.length ?? 0);
  const hasMore = Boolean(data.meta?.hasMore);
  const nextBeforeId = data.meta?.nextBeforeId ?? null;
  const beforeId = data.meta?.beforeId ?? null;

  return {
    items,
    totalItems,
    currentPage: page,
    itemsPerPage,
    hasMore,
    nextBeforeId,
    beforeId,
  };
}

async function fetchHolderBalances(contractId: string): Promise<ContractHolderBalance[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let data;
  try {
    data = await getApiV1Data(
      apiEndpoints.v1.contractHolderBalances(contractId),
      { signal: controller.signal }
    );
  } finally {
    clearTimeout(timeout);
  }
  const records: Array<{ relatedContractId: string; balanceRaw: string; inflowRaw: string; outflowRaw: string }> = data.member || data || [];
  if (!Array.isArray(records) || records.length === 0) return [];

  const uniqueIds = [...new Set(records.map(r => r.relatedContractId).filter(Boolean))];

  let contractsMap: Record<string, { assetCode?: string; verifiedMetadata?: { symbol?: string } }> = {};
  if (uniqueIds.length > 0) {
    try {
      const contractsData = await getApiV1Data(
        apiEndpoints.v1.contracts({ 'contractIds[]': uniqueIds })
      );
      const members = contractsData.member || contractsData || [];
      if (Array.isArray(members)) {
        members.forEach((c: any) => {
          if (c.contractId) {
            contractsMap[c.contractId] = c;
          }
        });
      }
    } catch {
      // If batch fetch fails, continue without labels
    }
  }

  return records.map(r => {
    const related = contractsMap[r.relatedContractId];
    const label = related?.assetCode
      || related?.verifiedMetadata?.symbol
      || (r.relatedContractId ? `${r.relatedContractId.slice(0, 4)}...${r.relatedContractId.slice(-4)}` : 'Unknown');
    const decimals = (related as any)?.verifiedMetadata?.decimals ?? 7;
    return {
      ...r,
      label,
      decimals,
    };
  });
}

async function fetchContractBalances(contractId: string, limit = 25, offset = 0): Promise<ContractBalancesPage> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let data;
  try {
    data = await getApiV1Data(
      apiEndpoints.v1.contractBalances(contractId, { limit, offset }),
      { signal: controller.signal }
    );
  } finally {
    clearTimeout(timeout);
  }

  const records: ContractTokenHolderBalance[] = Array.isArray(data.member) ? data.member : [];
  const summaryNode = data.meta?.summary || null;
  const summary = summaryNode ? {
    holdersCount: Number(summaryNode.holdersCount ?? 0),
    indexedBalanceRaw: String(summaryNode.indexedBalanceRaw ?? '0'),
    inflowRaw: String(summaryNode.inflowRaw ?? '0'),
    outflowRaw: String(summaryNode.outflowRaw ?? '0'),
    hasMore: Boolean(summaryNode.hasMore ?? data.meta?.hasMore),
  } : null;

  return {
    items: records,
    summary,
    hasMore: Boolean(data.meta?.hasMore ?? summary?.hasMore),
    nextOffset: data.meta?.nextOffset ?? null,
    limit: Number(data.meta?.limit ?? limit),
    offset: Number(data.meta?.offset ?? offset),
  };
}

function buildSacAssetKey(apiData: APIContractData): string | null {
  const code = String(apiData.assetCode || '').trim();
  const issuer = String(apiData.assetIssuer || '').trim();
  if (!code) return null;

  if (code.toUpperCase() === 'XLM' && !issuer) {
    return 'XLM-native';
  }

  return issuer ? `${code}-${issuer}` : null;
}

function normalizeRawInteger(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (raw === '') return null;
  if (/^-?\d+$/.test(raw)) return raw;

  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return null;

  return String(Math.trunc(numeric));
}

function subtractRawIntegers(left: string | null, right: string | null): string | null {
  if (left === null || right === null) return null;

  try {
    return (BigInt(left) - BigInt(right)).toString();
  } catch {
    const diff = Number(left) - Number(right);
    return Number.isFinite(diff) ? String(Math.trunc(diff)) : null;
  }
}

function isZeroRaw(value: string | null): boolean {
  if (value === null) return true;
  try {
    return BigInt(value) === BigInt(0);
  } catch {
    return Number(value) === 0;
  }
}

async function fetchSacMarketReconciliation(
  apiData: APIContractData,
  balanceSummary: ContractBalanceSummary | null
): Promise<SacMarketReconciliation | null> {
  if (!isSacContract(apiData) || !apiData.assetCode) return null;

  const assetKey = buildSacAssetKey(apiData);
  if (!assetKey) return null;

  let assetData: any = null;
  try {
    assetData = await getApiV1Data(apiEndpoints.v1.assetById(assetKey));
  } catch {
    return {
      assetKey,
      indexedBalanceRaw: balanceSummary?.indexedBalanceRaw ?? null,
      assetMarketSupplyRaw: null,
      differenceRaw: null,
      status: 'market_unavailable',
    };
  }

  const market = assetData?.market || {};
  const marketSupplyRaw = normalizeRawInteger(market.supply ?? assetData?.latestStatistic?.supply ?? assetData?.supply);
  const indexedBalanceRaw = normalizeRawInteger(balanceSummary?.indexedBalanceRaw);
  const differenceRaw = subtractRawIntegers(indexedBalanceRaw, marketSupplyRaw);
  const lastMarketUpdate = market.updated_at || market.updatedAt || assetData?.updatedAt || assetData?.updated_at;

  let status: SacReconciliationStatus = 'market_unavailable';
  if (marketSupplyRaw === null) {
    status = 'market_unavailable';
  } else if (!balanceSummary || indexedBalanceRaw === null || (balanceSummary.holdersCount === 0 && !isZeroRaw(marketSupplyRaw))) {
    status = 'not_enough_indexed_data';
  } else {
    status = differenceRaw === '0' ? 'matched' : 'differs';
  }

  return {
    assetKey,
    indexedBalanceRaw,
    assetMarketSupplyRaw: marketSupplyRaw,
    differenceRaw,
    lastMarketUpdate: typeof lastMarketUpdate === 'string' && lastMarketUpdate.trim() !== '' ? lastMarketUpdate : undefined,
    status,
  };
}

async function fetchTokenBalanceBundle(
  contractId: string,
  apiData: APIContractData
): Promise<{ balances: ContractBalancesPage; reconciliation: SacMarketReconciliation | null } | null> {
  if (!isTokenLikeContract(apiData)) return null;

  const balances = await fetchContractBalances(contractId);
  const reconciliation = await fetchSacMarketReconciliation(apiData, balances.summary);

  return { balances, reconciliation };
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

  const symbol = apiData.assetCode || verifiedContract?.symbol || 'TOKEN';
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
    name: verifiedContract?.name || symbol,
    symbol,
    decimals: Number(verifiedContract?.decimals ?? 7),
    isSAC: isSacContract(apiData),
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

function mapVerifiedContract(apiData: APIContractData): VerifiedContract | undefined {
  const metadata = apiData.verifiedMetadata;
  if (!metadata) return undefined;

  return {
    id: apiData.contractId,
    name: metadata.displayName || metadata.symbol || apiData.assetCode || 'Smart Contract',
    type: metadata.metadataType || (isSacContract(apiData) || apiData.assetCode ? 'token' : 'contract'),
    sep41: Boolean(metadata.isSep41 ?? metadata.sep41),
    symbol: metadata.symbol || undefined,
    decimals: metadata.decimals,
    verified: Boolean(metadata.isVerified ?? metadata.verified),
    website: metadata.website || undefined,
    description: metadata.description || undefined,
    iconUrl: metadata.iconUrl || undefined,
  };
}

function buildVerification(apiData: APIContractData): ContractVerification | null {
  return {
    isVerified: Boolean(apiData.sourceCodeVerified),
    wasmHash: apiData.wasmId || undefined,
  };
}

async function fetchContractBaseData(contractId: string): Promise<APIContractData> {
  return getApiV1Data(apiEndpoints.v1.contractById(contractId));
}

function isContractNotFoundError(error: unknown): boolean {
  const status = Number((error as any)?.response?.status);
  const title = String((error as any)?.response?.title || '').toLowerCase();
  const message = String((error as any)?.message || '').toLowerCase();

  return status === 404 || title.includes('not found') || message.includes('not found');
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
  const { network: activeNetwork } = useNetwork();
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
  const [contractEvents, setContractEvents] = useState<ParsedEvent[]>([]);
  const [contractStorage, setContractStorage] = useState<ContractStorageResult | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [storageLoading, setStorageLoading] = useState(false);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [historyInvocations, setHistoryInvocations] = useState<ContractInvocation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyPagination, setHistoryPagination] = useState({
    currentPage: 1,
    totalItems: 0,
    itemsPerPage: HISTORY_PAGE_SIZE,
    hasMore: false,
    nextBeforeId: null as number | null,
    beforeId: null as number | null,
  });
  const [eventsPagination, setEventsPagination] = useState({
    currentPage: 1,
    totalItems: 0,
    itemsPerPage: EVENTS_PAGE_SIZE,
    hasMore: false,
    nextBeforeId: null as number | null,
    beforeId: null as number | null,
  });
  const [holderBalances, setHolderBalances] = useState<ContractHolderBalance[]>([]);
  const [tokenHolderBalances, setTokenHolderBalances] = useState<ContractTokenHolderBalance[]>([]);
  const [tokenBalanceSummary, setTokenBalanceSummary] = useState<ContractBalanceSummary | null>(null);
  const [tokenBalancesLoading, setTokenBalancesLoading] = useState(false);
  const [tokenBalancesLoaded, setTokenBalancesLoaded] = useState(false);
  const [sacMarketReconciliation, setSacMarketReconciliation] = useState<SacMarketReconciliation | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesLoaded, setBalancesLoaded] = useState(false);
  const [selectedBalanceToken, setSelectedBalanceToken] = useState<string>('all');
  const [checkingOtherNetworks, setCheckingOtherNetworks] = useState(false);
  const [availableNetworks, setAvailableNetworks] = useState<NetworkType[]>([]);

  const switchNetworkAndReload = useCallback((targetNetwork: NetworkType) => {
    redirectToNetwork(targetNetwork, pathname, searchParams.toString(), window.location.hash);
  }, [pathname, searchParams]);

  const checkOtherNetworksForContract = useCallback(async (contractId: string, currentNetwork: NetworkType) => {
    const otherNetworks: NetworkType[] = ['mainnet', 'testnet'].filter(
      (network): network is NetworkType => network !== currentNetwork
    );

    if (!contractId || otherNetworks.length === 0) return [];

    const checks = await Promise.all(
      otherNetworks.map(async (network) => {
        try {
          await getApiV1Data(apiEndpoints.v1.contractById(contractId, { network }));
          return network;
        } catch {
          return null;
        }
      })
    );

    return checks.filter((network): network is NetworkType => network !== null);
  }, []);

  useEffect(() => {
    if (isInvalidId) return;

    let cancelled = false;

    const loadContractData = async () => {
      setIsValidating(true);
      setError(null);
      setAvailableNetworks([]);
      setCheckingOtherNetworks(false);
      setLoadingSections(INITIAL_LOADING_SECTIONS);

      try {
        const apiData = await fetchContractBaseData(id);
        if (cancelled) return;

        const verifiedContract = mapVerifiedContract(apiData);
        const type = inferContractType(apiData, verifiedContract);
        const tokenMetadata = buildTokenMetadata(id, apiData, verifiedContract, type);

        setContractData({
          id,
          tokenMetadata,
          verifiedContract,
          type,
          accessControl: null,
          isVerified: Boolean(apiData.sourceCodeVerified || verifiedContract?.verified),
          apiContractData: apiData,
          events: [],
          eventSummary: mapEventSummary(apiData, []),
          invocations: [],
          storage: mapStorage(id, apiData),
          spec: null,
          verification: buildVerification(apiData),
          contractMetadata: null,
        });

        setContractEvents([]);
        setEventsLoaded(false);
        setEventsLoading(false);
        setEventsError(null);
        setEventsPagination({
          currentPage: 1,
          totalItems: Number(apiData.totalEvents ?? 0),
          itemsPerPage: EVENTS_PAGE_SIZE,
          hasMore: Number(apiData.totalEvents ?? 0) > EVENTS_PAGE_SIZE,
          nextBeforeId: null,
          beforeId: null,
        });
        setHistoryInvocations([]);
        setHistoryLoaded(false);
        setHistoryLoading(false);
        setHistoryPagination({
          currentPage: 1,
          totalItems: Number(apiData.totalInvokes ?? 0),
          itemsPerPage: HISTORY_PAGE_SIZE,
          hasMore: Number(apiData.totalInvokes ?? 0) > HISTORY_PAGE_SIZE,
          nextBeforeId: null,
          beforeId: null,
        });

        setIsValidating(false);

        // Load overview preview data in background (non-blocking for initial render)
        void (async () => {
          if (cancelled) return;
          setLoadingSections((prev) => ({
            ...prev,
            events: true,
            invocations: true,
            storage: true,
            spec: false,
          }));
          setBalancesLoading(true);
          setTokenBalancesLoading(isTokenLikeContract(apiData));

          const [historyResult, eventsResult, storageResult, balancesResult, tokenBalancesResult] = await Promise.allSettled([
            fetchContractTransactions(id, 1, 5),
            fetchContractEvents(id, 1, 5),
            fetchContractStorage(id, apiData.totalStorageEntries ? Number(apiData.totalStorageEntries) : undefined),
            fetchHolderBalances(id),
            fetchTokenBalanceBundle(id, apiData),
          ]);

          if (cancelled) return;

          if (historyResult.status === 'fulfilled') {
            setHistoryInvocations(historyResult.value.items);
            setHistoryPagination((prev) => ({
              ...prev,
              totalItems: historyResult.value.totalItems,
              hasMore: historyResult.value.totalItems > HISTORY_PAGE_SIZE,
              nextBeforeId: historyResult.value.nextBeforeId ?? null,
              beforeId: historyResult.value.beforeId ?? null,
            }));
          }

          if (eventsResult.status === 'fulfilled') {
            setContractEvents(eventsResult.value.items);
            setEventsPagination((prev) => ({
              ...prev,
              totalItems: eventsResult.value.totalItems,
              hasMore: eventsResult.value.totalItems > EVENTS_PAGE_SIZE,
              nextBeforeId: eventsResult.value.nextBeforeId ?? null,
              beforeId: eventsResult.value.beforeId ?? null,
            }));
          } else {
            setEventsError(eventsResult.reason instanceof Error ? eventsResult.reason.message : 'Failed to load events');
          }

          if (storageResult.status === 'fulfilled' && storageResult.value) {
            setContractStorage(storageResult.value);
            setStorageLoaded(true);
          }

          if (balancesResult.status === 'fulfilled') {
            setHolderBalances(balancesResult.value);
            setBalancesLoaded(true);
          } else {
            setBalancesLoaded(true);
          }
          setBalancesLoading(false);

          if (tokenBalancesResult.status === 'fulfilled' && tokenBalancesResult.value) {
            setTokenHolderBalances(tokenBalancesResult.value.balances.items);
            setTokenBalanceSummary(tokenBalancesResult.value.balances.summary);
            setSacMarketReconciliation(tokenBalancesResult.value.reconciliation);
          }
          setTokenBalancesLoaded(true);
          setTokenBalancesLoading(false);

          setLoadingSections((prev) => ({
            ...prev,
            events: false,
            invocations: false,
            storage: false,
          }));
        })();
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load contract data');
        if (isContractNotFoundError(err)) {
          setCheckingOtherNetworks(true);
          const networksWithContract = await checkOtherNetworksForContract(id, activeNetwork);
          if (!cancelled) {
            setAvailableNetworks(networksWithContract);
            setCheckingOtherNetworks(false);
          }
        }
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
  }, [id, isInvalidId, checkOtherNetworksForContract, activeNetwork]);

  useEffect(() => {
    setContractEvents([]);
    setContractStorage(null);
    setAvailableNetworks([]);
    setCheckingOtherNetworks(false);
    setEventsLoaded(false);
    setEventsLoading(false);
    setEventsError(null);
    setEventsPagination({
      currentPage: 1,
      totalItems: 0,
      itemsPerPage: EVENTS_PAGE_SIZE,
      hasMore: false,
      nextBeforeId: null,
      beforeId: null,
    });
    setStorageLoaded(false);
    setStorageLoading(false);
    setStorageError(null);
    setHolderBalances([]);
    setTokenHolderBalances([]);
    setTokenBalanceSummary(null);
    setTokenBalancesLoading(false);
    setTokenBalancesLoaded(false);
    setSacMarketReconciliation(null);
    setBalancesLoading(false);
    setBalancesLoaded(false);
    setSelectedBalanceToken('all');
    setHistoryInvocations([]);
    setHistoryLoaded(false);
    setHistoryLoading(false);
    setHistoryPagination({
      currentPage: 1,
      totalItems: 0,
      itemsPerPage: HISTORY_PAGE_SIZE,
      hasMore: false,
      nextBeforeId: null,
      beforeId: null,
    });
  }, [id]);

  const loadEventsPage = useCallback(async (page: number) => {
    if (eventsLoading) return;
    setEventsLoading(true);
    setEventsError(null);
    try {
      const fetched = await fetchContractEvents(id, page, EVENTS_PAGE_SIZE);
      setContractEvents(fetched.items);
      setEventsPagination({
        currentPage: fetched.currentPage,
        totalItems: fetched.totalItems,
        itemsPerPage: fetched.itemsPerPage,
        hasMore: fetched.hasMore,
        nextBeforeId: fetched.nextBeforeId ?? null,
        beforeId: fetched.beforeId ?? null,
      });
      setEventsLoaded(true);
    } catch (err) {
      setEventsError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setEventsLoading(false);
    }
  }, [eventsLoading, id]);

  const loadContractStorage = useCallback(async () => {
    if (storageLoaded || storageLoading) return;
    setStorageLoading(true);
    setStorageError(null);
    try {
      const fetched = await fetchContractStorage(id, contractData?.apiContractData?.totalStorageEntries);
      setContractStorage(fetched);
      setStorageLoaded(true);
    } catch (err) {
      setStorageError(err instanceof Error ? err.message : 'Failed to load storage');
    } finally {
      setStorageLoading(false);
    }
  }, [contractData?.apiContractData?.totalStorageEntries, id, storageLoaded, storageLoading]);

  const loadHistoryPage = useCallback(async (page: number) => {
    if (historyLoading) return;
    setHistoryLoading(true);
    try {
      const result = await fetchContractTransactions(id, page, HISTORY_PAGE_SIZE);
      setHistoryInvocations(result.items);
      setHistoryPagination({
        currentPage: result.currentPage,
        totalItems: result.totalItems,
        itemsPerPage: result.itemsPerPage,
        hasMore: result.hasMore,
        nextBeforeId: result.nextBeforeId ?? null,
        beforeId: result.beforeId ?? null,
      });
      setHistoryLoaded(true);
    } catch (err) {
      console.error('Failed to load history page:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyLoading, id]);

  const loadHolderBalances = useCallback(async () => {
    if (balancesLoaded || balancesLoading) return;
    setBalancesLoading(true);
    try {
      const balances = await fetchHolderBalances(id);
      setHolderBalances(balances);
      setBalancesLoaded(true);
    } catch (err) {
      console.error('Failed to load holder balances:', err);
      setBalancesLoaded(true);
    } finally {
      setBalancesLoading(false);
    }
  }, [balancesLoaded, balancesLoading, id]);

  const loadTokenBalances = useCallback(async () => {
    const apiData = contractData?.apiContractData;
    if (!apiData || !isTokenLikeContract(apiData) || tokenBalancesLoaded || tokenBalancesLoading) return;

    setTokenBalancesLoading(true);
    try {
      const bundle = await fetchTokenBalanceBundle(id, apiData);
      if (bundle) {
        setTokenHolderBalances(bundle.balances.items);
        setTokenBalanceSummary(bundle.balances.summary);
        setSacMarketReconciliation(bundle.reconciliation);
      }
      setTokenBalancesLoaded(true);
    } catch (err) {
      console.error('Failed to load token balances:', err);
      setTokenBalancesLoaded(true);
    } finally {
      setTokenBalancesLoading(false);
    }
  }, [contractData?.apiContractData, id, tokenBalancesLoaded, tokenBalancesLoading]);

  const handleTabChange = (tabId: ContractTab) => {
    if (tabId === 'history' && !historyLoaded) {
      void loadHistoryPage(1);
    }
    if ((tabId === 'events' || tabId === 'operations') && !eventsLoaded) {
      void loadEventsPage(1);
    }
    if (tabId === 'storage' || tabId === 'overview') {
      void loadContractStorage();
      void loadHolderBalances();
      void loadTokenBalances();
    }
  };

  if (isInvalidId) {
    return (
      <div className="min-h-[70vh] bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full mx-auto my-auto">
        <div className="w-24 h-24 mx-auto bg-violet-500/12 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-12 h-12 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 8l-4 4 4 4m8-8l4 4-4 4M14 5l-4 14" />
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
      </div>
    );
  }

  if (error) {
    const hasNetworkMatch = availableNetworks.length > 0;
    const title = hasNetworkMatch ? 'Contract Found On Another Network' : 'Contract Not Found';
    const description = hasNetworkMatch
      ? 'This contract is not available on the currently selected network.'
      : 'The contract may not exist on this network.';

    return (
      <div className="min-h-[70vh] bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full mx-auto my-auto">
        <div className={`w-24 h-24 mx-auto rounded-2xl flex items-center justify-center mb-4 ${hasNetworkMatch ? 'bg-violet-500/12' : 'bg-fuchsia-500/12'}`}>
          <svg className={`w-12 h-12 ${hasNetworkMatch ? 'text-violet-500' : 'text-fuchsia-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 8l-4 4 4 4m8-8l4 4-4 4M14 5l-4 14" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{title}</h1>
        <p className="text-[var(--text-tertiary)] mb-4 text-center">{description}</p>
        <p className="text-[var(--text-muted)] text-sm mb-2 text-center">
          Current network: <span className="font-semibold text-[var(--text-secondary)]">{NETWORK_CONFIGS[activeNetwork].displayName}</span>
        </p>
        <p className="text-[var(--text-muted)] font-mono text-sm mb-4 break-all max-w-lg text-center">{id}</p>
        {checkingOtherNetworks && (
          <p className="text-[var(--text-muted)] text-sm mb-4">Checking other networks...</p>
        )}
        {!checkingOtherNetworks && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {availableNetworks.map((network) => (
              <button
                key={network}
                onClick={() => switchNetworkAndReload(network)}
                className="px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                Switch to {NETWORK_CONFIGS[network].displayName}
              </button>
            ))}
            <Link
              href="/contracts"
              className="px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              Go to Contracts
            </Link>
          </div>
        )}
        </div>
      </div>
    );
  }

  const baseData = contractData || emptyContractData(id);
  const visibleEvents = contractEvents.length > 0 ? contractEvents : baseData.events;
  const visibleInvocations = historyInvocations.length > 0 ? historyInvocations : baseData.invocations;
  const visibleStorage = storageLoaded ? contractStorage : baseData.storage;
  const totalInvokes = maxCount(
    baseData.apiContractData?.totalInvokes,
    historyPagination.totalItems,
    visibleInvocations.length
  );
  const totalEvents = maxCount(
    baseData.apiContractData?.totalEvents,
    eventsPagination.totalItems,
    visibleEvents.length
  );
  const totalOperations = maxCount(
    baseData.apiContractData?.totalOperations,
    baseData.apiContractData?.totalInvokes,
    historyPagination.totalItems,
    visibleInvocations.length,
    visibleEvents.length
  );
  const eventSummaryFromData = mapEventSummary(baseData.apiContractData, visibleEvents, totalEvents);

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
    events: visibleEvents,
    eventSummary: eventSummaryFromData,
    storage: visibleStorage,
    invocations: visibleInvocations,
    historyInvocations: visibleInvocations,
    historyPagination: {
      currentPage: historyPagination.currentPage,
      totalItems: totalInvokes,
      itemsPerPage: historyPagination.itemsPerPage,
      hasMore: historyPagination.hasMore || totalInvokes > historyPagination.currentPage * historyPagination.itemsPerPage,
      nextBeforeId: historyPagination.nextBeforeId,
      beforeId: historyPagination.beforeId,
    },
    eventsPagination: {
      currentPage: eventsPagination.currentPage,
      totalItems: totalEvents,
      itemsPerPage: eventsPagination.itemsPerPage,
      hasMore: eventsPagination.hasMore || totalEvents > eventsPagination.currentPage * eventsPagination.itemsPerPage,
      nextBeforeId: eventsPagination.nextBeforeId,
      beforeId: eventsPagination.beforeId,
    },
    spec: baseData.spec,
    totalTransactions: baseData.apiContractData?.totalTransactions,
    totalInvokes,
    createdAt: baseData.apiContractData?.createdAt,
    wasmId: baseData.apiContractData?.wasmId || undefined,
    contractCode: baseData.apiContractData?.sourceCode || baseData.apiContractData?.contractCode || undefined,
    sourceCodeVerified: baseData.apiContractData?.sourceCodeVerified,
    assetIssuer: baseData.apiContractData?.assetIssuer || undefined,
    isSAC: isSacContract(baseData.apiContractData),
    totalOperations,
    holderBalances,
    tokenHolderBalances,
    tokenBalanceSummary,
    sacMarketReconciliation,
    selectedBalanceToken,
    _loading: isValidating
      ? { events: true, invocations: true, storage: true, spec: true, balances: true, tokenBalances: true }
      : {
          events: eventsLoading,
          invocations: historyLoading || loadingSections.invocations,
          storage: storageLoading,
          spec: loadingSections.spec,
          balances: balancesLoading,
          tokenBalances: tokenBalancesLoading,
        },
  };

  return (
    <>
      <div className="hidden md:block">
        <ContractDesktopView
          contract={contractForView}
          operations={[]}
          onTabChange={handleTabChange}
          onHistoryPageChange={loadHistoryPage}
          onEventsPageChange={loadEventsPage}
          onBalanceTokenChange={setSelectedBalanceToken}
        />
      </div>
      <div className="md:hidden">
        <ContractMobileView
          contract={contractForView}
          operations={[]}
          onTabChange={handleTabChange}
          onHistoryPageChange={loadHistoryPage}
          onEventsPageChange={loadEventsPage}
          onBalanceTokenChange={setSelectedBalanceToken}
        />
      </div>
    </>
  );
}
