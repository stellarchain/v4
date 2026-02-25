// Contract Metadata Service (SEP-0046)
// Extracts metadata from Soroban contracts
// https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0046.md

import { xdr, Address, scValToNative, nativeToScVal } from '@stellar/stellar-sdk';
import { getSorobanServer, isContractAddress, simulateContractRead } from './client';

// ============================================================================
// Types
// ============================================================================

export interface ContractMetadataResult {
  sourceRepo?: string;
  homeDomain?: string;
  customMeta?: Record<string, string>;
}

export interface ContractAccessControlResult {
  owner?: string;
  admin?: string;
  pendingOwner?: string;
  isPaused: boolean;
  roles?: Array<{ role: string; members: string[] }>;
}

export type ContractType = 'token' | 'nft' | 'rwa' | 'vault' | 'dex' | 'other';

interface ContractCodeEntry {
  wasmHash: string;
  metadata?: SCMetaEntry[];
}

interface SCMetaEntry {
  key: string;
  value: string;
}

// ============================================================================
// Cache Configuration
// ============================================================================

const METADATA_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const FAILED_CACHE_TTL_MS = 2 * 60 * 1000;     // 2 minutes for failed lookups

interface MetadataCacheEntry<T> {
  data: T | null;
  expiry: number;
  failed: boolean;
}

const metadataCache: Map<string, MetadataCacheEntry<ContractMetadataResult>> = new Map();
const accessControlCache: Map<string, MetadataCacheEntry<ContractAccessControlResult>> = new Map();
const contractTypeCache: Map<string, MetadataCacheEntry<ContractType>> = new Map();

// ============================================================================
// Cache Helpers
// ============================================================================

function getCached<T>(cache: Map<string, MetadataCacheEntry<T>>, key: string): T | null | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined; // Not in cache

  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return undefined; // Expired
  }

  return entry.data; // Could be null for failed lookups
}

function setCache<T>(
  cache: Map<string, MetadataCacheEntry<T>>,
  key: string,
  data: T | null,
  failed: boolean = false
): void {
  const ttl = failed ? FAILED_CACHE_TTL_MS : METADATA_CACHE_TTL_MS;
  cache.set(key, {
    data,
    expiry: Date.now() + ttl,
    failed,
  });
}

// Clear all metadata caches
export function clearMetadataCaches(): void {
  metadataCache.clear();
  accessControlCache.clear();
  contractTypeCache.clear();
}

// Invalidate cache for a specific contract
export function invalidateContractCache(contractId: string): void {
  metadataCache.delete(contractId);
  accessControlCache.delete(contractId);
  contractTypeCache.delete(contractId);
}

// ============================================================================
// RPC Helpers
// ============================================================================

// Get contract instance storage entry
async function getContractInstanceData(contractId: string): Promise<xdr.ContractDataEntry | null> {
  try {
    const server = getSorobanServer();
    const contractAddress = new Address(contractId);

    // Contract instance is stored at LedgerKey::ContractData with key = LedgerKeyContractInstance
    const ledgerKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: contractAddress.toScAddress(),
        key: xdr.ScVal.scvLedgerKeyContractInstance(),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );

    const response = await server.getLedgerEntries(ledgerKey);

    if (response.entries && response.entries.length > 0) {
      const entry = response.entries[0];
      // The SDK parses XDR for us - val contains LedgerEntryData
      return entry.val.contractData();
    }

    return null;
  } catch (error) {
    console.error('Error getting contract instance data:', error);
    return null;
  }
}

// Get contract code (WASM) entry to extract metadata
async function getContractCode(wasmHash: Buffer): Promise<xdr.ContractCodeEntry | null> {
  try {
    const server = getSorobanServer();

    const ledgerKey = xdr.LedgerKey.contractCode(
      new xdr.LedgerKeyContractCode({
        hash: wasmHash,
      })
    );

    const response = await server.getLedgerEntries(ledgerKey);

    if (response.entries && response.entries.length > 0) {
      const entry = response.entries[0];
      // The SDK parses XDR for us - val contains LedgerEntryData
      return entry.val.contractCode();
    }

    return null;
  } catch (error) {
    console.error('Error getting contract code:', error);
    return null;
  }
}

