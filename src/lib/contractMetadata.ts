// Contract Metadata Service (SEP-0046)
// Extracts metadata from Soroban contracts
// https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0046.md

import { rpc, xdr, Address, Contract, scValToNative, nativeToScVal, Account, TransactionBuilder, BASE_FEE, Networks } from '@stellar/stellar-sdk';
import { getSorobanServer, getNetwork, isContractAddress } from './soroban';

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

function getNetworkPassphrase(): string {
  return getNetwork() === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
}

// Simulate a contract call to read state (reused pattern from soroban.ts)
async function simulateContractRead(
  contractId: string,
  method: string,
  args: xdr.ScVal[] = []
): Promise<xdr.ScVal | null> {
  try {
    const server = getSorobanServer();
    const contract = new Contract(contractId);

    const operation = contract.call(method, ...args);

    // Dummy source account for simulation
    const sourceAccount = new Account(
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      '0'
    );

    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const response = await server.simulateTransaction(transaction);

    if (rpc.Api.isSimulationSuccess(response)) {
      const result = response.result;
      if (result?.retval) {
        return result.retval;
      }
    }

    return null;
  } catch (error) {
    // Silently fail for non-existent methods
    return null;
  }
}

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