// Parse SCMetaV0 entries from contract code
function parseSCMetaV0(codeEntry: xdr.ContractCodeEntry): SCMetaEntry[] {
  const entries: SCMetaEntry[] = [];

  try {
    // Metadata is embedded in the WASM custom sections
    // We parse the raw code to extract SCMetaV0
    const code = codeEntry.code();
    const metaEntries = extractWasmMetadata(code);
    entries.push(...metaEntries);
  } catch (error) {
    // Metadata parsing is best-effort
  }

  return entries;
}

// Extract metadata from WASM custom sections
function extractWasmMetadata(wasmCode: Buffer): SCMetaEntry[] {
  const entries: SCMetaEntry[] = [];

  try {
    // WASM magic number check
    if (wasmCode.length < 8 || wasmCode[0] !== 0x00 || wasmCode[1] !== 0x61 ||
      wasmCode[2] !== 0x73 || wasmCode[3] !== 0x6d) {
      return entries;
    }

    // Simple WASM section parser to find custom sections
    let offset = 8; // Skip magic + version

    while (offset < wasmCode.length) {
      const sectionId = wasmCode[offset++];

      // Read LEB128 section size
      let sectionSize = 0;
      let shift = 0;
      while (offset < wasmCode.length) {
        const byte = wasmCode[offset++];
        sectionSize |= (byte & 0x7f) << shift;
        if ((byte & 0x80) === 0) break;
        shift += 7;
      }

      if (sectionId === 0) { // Custom section
        const sectionStart = offset;
        const sectionEnd = offset + sectionSize;

        // Read section name (LEB128 length + string)
        let nameLen = 0;
        shift = 0;
        while (offset < sectionEnd) {
          const byte = wasmCode[offset++];
          nameLen |= (byte & 0x7f) << shift;
          if ((byte & 0x80) === 0) break;
          shift += 7;
        }

        if (offset + nameLen <= sectionEnd) {
          const name = wasmCode.slice(offset, offset + nameLen).toString('utf8');
          offset += nameLen;

          // Look for contractmetav0 or contractenvmetav0 sections (SEP-0046)
          if (name === 'contractmetav0' || name === 'meta') {
            const dataLen = sectionEnd - offset;
            if (dataLen > 0) {
              const metaData = wasmCode.slice(offset, sectionEnd);
              const parsed = parseContractMetaV0(metaData);
              entries.push(...parsed);
            }
          }
        }

        offset = sectionEnd;
      } else {
        offset += sectionSize;
      }
    }
  } catch (error) {
    // Best-effort metadata extraction
  }

  return entries;
}

// Parse SCMetaV0 XDR entries
function parseContractMetaV0(data: Buffer): SCMetaEntry[] {
  const entries: SCMetaEntry[] = [];

  try {
    // SCMetaV0 is a vector of SCMetaEntry
    // Each entry has: discriminant (0=entry), key (string), val (string)
    let offset = 0;

    // Read vector length (4 bytes big-endian)
    if (data.length < 4) return entries;
    const count = data.readUInt32BE(0);
    offset = 4;

    for (let i = 0; i < count && offset < data.length; i++) {
      // Read discriminant (4 bytes)
      if (offset + 4 > data.length) break;
      const disc = data.readUInt32BE(offset);
      offset += 4;

      if (disc !== 0) continue; // Only handle SCMetaEntry::Entry

      // Read key string (4 byte length + data)
      if (offset + 4 > data.length) break;
      const keyLen = data.readUInt32BE(offset);
      offset += 4;

      if (offset + keyLen > data.length) break;
      const key = data.slice(offset, offset + keyLen).toString('utf8');
      offset += keyLen;
      // Align to 4 bytes
      offset += (4 - (keyLen % 4)) % 4;

      // Read value string
      if (offset + 4 > data.length) break;
      const valLen = data.readUInt32BE(offset);
      offset += 4;

      if (offset + valLen > data.length) break;
      const value = data.slice(offset, offset + valLen).toString('utf8');
      offset += valLen;
      offset += (4 - (valLen % 4)) % 4;

      entries.push({ key, value });
    }
  } catch (error) {
    // Best-effort parsing
  }

  return entries;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Fetch contract metadata from Soroban RPC (SEP-0046)
 * Extracts sourceRepo, homeDomain, and custom metadata from contract code
 */
export async function getContractMetadata(contractId: string): Promise<ContractMetadataResult | null> {
  if (!contractId || !isContractAddress(contractId)) {
    return null;
  }

  // Check cache
  const cached = getCached(metadataCache, contractId);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const result: ContractMetadataResult = {};

    // Get contract instance to find WASM hash
    const instanceData = await getContractInstanceData(contractId);
    if (!instanceData) {
      setCache(metadataCache, contractId, null, true);
      return null;
    }

    // Extract instance storage for metadata fields
    const instance = instanceData.val();
    if (instance.switch().name === 'scvContractInstance') {
      const contractInstance = instance.instance();

      // Check storage for metadata keys
      const storage = contractInstance.storage();
      if (storage) {
        for (const entry of storage) {
          const key = entry.key();
          const val = entry.val();

          try {
            const keyNative = scValToNative(key);
            const valNative = scValToNative(val);

            // SEP-0046 standard keys
            if (keyNative === 'SCMetaV0_sourceRepo' || keyNative === 'source_repo') {
              result.sourceRepo = String(valNative);
            } else if (keyNative === 'SCMetaV0_homeDomain' || keyNative === 'home_domain') {
              result.homeDomain = String(valNative);
            } else if (typeof keyNative === 'string' && keyNative.startsWith('meta_')) {
              if (!result.customMeta) result.customMeta = {};
              result.customMeta[keyNative.replace('meta_', '')] = String(valNative);
            }
          } catch {
            // Skip unparseable entries
          }
        }
      }

      // Try to get WASM code for embedded metadata
      const executable = contractInstance.executable();
      if (executable.switch().name === 'contractExecutableWasm') {
        const wasmHash = executable.wasmHash();
        const codeEntry = await getContractCode(wasmHash);

        if (codeEntry) {
          const metaEntries = parseSCMetaV0(codeEntry);

          for (const entry of metaEntries) {
            if (entry.key === 'rsver' || entry.key === 'rssdkver') {
              // Rust SDK version info
              if (!result.customMeta) result.customMeta = {};
              result.customMeta[entry.key] = entry.value;
            } else if (entry.key === 'source_repo' || entry.key === 'repo') {
              result.sourceRepo = entry.value;
            } else if (entry.key === 'home_domain' || entry.key === 'domain') {
              result.homeDomain = entry.value;
            } else {
              if (!result.customMeta) result.customMeta = {};
              result.customMeta[entry.key] = entry.value;
            }
          }
        }
      }
    }

    // Cache and return
    const hasData = result.sourceRepo || result.homeDomain || result.customMeta;
    setCache(metadataCache, contractId, hasData ? result : null, !hasData);
    return hasData ? result : null;
  } catch (error) {
    console.error('Error fetching contract metadata:', error);
    setCache(metadataCache, contractId, null, true);
    return null;
  }
}

/**
 * Get contract access control info (owner, admin, pause state)
 * Simulates calls to common access control methods
 */
export async function getContractAccessControl(contractId: string): Promise<ContractAccessControlResult> {
  if (!contractId || !isContractAddress(contractId)) {
    return { isPaused: false };
  }

  // Check cache
  const cached = getCached(accessControlCache, contractId);
  if (cached !== undefined) {
    return cached || { isPaused: false };
  }

  const result: ContractAccessControlResult = {
    isPaused: false,
  };

  try {
    // Query common access control methods in parallel
    const [ownerResult, adminResult, pendingOwnerResult, pausedResult] = await Promise.all([
      simulateContractRead(contractId, 'owner'),
      simulateContractRead(contractId, 'admin'),
      simulateContractRead(contractId, 'pending_owner'),
      simulateContractRead(contractId, 'paused'),
    ]);

    // Parse owner
    if (ownerResult) {
      try {
        const owner = scValToNative(ownerResult);
        if (typeof owner === 'string') {
          result.owner = owner;
        } else if (owner && typeof owner === 'object' && 'toString' in owner) {
          result.owner = owner.toString();
        }
      } catch {
        // Some contracts return Address type
        try {
          const addr = Address.fromScVal(ownerResult);
          result.owner = addr.toString();
        } catch {
          // Skip
        }
      }
    }

    // Parse admin
    if (adminResult) {
      try {
        const admin = scValToNative(adminResult);
        if (typeof admin === 'string') {
          result.admin = admin;
        } else if (admin && typeof admin === 'object' && 'toString' in admin) {
          result.admin = admin.toString();
        }
      } catch {
        try {
          const addr = Address.fromScVal(adminResult);
          result.admin = addr.toString();
        } catch {
          // Skip
        }
      }
    }

    // Parse pending owner
    if (pendingOwnerResult) {
      try {
        const pending = scValToNative(pendingOwnerResult);
        if (pending && typeof pending === 'string') {
          result.pendingOwner = pending;
        }
      } catch {
        // Skip
      }
    }

    // Parse paused state
    if (pausedResult) {
      try {
        const paused = scValToNative(pausedResult);
        result.isPaused = Boolean(paused);
      } catch {
        // Skip
      }
    }

    // Try to get roles (some contracts implement role-based access)
    const rolesResult = await simulateContractRead(contractId, 'get_roles');
    if (rolesResult) {
      try {
        const roles = scValToNative(rolesResult);
        if (Array.isArray(roles)) {
          result.roles = roles.map((r: { role: string; members: string[] }) => ({
            role: String(r.role || 'unknown'),
            members: Array.isArray(r.members) ? r.members.map(String) : [],
          }));
        }
      } catch {
        // Skip
      }
    }

    setCache(accessControlCache, contractId, result);
    return result;
  } catch (error) {
    console.error('Error fetching contract access control:', error);
    setCache(accessControlCache, contractId, result, true);
    return result;
  }
}

/**
 * Detect contract type based on interface methods
 * Checks for common method signatures to determine contract category
 */
export async function detectContractType(contractId: string): Promise<ContractType> {
  if (!contractId || !isContractAddress(contractId)) {
    return 'other';
  }

  // Check cache
  const cached = getCached(contractTypeCache, contractId);
  if (cached !== undefined) {
    return cached || 'other';
  }

  try {
    // Test for different contract interfaces by probing methods
    // Token interface (SEP-0041): name, symbol, decimals, balance
    const [nameResult, symbolResult, decimalsResult] = await Promise.all([
      simulateContractRead(contractId, 'name'),
      simulateContractRead(contractId, 'symbol'),
      simulateContractRead(contractId, 'decimals'),
    ]);

    const hasTokenInterface = nameResult && symbolResult && decimalsResult;

    if (hasTokenInterface) {
      // Check if it's an NFT (decimals = 0, has token_uri or metadata method)
      const decimals = decimalsResult ? scValToNative(decimalsResult) : null;

      if (decimals === 0) {
        const [tokenUriResult, metadataResult] = await Promise.all([
          simulateContractRead(contractId, 'token_uri', [nativeToScVal(1, { type: 'u128' })]),
          simulateContractRead(contractId, 'metadata', [nativeToScVal(1, { type: 'u128' })]),
        ]);

        if (tokenUriResult || metadataResult) {
          setCache(contractTypeCache, contractId, 'nft');
          return 'nft';
        }
      }

      // Check for RWA-specific methods (compliance, whitelist, etc.)
      const [complianceResult, whitelistResult] = await Promise.all([
        simulateContractRead(contractId, 'is_compliant'),
        simulateContractRead(contractId, 'is_whitelisted'),
      ]);

      if (complianceResult || whitelistResult) {
        setCache(contractTypeCache, contractId, 'rwa');
        return 'rwa';
      }

      // Check for vault-like behavior (deposit, withdraw, shares)
      const [depositMethodExists, withdrawMethodExists, sharesResult] = await Promise.all([
        simulateContractRead(contractId, 'total_assets'),
        simulateContractRead(contractId, 'total_supply'),
        simulateContractRead(contractId, 'convert_to_shares', [nativeToScVal(BigInt(1000000), { type: 'i128' })]),
      ]);

      if (depositMethodExists && withdrawMethodExists && sharesResult) {
        setCache(contractTypeCache, contractId, 'vault');
        return 'vault';
      }

      // Regular token
      setCache(contractTypeCache, contractId, 'token');
      return 'token';
    }

    // Check for DEX interface (swap, add_liquidity, get_reserves)
    const [swapResult, reservesResult, poolsResult] = await Promise.all([
      simulateContractRead(contractId, 'get_reserves'),
      simulateContractRead(contractId, 'get_pools'),
      simulateContractRead(contractId, 'estimate_swap'),
    ]);

    if (swapResult || reservesResult || poolsResult) {
      setCache(contractTypeCache, contractId, 'dex');
      return 'dex';
    }

    setCache(contractTypeCache, contractId, 'other');
    return 'other';
  } catch (error) {
    console.error('Error detecting contract type:', error);
    setCache(contractTypeCache, contractId, 'other', true);
    return 'other';
  }
}

/**
 * Check if contract is paused
 * Quick helper that caches the result
 */
export async function isContractPaused(contractId: string): Promise<boolean> {
  const accessControl = await getContractAccessControl(contractId);
  return accessControl.isPaused;
}

/**
 * Get contract admin/owner
 * Returns admin if available, falls back to owner
 */
export async function getContractAdmin(contractId: string): Promise<string | null> {
  const accessControl = await getContractAccessControl(contractId);
  return accessControl.admin || accessControl.owner || null;
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Get metadata for multiple contracts in parallel
 */
export async function getContractMetadataBatch(
  contractIds: string[]
): Promise<Map<string, ContractMetadataResult | null>> {
  const results = new Map<string, ContractMetadataResult | null>();
  const uniqueIds = Array.from(new Set(contractIds)).filter(isContractAddress);

  const BATCH_SIZE = 3; // Conservative batch size for RPC

  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (id) => ({
        id,
        metadata: await getContractMetadata(id),
      }))
    );

    for (const { id, metadata } of batchResults) {
      results.set(id, metadata);
    }
  }

  return results;
}

/**
 * Get access control for multiple contracts in parallel
 */
export async function getContractAccessControlBatch(
  contractIds: string[]
): Promise<Map<string, ContractAccessControlResult>> {
  const results = new Map<string, ContractAccessControlResult>();
  const uniqueIds = Array.from(new Set(contractIds)).filter(isContractAddress);

  const BATCH_SIZE = 3;

  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (id) => ({
        id,
        accessControl: await getContractAccessControl(id),
      }))
    );

    for (const { id, accessControl } of batchResults) {
      results.set(id, accessControl);
    }
  }

  return results;
}

// ============================================================================
// Contract Spec Extraction (SEP-0046 / XDR Spec)
// ============================================================================

export interface ContractSpecResult {
  functions: SpecFunction[];
  udts: SpecUDT[];
}

export interface SpecFunction {
  name: string;
  doc: string;
  inputs: SpecInput[];
  outputs: SpecType[];
}

export interface SpecInput {
  name: string;
  type: SpecType;
  doc: string;
}

export interface SpecType {
  type: string;
  subType?: string | SpecType; // For Vector, Map, Option, etc.
  refName?: string; // For UDT references
}

export interface SpecUDT {
  name: string;
  doc: string;
  type: 'struct' | 'union' | 'enum';
  fields: SpecField[];
}

export interface SpecField {
  name: string;
  doc: string;
  type?: SpecType; // Struct/Union fields have types
  cases?: SpecCase[]; // Enum/Union cases
}

export interface SpecCase {
  name: string;
  value?: number; // Enum value
  type?: SpecType; // Union case type
}

const specCache: Map<string, MetadataCacheEntry<ContractSpecResult>> = new Map();

/**
 * Get contract spec (functions, types) from WASM
 */
export async function getContractSpec(contractId: string): Promise<ContractSpecResult | null> {
  if (!contractId || !isContractAddress(contractId)) return null;

  const cached = getCached(specCache, contractId);
  if (cached !== undefined) return cached;

  try {
    // Get contract instance to find WASM hash
    const instanceData = await getContractInstanceData(contractId);
    if (!instanceData) {
      setCache(specCache, contractId, null, true);
      return null;
    }

    const instance = instanceData.val();
    if (instance.switch().name !== 'scvContractInstance') {
      setCache(specCache, contractId, null, true);
      return null;
    }

    const contractInstance = instance.instance();
    const executable = contractInstance.executable();

    if (executable.switch().name === 'contractExecutableWasm') {
      const wasmHash = executable.wasmHash();
      const codeEntry = await getContractCode(wasmHash);

      if (codeEntry) {
        const code = codeEntry.code();
        const spec = extractWasmSpec(code);

        // Sort functions by name
        if (spec) {
          spec.functions.sort((a, b) => a.name.localeCompare(b.name));
        }

        const result = spec && (spec.functions.length > 0 || spec.udts.length > 0) ? spec : null;
        setCache(specCache, contractId, result, !result);
        return result;
      }
    }

    setCache(specCache, contractId, null, true);
    return null;
  } catch (error) {
    console.error('Error fetching contract spec:', error);
    setCache(specCache, contractId, null, true);
    return null;
  }
}

// Extract and parse spec from WASM custom section
function extractWasmSpec(wasmCode: Buffer): ContractSpecResult | null {
  try {
    // WASM magic number check
    if (wasmCode.length < 8 || wasmCode[0] !== 0x00 || wasmCode[1] !== 0x61 ||
      wasmCode[2] !== 0x73 || wasmCode[3] !== 0x6d) {
      return null;
    }

    let offset = 8;
    const functions: SpecFunction[] = [];
    const udts: SpecUDT[] = [];

    while (offset < wasmCode.length) {
      const sectionId = wasmCode[offset++];

      // Read LEB128 section size
      let sectionSize = 0;
      let shift = 0;
      while (offset < wasmCode.length) {
        const byte = wasmCode[offset++];
        sectionSize |= (byte & 0x7f) << shift;
        if ((byte & 0x80) === 0) break;
        shift += 7;
      }

      if (sectionId === 0) { // Custom section
        const sectionStart = offset;
        const sectionEnd = offset + sectionSize;

        // Read section name
        let nameLen = 0;
        shift = 0;
        while (offset < sectionEnd) {
          const byte = wasmCode[offset++];
          nameLen |= (byte & 0x7f) << shift;
          if ((byte & 0x80) === 0) break;
          shift += 7;
        }

        if (offset + nameLen <= sectionEnd) {
          const name = wasmCode.slice(offset, offset + nameLen).toString('utf8');
          offset += nameLen;

          if (name === 'contractspecv0') {
            const data = wasmCode.slice(offset, sectionEnd);
            try {
              parseSpecData(data, functions, udts);
            } catch (parseError) {
              console.error('Error parsing contract spec data:', parseError);
              // Continue without spec data rather than crashing
            }
          }
        }
        offset = sectionEnd;
      } else {
        offset += sectionSize;
      }
    }

    return { functions, udts };

  } catch (error) {
    console.error('Error extracting WASM spec:', error);
    return null;
  }
}

// Minimal XDR Reader Helper
class XdrReader {
  buffer: Buffer;
  offset: number;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
    this.offset = 0;
  }

  readU32(): number {
    if (this.offset + 4 > this.buffer.length) throw new Error('EOF');
    const val = this.buffer.readUInt32BE(this.offset);
    this.offset += 4;
    return val;
  }

  readString(): string {
    const len = this.readU32();
    if (this.offset + len > this.buffer.length) throw new Error('EOF');
    const str = this.buffer.slice(this.offset, this.offset + len).toString('utf8');
    this.offset += len;
    // Padding
    const pad = (4 - (len % 4)) % 4;
    this.offset += pad;
    return str;
  }

  readBytes(): Buffer {
    const len = this.readU32();
    if (this.offset + len > this.buffer.length) throw new Error('EOF');
    const buf = this.buffer.slice(this.offset, this.offset + len);
    this.offset += len;
    const pad = (4 - (len % 4)) % 4;
    this.offset += pad;
    return buf;
  }

  ensureMore(): boolean {
    return this.offset < this.buffer.length;
  }
}

function parseSpecData(data: Buffer, functions: SpecFunction[], udts: SpecUDT[]) {
  const reader = new XdrReader(data);

  while (reader.ensureMore()) {
    try {
      const discriminant = reader.readU32();

      // ScSpecEntryKind
      /*
        FunctionV0 = 0,
        UdtStructV0 = 1,
        UdtUnionV0 = 2,
        UdtEnumV0 = 3,
        UdtErrorEnumV0 = 4
      */

      switch (discriminant) {
        case 0: { // FunctionV0
          const doc = reader.readString();
          const name = reader.readString(); // symbol

          // Inputs: vector<ScSpecFunctionInputV0>
          const inputCount = reader.readU32();
          const inputs: SpecInput[] = [];
          for (let i = 0; i < inputCount; i++) {
            const argDoc = reader.readString();
            const argName = reader.readString();
            const argType = readSpecTypeDef(reader);
            inputs.push({ name: argName, type: argType, doc: argDoc });
          }

          // Outputs: vector<ScSpecTypeDef>
          const outputCount = reader.readU32();
          const outputs: SpecType[] = [];
          for (let i = 0; i < outputCount; i++) {
            outputs.push(readSpecTypeDef(reader));
          }

          functions.push({ name, doc, inputs, outputs });
          break;
        }
        case 1: { // UdtStructV0
          const doc = reader.readString();
          const lib = reader.readString();
          const name = reader.readString();

          const fieldCount = reader.readU32();
          const fields: SpecField[] = [];
          for (let i = 0; i < fieldCount; i++) {
            const fDoc = reader.readString();
            const fName = reader.readString();
            const fType = readSpecTypeDef(reader);
            fields.push({ name: fName, doc: fDoc, type: fType });
          }
          udts.push({ name, doc, type: 'struct', fields });
          break;
        }
        case 2: { // UdtUnionV0
          const doc = reader.readString();
          const lib = reader.readString();
          const name = reader.readString();

          const caseCount = reader.readU32();
          const fields: SpecField[] = [];

          // We map Union cases to "fields" for simplicity in display
          // The UI will iterate fields and show cases
          const cases: SpecCase[] = [];

          for (let i = 0; i < caseCount; i++) {
            // XDR union: discriminant first, then the arm's struct fields
            const caseKind = reader.readU32(); // 0=Void, 1=Tuple
            const cDoc = reader.readString();
            const cName = reader.readString();

            let cType: SpecType | undefined;
            if (caseKind === 1) { // Tuple: variable-length array type<12>
              const tupleCount = reader.readU32();
              if (tupleCount === 1) {
                cType = readSpecTypeDef(reader);
              } else if (tupleCount > 1) {
                const types: string[] = [];
                for (let j = 0; j < tupleCount; j++) {
                  types.push(formatTypeString(readSpecTypeDef(reader)));
                }
                cType = { type: `(${types.join(', ')})` };
              }
            }

            fields.push({ name: cName, doc: cDoc, type: cType });
          }
          udts.push({ name, doc, type: 'union', fields });
          break;
        }
        case 3: { // UdtEnumV0
          const doc = reader.readString();
          const lib = reader.readString();
          const name = reader.readString();

          const caseCount = reader.readU32();
          const fields: SpecField[] = [];

          for (let i = 0; i < caseCount; i++) {
            const cDoc = reader.readString();
            const cName = reader.readString();
            const cValue = reader.readU32();
            // Store enum cases as fields for display logic, but mark as enum
            // We can abuse type to show value if we want, or add 'value' to SpecField
            // But SpecField interface might need update if we want to be clean.
            // For now, let's put value in documentation or handle separately?
            // Let's rely on standard display. 
            // Actually, I'll assume fields for UDTEnum are just the names. 
            fields.push({ name: `${cName} = ${cValue}`, doc: cDoc });
          }
          udts.push({ name, doc, type: 'enum', fields });
          break;
        }
        case 4: { // UdtErrorEnumV0
          const doc = reader.readString();
          const lib = reader.readString();
          const name = reader.readString();

          const caseCount = reader.readU32();
          const fields: SpecField[] = [];

          for (let i = 0; i < caseCount; i++) {
            const cDoc = reader.readString();
            const cName = reader.readString();
            const cValue = reader.readU32();
            fields.push({ name: `${cName} = ${cValue}`, doc: cDoc });
          }
          udts.push({ name, doc, type: 'enum', fields }); // Treat error enum as enum
          break;
        }
        default:
          // Unknown entry type, we can't safely proceed as we don't know the size
          return;
      }
    } catch (e) {
      console.error('Spec parsing error:', e);
      break;
    }
  }
}

function readSpecTypeDef(reader: XdrReader): SpecType {
  const typeDisc = reader.readU32();
  /*
  Val: 0
  Bool: 1
  Void: 2
  Error: 3
  U32: 4
  I32: 5
  U64: 6
  I64: 7
  ... (see known types)
  */

  switch (typeDisc) {
    case 0: return { type: 'Val' };
    case 1: return { type: 'bool' };
    case 2: return { type: 'void' };
    case 3: return { type: 'Error' };
    case 4: return { type: 'u32' };
    case 5: return { type: 'i32' };
    case 6: return { type: 'u64' };
    case 7: return { type: 'i64' };
    case 8: return { type: 'Timepoint' };
    case 9: return { type: 'Duration' };
    case 10: return { type: 'u128' };
    case 11: return { type: 'i128' };
    case 12: return { type: 'u256' };
    case 13: return { type: 'i256' };
    case 14: return { type: 'Bytes' };
    case 16: return { type: 'String' };
    case 17: return { type: 'Symbol' };
    case 19: return { type: 'Address' };

    case 1000: { // Option
      const valType = readSpecTypeDef(reader);
      return { type: 'Option', subType: valType };
    }
    case 1001: { // Result
      const okType = readSpecTypeDef(reader);
      const errType = readSpecTypeDef(reader);
      // We only support one subtype in our interface, so for Result we might combine string
      return { type: 'Result', subType: { type: `${formatTypeString(okType)}, ${formatTypeString(errType)}` } };
    }
    case 1002: { // Vec
      const elType = readSpecTypeDef(reader);
      return { type: 'Vec', subType: elType };
    }
    case 1004: { // Map
      const keyType = readSpecTypeDef(reader);
      const valType = readSpecTypeDef(reader);
      return { type: 'Map', subType: { type: `${formatTypeString(keyType)}, ${formatTypeString(valType)}` } };
    }
    case 1005: { // Tuple
      const count = reader.readU32();
      const types: string[] = [];
      for (let i = 0; i < count; i++) {
        types.push(formatTypeString(readSpecTypeDef(reader)));
      }
      return { type: `(${types.join(', ')})` };
    }
    case 1006: { // BytesN
      const n = reader.readU32();
      return { type: `BytesN<${n}>` };
    }
    case 2000: { // Udt
      const name = reader.readString();
      return { type: name, refName: name };
    }
    default:
      return { type: 'Unknown' };
  }
}

function formatTypeString(t: SpecType): string {
  if (t.subType) {
    if (typeof t.subType === 'string') return `${t.type}<${t.subType}>`;
    return `${t.type}<${formatTypeString(t.subType)}>`;
  }
  return t.type;
}
