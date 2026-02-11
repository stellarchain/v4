// Contract Storage Service for Soroban Smart Contracts
// Allows exploration of contract key-value storage
// https://developers.stellar.org/docs/data/rpc

import { rpc, xdr, Address, scValToNative } from '@stellar/stellar-sdk';
import { getSorobanServer, isContractAddress } from './soroban';

// ============================================================================
// Types
// ============================================================================

export interface StorageEntry {
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

export interface ContractStorageResult {
  contractId: string;
  entries: StorageEntry[];
  instanceData?: Record<string, unknown>;
  totalEntries: number;
  fetchedAt: number;
}

export interface StorageKeyInfo {
  type: string;
  symbol?: string;
  address?: string;
  raw: string;
}

export interface ParsedValue {
  display: string;
  type: string;
  raw: string;
}

// ============================================================================
// Cache Configuration
// ============================================================================

const STORAGE_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes - storage can change frequently
const FAILED_CACHE_TTL_MS = 30 * 1000; // 30 seconds for failed lookups

interface StorageCacheEntry<T> {
  data: T | null;
  expiry: number;
  failed: boolean;
}

const storageCache: Map<string, StorageCacheEntry<ContractStorageResult>> = new Map();
const entryCache: Map<string, StorageCacheEntry<StorageEntry>> = new Map();
const instanceCache: Map<string, StorageCacheEntry<Record<string, unknown>>> = new Map();

function getStorageCacheKey(contractId: string, includeCommonKeyScan: boolean): string {
  return `${contractId}:${includeCommonKeyScan ? 'full' : 'instance'}`;
}

// ============================================================================
// Cache Helpers
// ============================================================================

function getCached<T>(cache: Map<string, StorageCacheEntry<T>>, key: string): T | null | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined; // Not in cache

  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return undefined; // Expired
  }

  return entry.data; // Could be null for failed lookups
}

function setCache<T>(
  cache: Map<string, StorageCacheEntry<T>>,
  key: string,
  data: T | null,
  failed: boolean = false
): void {
  const ttl = failed ? FAILED_CACHE_TTL_MS : STORAGE_CACHE_TTL_MS;
  cache.set(key, {
    data,
    expiry: Date.now() + ttl,
    failed,
  });
}

// Clear all storage caches
export function clearStorageCaches(): void {
  storageCache.clear();
  entryCache.clear();
  instanceCache.clear();
}

// Invalidate cache for a specific contract
export function invalidateStorageCache(contractId: string): void {
  for (const key of storageCache.keys()) {
    if (key.startsWith(`${contractId}:`)) {
      storageCache.delete(key);
    }
  }
  instanceCache.delete(contractId);
  // Clear all entry caches for this contract
  for (const key of entryCache.keys()) {
    if (key.startsWith(`${contractId}:`)) {
      entryCache.delete(key);
    }
  }
}

// ============================================================================
// Key Parsing
// ============================================================================

/**
 * Parse and format a storage key from ScVal
 */
export function parseStorageKey(key: xdr.ScVal): StorageKeyInfo {
  try {
    const keyType = key.switch().name;
    const rawValue = key.toXDR('base64');

    switch (keyType) {
      case 'scvSymbol': {
        const symbol = key.sym().toString();
        return {
          type: 'Symbol',
          symbol,
          raw: rawValue,
        };
      }

      case 'scvAddress': {
        const addr = Address.fromScVal(key);
        return {
          type: 'Address',
          address: addr.toString(),
          raw: rawValue,
        };
      }

      case 'scvVec': {
        const vec = key.vec();
        if (vec && vec.length > 0) {
          const elements = vec.map((v) => {
            try {
              return scValToNative(v);
            } catch {
              return v.switch().name;
            }
          });
          return {
            type: 'Vec',
            symbol: JSON.stringify(elements),
            raw: rawValue,
          };
        }
        return { type: 'Vec', symbol: '[]', raw: rawValue };
      }

      case 'scvMap': {
        const map = key.map();
        if (map && map.length > 0) {
          const entries: Record<string, unknown> = {};
          for (const entry of map) {
            try {
              const k = scValToNative(entry.key());
              const v = scValToNative(entry.val());
              entries[String(k)] = v;
            } catch {
              // Skip unparseable entries
            }
          }
          return {
            type: 'Map',
            symbol: JSON.stringify(entries),
            raw: rawValue,
          };
        }
        return { type: 'Map', symbol: '{}', raw: rawValue };
      }

      case 'scvLedgerKeyContractInstance':
        return {
          type: 'LedgerKeyContractInstance',
          symbol: 'Instance',
          raw: rawValue,
        };

      case 'scvLedgerKeyNonce':
        return {
          type: 'LedgerKeyNonce',
          symbol: 'Nonce',
          raw: rawValue,
        };

      case 'scvU32':
        return {
          type: 'U32',
          symbol: key.u32().toString(),
          raw: rawValue,
        };

      case 'scvI32':
        return {
          type: 'I32',
          symbol: key.i32().toString(),
          raw: rawValue,
        };

      case 'scvU64':
        return {
          type: 'U64',
          symbol: key.u64().toString(),
          raw: rawValue,
        };

      case 'scvI64':
        return {
          type: 'I64',
          symbol: key.i64().toString(),
          raw: rawValue,
        };

      case 'scvU128': {
        const u128 = key.u128();
        const high = BigInt(u128.hi().toString());
        const low = BigInt(u128.lo().toString());
        const value = (high << BigInt(64)) + low;
        return {
          type: 'U128',
          symbol: value.toString(),
          raw: rawValue,
        };
      }

      case 'scvI128': {
        const i128 = key.i128();
        const high = BigInt(i128.hi().toString());
        const low = BigInt(i128.lo().toString());
        const value = (high << BigInt(64)) + low;
        return {
          type: 'I128',
          symbol: value.toString(),
          raw: rawValue,
        };
      }

      case 'scvBytes': {
        const bytes = key.bytes();
        return {
          type: 'Bytes',
          symbol: bytes.toString('hex'),
          raw: rawValue,
        };
      }

      case 'scvString': {
        return {
          type: 'String',
          symbol: key.str().toString(),
          raw: rawValue,
        };
      }

      case 'scvBool':
        return {
          type: 'Bool',
          symbol: key.b() ? 'true' : 'false',
          raw: rawValue,
        };

      default: {
        // Attempt generic conversion
        try {
          const native = scValToNative(key);
          return {
            type: keyType.replace('scv', ''),
            symbol: JSON.stringify(native),
            raw: rawValue,
          };
        } catch {
          return {
            type: keyType.replace('scv', ''),
            raw: rawValue,
          };
        }
      }
    }
  } catch (error) {
    return {
      type: 'Unknown',
      raw: key.toXDR('base64'),
    };
  }
}

/**
 * Format a StorageKeyInfo for display
 */
export function formatStorageKey(keyInfo: StorageKeyInfo): string {
  switch (keyInfo.type) {
    case 'Symbol':
      return `${keyInfo.symbol} (Symbol)`;

    case 'Address': {
      const addr = keyInfo.address || '';
      const shortened = addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
      return `${shortened} (Address)`;
    }

    case 'Vec':
      return `${keyInfo.symbol} (Vec)`;

    case 'Map':
      return `${keyInfo.symbol} (Map)`;

    case 'LedgerKeyContractInstance':
      return 'Instance Storage';

    case 'LedgerKeyNonce':
      return `Nonce (${keyInfo.symbol})`;

    case 'U32':
    case 'I32':
    case 'U64':
    case 'I64':
    case 'U128':
    case 'I128':
      return `${keyInfo.symbol} (${keyInfo.type})`;

    case 'Bytes':
      return `0x${keyInfo.symbol?.slice(0, 16)}${(keyInfo.symbol?.length || 0) > 16 ? '...' : ''} (Bytes)`;

    case 'String':
      return `"${keyInfo.symbol}" (String)`;

    case 'Bool':
      return `${keyInfo.symbol} (Bool)`;

    default:
      return keyInfo.symbol || keyInfo.raw.slice(0, 20) + '...';
  }
}

// ============================================================================
// Value Parsing
// ============================================================================

/**
 * Parse and format a storage value from ScVal
 */
export function parseStorageValue(value: xdr.ScVal): ParsedValue {
  try {
    const valueType = value.switch().name;
    const rawValue = value.toXDR('base64');

    switch (valueType) {
      case 'scvBool':
        return {
          display: value.b() ? 'true' : 'false',
          type: 'Bool',
          raw: rawValue,
        };

      case 'scvU32':
        return {
          display: value.u32().toString(),
          type: 'U32',
          raw: rawValue,
        };

      case 'scvI32':
        return {
          display: value.i32().toString(),
          type: 'I32',
          raw: rawValue,
        };

      case 'scvU64':
        return {
          display: value.u64().toString(),
          type: 'U64',
          raw: rawValue,
        };

      case 'scvI64':
        return {
          display: value.i64().toString(),
          type: 'I64',
          raw: rawValue,
        };

      case 'scvU128': {
        const u128 = value.u128();
        const high = BigInt(u128.hi().toString());
        const low = BigInt(u128.lo().toString());
        const val = (high << BigInt(64)) + low;
        return {
          display: val.toString(),
          type: 'U128',
          raw: rawValue,
        };
      }

      case 'scvI128': {
        const i128 = value.i128();
        const high = BigInt(i128.hi().toString());
        const low = BigInt(i128.lo().toString());
        const val = (high << BigInt(64)) + low;
        return {
          display: val.toString(),
          type: 'I128',
          raw: rawValue,
        };
      }

      case 'scvU256': {
        const u256 = value.u256();
        const hiHi = BigInt(u256.hiHi().toString());
        const hiLo = BigInt(u256.hiLo().toString());
        const loHi = BigInt(u256.loHi().toString());
        const loLo = BigInt(u256.loLo().toString());
        const val = (hiHi << BigInt(192)) + (hiLo << BigInt(128)) + (loHi << BigInt(64)) + loLo;
        return {
          display: val.toString(),
          type: 'U256',
          raw: rawValue,
        };
      }

      case 'scvI256': {
        const i256 = value.i256();
        const hiHi = BigInt(i256.hiHi().toString());
        const hiLo = BigInt(i256.hiLo().toString());
        const loHi = BigInt(i256.loHi().toString());
        const loLo = BigInt(i256.loLo().toString());
        const val = (hiHi << BigInt(192)) + (hiLo << BigInt(128)) + (loHi << BigInt(64)) + loLo;
        return {
          display: val.toString(),
          type: 'I256',
          raw: rawValue,
        };
      }

      case 'scvSymbol':
        return {
          display: value.sym().toString(),
          type: 'Symbol',
          raw: rawValue,
        };

      case 'scvString':
        return {
          display: value.str().toString(),
          type: 'String',
          raw: rawValue,
        };

      case 'scvBytes': {
        const bytes = value.bytes();
        const hex = bytes.toString('hex');
        return {
          display: hex.length > 64 ? `0x${hex.slice(0, 64)}...` : `0x${hex}`,
          type: 'Bytes',
          raw: rawValue,
        };
      }

      case 'scvAddress': {
        const addr = Address.fromScVal(value);
        const addrStr = addr.toString();
        const shortened = addrStr.length > 12 ? `${addrStr.slice(0, 6)}...${addrStr.slice(-4)}` : addrStr;
        return {
          display: shortened,
          type: 'Address',
          raw: rawValue,
        };
      }

      case 'scvVec': {
        const vec = value.vec();
        if (vec && vec.length > 0) {
          const elements = vec.map((v) => {
            try {
              return scValToNative(v);
            } catch {
              return parseStorageValue(v).display;
            }
          });
          const display = JSON.stringify(elements);
          return {
            display: display.length > 100 ? display.slice(0, 100) + '...' : display,
            type: 'Vec',
            raw: rawValue,
          };
        }
        return { display: '[]', type: 'Vec', raw: rawValue };
      }

      case 'scvMap': {
        const map = value.map();
        if (map && map.length > 0) {
          const entries: Record<string, unknown> = {};
          for (const entry of map) {
            try {
              const k = scValToNative(entry.key());
              const v = scValToNative(entry.val());
              entries[String(k)] = v;
            } catch {
              // Try parsing individually
              const parsedKey = parseStorageKey(entry.key());
              const parsedVal = parseStorageValue(entry.val());
              entries[parsedKey.symbol || parsedKey.type] = parsedVal.display;
            }
          }
          const display = JSON.stringify(entries);
          return {
            display: display.length > 100 ? display.slice(0, 100) + '...' : display,
            type: 'Map',
            raw: rawValue,
          };
        }
        return { display: '{}', type: 'Map', raw: rawValue };
      }

      case 'scvContractInstance': {
        const instance = value.instance();
        const executable = instance.executable();
        const execType = executable.switch().name;
        let display = `Contract Instance (${execType.replace('contractExecutable', '')})`;

        const storage = instance.storage();
        if (storage && storage.length > 0) {
          display += ` [${storage.length} entries]`;
        }

        return {
          display,
          type: 'ContractInstance',
          raw: rawValue,
        };
      }

      case 'scvVoid':
        return {
          display: 'void',
          type: 'Void',
          raw: rawValue,
        };

      case 'scvTimepoint':
        return {
          display: value.timepoint().toString(),
          type: 'Timepoint',
          raw: rawValue,
        };

      case 'scvDuration':
        return {
          display: value.duration().toString(),
          type: 'Duration',
          raw: rawValue,
        };

      default: {
        // Attempt generic conversion
        try {
          const native = scValToNative(value);
          const display = JSON.stringify(native);
          return {
            display: display.length > 100 ? display.slice(0, 100) + '...' : display,
            type: valueType.replace('scv', ''),
            raw: rawValue,
          };
        } catch {
          return {
            display: `<${valueType.replace('scv', '')}>`,
            type: valueType.replace('scv', ''),
            raw: rawValue,
          };
        }
      }
    }
  } catch (error) {
    return {
      display: '<parse error>',
      type: 'Unknown',
      raw: value.toXDR('base64'),
    };
  }
}

// ============================================================================
// Storage Retrieval
// ============================================================================

/**
 * Get all storage entries for a contract
 */
export async function getContractStorage(contractId: string): Promise<ContractStorageResult | null> {
  return getContractStorageWithOptions(contractId, { includeCommonKeyScan: false });
}

/**
 * Get contract storage entries with optional deep key probing.
 * `includeCommonKeyScan=false` keeps requests minimal and is the recommended default.
 */
export async function getContractStorageWithOptions(
  contractId: string,
  options?: { includeCommonKeyScan?: boolean }
): Promise<ContractStorageResult | null> {
  if (!contractId || !isContractAddress(contractId)) {
    return null;
  }

  const includeCommonKeyScan = options?.includeCommonKeyScan ?? false;
  const storageCacheKey = getStorageCacheKey(contractId, includeCommonKeyScan);

  // Check cache
  const cached = getCached(storageCache, storageCacheKey);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const server = getSorobanServer();
    const contractAddress = new Address(contractId);
    const entries: StorageEntry[] = [];

    // Fetch all durability types
    const durabilities: Array<{ type: 'temporary' | 'persistent' | 'instance'; xdrType: xdr.ContractDataDurability }> = [
      { type: 'persistent', xdrType: xdr.ContractDataDurability.persistent() },
      { type: 'temporary', xdrType: xdr.ContractDataDurability.temporary() },
    ];

    // First, get the instance entry which contains instance storage
    const instanceKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: contractAddress.toScAddress(),
        key: xdr.ScVal.scvLedgerKeyContractInstance(),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );

    const instanceResponse = await server.getLedgerEntries(instanceKey);
    let instanceData: Record<string, unknown> | undefined;

    if (instanceResponse.entries && instanceResponse.entries.length > 0) {
      const entry = instanceResponse.entries[0];
      const contractData = entry.val.contractData();
      const val = contractData.val();

      // Parse instance storage
      if (val.switch().name === 'scvContractInstance') {
        const instance = val.instance();
        const storage = instance.storage();

        if (storage && storage.length > 0) {
          instanceData = {};

          for (const storageEntry of storage) {
            const keyInfo = parseStorageKey(storageEntry.key());
            const valueInfo = parseStorageValue(storageEntry.val());

            // Add to instanceData
            const keyName = keyInfo.symbol || keyInfo.type;
            try {
              instanceData[keyName] = scValToNative(storageEntry.val());
            } catch {
              instanceData[keyName] = valueInfo.display;
            }

            // Add to entries array
            entries.push({
              key: keyInfo.raw,
              keyDisplay: formatStorageKey(keyInfo),
              keyType: keyInfo.type,
              value: valueInfo.raw,
              valueDisplay: valueInfo.display,
              valueType: valueInfo.type,
              durability: 'instance',
              ttl: entry.liveUntilLedgerSeq,
              expirationLedger: entry.liveUntilLedgerSeq,
            });
          }
        }
      }
    }

    // Optional deep scan: probes a dictionary of common keys.
    // This can generate many RPC calls, so it is disabled by default.
    if (includeCommonKeyScan) {
      // For each durability type, we need to discover keys
      // Since we can't enumerate all keys directly, we look for common patterns
      // This is a limitation of the Soroban RPC - we can only fetch known keys

      // Common key patterns to check
      const commonKeys: Array<{ scVal: xdr.ScVal; name: string }> = [
        { scVal: xdr.ScVal.scvSymbol('Admin'), name: 'Admin' },
        { scVal: xdr.ScVal.scvSymbol('admin'), name: 'admin' },
        { scVal: xdr.ScVal.scvSymbol('Owner'), name: 'Owner' },
        { scVal: xdr.ScVal.scvSymbol('owner'), name: 'owner' },
        { scVal: xdr.ScVal.scvSymbol('Balance'), name: 'Balance' },
        { scVal: xdr.ScVal.scvSymbol('balance'), name: 'balance' },
        { scVal: xdr.ScVal.scvSymbol('Allowance'), name: 'Allowance' },
        { scVal: xdr.ScVal.scvSymbol('allowance'), name: 'allowance' },
        { scVal: xdr.ScVal.scvSymbol('TotalSupply'), name: 'TotalSupply' },
        { scVal: xdr.ScVal.scvSymbol('total_supply'), name: 'total_supply' },
        { scVal: xdr.ScVal.scvSymbol('Name'), name: 'Name' },
        { scVal: xdr.ScVal.scvSymbol('name'), name: 'name' },
        { scVal: xdr.ScVal.scvSymbol('Symbol'), name: 'Symbol' },
        { scVal: xdr.ScVal.scvSymbol('symbol'), name: 'symbol' },
        { scVal: xdr.ScVal.scvSymbol('Decimals'), name: 'Decimals' },
        { scVal: xdr.ScVal.scvSymbol('decimals'), name: 'decimals' },
        { scVal: xdr.ScVal.scvSymbol('Paused'), name: 'Paused' },
        { scVal: xdr.ScVal.scvSymbol('paused'), name: 'paused' },
        { scVal: xdr.ScVal.scvSymbol('Config'), name: 'Config' },
        { scVal: xdr.ScVal.scvSymbol('config'), name: 'config' },
        { scVal: xdr.ScVal.scvSymbol('State'), name: 'State' },
        { scVal: xdr.ScVal.scvSymbol('state'), name: 'state' },
        { scVal: xdr.ScVal.scvSymbol('Metadata'), name: 'Metadata' },
        { scVal: xdr.ScVal.scvSymbol('metadata'), name: 'metadata' },
        { scVal: xdr.ScVal.scvSymbol('Counter'), name: 'Counter' },
        { scVal: xdr.ScVal.scvSymbol('counter'), name: 'counter' },
        { scVal: xdr.ScVal.scvSymbol('Nonce'), name: 'Nonce' },
        { scVal: xdr.ScVal.scvSymbol('nonce'), name: 'nonce' },
      ];

      // Query each common key for each durability type
      for (const { type: durabilityType, xdrType: durabilityXdr } of durabilities) {
        for (const { scVal: keyScVal } of commonKeys) {
          try {
            const ledgerKey = xdr.LedgerKey.contractData(
              new xdr.LedgerKeyContractData({
                contract: contractAddress.toScAddress(),
                key: keyScVal,
                durability: durabilityXdr,
              })
            );

            const response = await server.getLedgerEntries(ledgerKey);

            if (response.entries && response.entries.length > 0) {
              const ledgerEntry = response.entries[0];
              const contractData = ledgerEntry.val.contractData();
              const key = contractData.key();
              const val = contractData.val();

              const keyInfo = parseStorageKey(key);
              const valueInfo = parseStorageValue(val);

              // Check if we already have this entry (from instance storage)
              const exists = entries.some(
                (e) => e.key === keyInfo.raw && e.durability === durabilityType
              );

              if (!exists) {
                entries.push({
                  key: keyInfo.raw,
                  keyDisplay: formatStorageKey(keyInfo),
                  keyType: keyInfo.type,
                  value: valueInfo.raw,
                  valueDisplay: valueInfo.display,
                  valueType: valueInfo.type,
                  durability: durabilityType,
                  ttl: ledgerEntry.liveUntilLedgerSeq,
                  expirationLedger: ledgerEntry.liveUntilLedgerSeq,
                });
              }
            }
          } catch {
            // Key doesn't exist, continue
          }
        }
      }
    }

    // Sort entries: instance first, then persistent, then temporary, then by key
    const durabilityOrder: Record<string, number> = { instance: 0, persistent: 1, temporary: 2 };
    entries.sort((a, b) => {
      const durabilityDiff = durabilityOrder[a.durability] - durabilityOrder[b.durability];
      if (durabilityDiff !== 0) return durabilityDiff;
      return a.keyDisplay.localeCompare(b.keyDisplay);
    });

    const result: ContractStorageResult = {
      contractId,
      entries,
      instanceData,
      totalEntries: entries.length,
      fetchedAt: Date.now(),
    };

    setCache(storageCache, storageCacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching contract storage:', error);
    setCache(storageCache, storageCacheKey, null, true);
    return null;
  }
}

/**
 * Get a specific storage entry by key
 */
export async function getStorageEntry(
  contractId: string,
  key: string,
  durability: 'temporary' | 'persistent' | 'instance' = 'persistent'
): Promise<StorageEntry | null> {
  if (!contractId || !isContractAddress(contractId)) {
    return null;
  }

  const cacheKey = `${contractId}:${durability}:${key}`;

  // Check cache
  const cached = getCached(entryCache, cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const server = getSorobanServer();
    const contractAddress = new Address(contractId);

    // Try to decode the key from base64
    let keyScVal: xdr.ScVal;
    try {
      keyScVal = xdr.ScVal.fromXDR(key, 'base64');
    } catch {
      // Assume it's a symbol string
      keyScVal = xdr.ScVal.scvSymbol(key);
    }

    const durabilityXdr =
      durability === 'temporary'
        ? xdr.ContractDataDurability.temporary()
        : xdr.ContractDataDurability.persistent();

    const ledgerKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: contractAddress.toScAddress(),
        key: keyScVal,
        durability: durabilityXdr,
      })
    );

    const response = await server.getLedgerEntries(ledgerKey);

    if (response.entries && response.entries.length > 0) {
      const entry = response.entries[0];
      const contractData = entry.val.contractData();
      const entryKey = contractData.key();
      const entryVal = contractData.val();

      const keyInfo = parseStorageKey(entryKey);
      const valueInfo = parseStorageValue(entryVal);

      const result: StorageEntry = {
        key: keyInfo.raw,
        keyDisplay: formatStorageKey(keyInfo),
        keyType: keyInfo.type,
        value: valueInfo.raw,
        valueDisplay: valueInfo.display,
        valueType: valueInfo.type,
        durability,
        ttl: entry.liveUntilLedgerSeq,
        expirationLedger: entry.liveUntilLedgerSeq,
      };

      setCache(entryCache, cacheKey, result);
      return result;
    }

    setCache(entryCache, cacheKey, null, true);
    return null;
  } catch (error) {
    console.error('Error fetching storage entry:', error);
    setCache(entryCache, cacheKey, null, true);
    return null;
  }
}

/**
 * Get instance storage data as a structured object
 */
export async function getInstanceStorage(contractId: string): Promise<Record<string, unknown> | null> {
  if (!contractId || !isContractAddress(contractId)) {
    return null;
  }

  // Check cache
  const cached = getCached(instanceCache, contractId);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const server = getSorobanServer();
    const contractAddress = new Address(contractId);

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
      const contractData = entry.val.contractData();
      const val = contractData.val();

      if (val.switch().name === 'scvContractInstance') {
        const instance = val.instance();
        const storage = instance.storage();

        if (storage && storage.length > 0) {
          const result: Record<string, unknown> = {};

          for (const storageEntry of storage) {
            try {
              const keyNative = scValToNative(storageEntry.key());
              const valNative = scValToNative(storageEntry.val());
              result[String(keyNative)] = valNative;
            } catch {
              // Fallback to display format
              const keyInfo = parseStorageKey(storageEntry.key());
              const valueInfo = parseStorageValue(storageEntry.val());
              result[keyInfo.symbol || keyInfo.type] = valueInfo.display;
            }
          }

          setCache(instanceCache, contractId, result);
          return result;
        }
      }
    }

    setCache(instanceCache, contractId, null, true);
    return null;
  } catch (error) {
    console.error('Error fetching instance storage:', error);
    setCache(instanceCache, contractId, null, true);
    return null;
  }
}

/**
 * Get the expiration ledger for a storage entry
 */
export async function getStorageExpirationLedger(
  contractId: string,
  key: string,
  durability: 'temporary' | 'persistent' = 'persistent'
): Promise<number | null> {
  if (!contractId || !isContractAddress(contractId)) {
    return null;
  }

  try {
    const server = getSorobanServer();
    const contractAddress = new Address(contractId);

    // Try to decode the key from base64
    let keyScVal: xdr.ScVal;
    try {
      keyScVal = xdr.ScVal.fromXDR(key, 'base64');
    } catch {
      // Assume it's a symbol string
      keyScVal = xdr.ScVal.scvSymbol(key);
    }

    const durabilityXdr =
      durability === 'temporary'
        ? xdr.ContractDataDurability.temporary()
        : xdr.ContractDataDurability.persistent();

    const ledgerKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: contractAddress.toScAddress(),
        key: keyScVal,
        durability: durabilityXdr,
      })
    );

    const response = await server.getLedgerEntries(ledgerKey);

    if (response.entries && response.entries.length > 0) {
      return response.entries[0].liveUntilLedgerSeq ?? null;
    }

    return null;
  } catch (error) {
    console.error('Error fetching storage expiration:', error);
    return null;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert TTL ledger to approximate time remaining
 */
export function ledgerToTimeRemaining(expirationLedger: number, currentLedger: number): string {
  const ledgersRemaining = expirationLedger - currentLedger;
  if (ledgersRemaining <= 0) {
    return 'Expired';
  }

  // Average ledger time is ~5 seconds
  const secondsRemaining = ledgersRemaining * 5;

  if (secondsRemaining < 60) {
    return `${secondsRemaining}s`;
  } else if (secondsRemaining < 3600) {
    const minutes = Math.floor(secondsRemaining / 60);
    return `${minutes}m`;
  } else if (secondsRemaining < 86400) {
    const hours = Math.floor(secondsRemaining / 3600);
    return `${hours}h`;
  } else {
    const days = Math.floor(secondsRemaining / 86400);
    return `${days}d`;
  }
}

/**
 * Get current ledger sequence from RPC
 */
export async function getCurrentLedger(): Promise<number | null> {
  try {
    const server = getSorobanServer();
    const response = await server.getLatestLedger();
    return response.sequence;
  } catch (error) {
    console.error('Error getting current ledger:', error);
    return null;
  }
}

/**
 * Format a storage entry for JSON export
 */
export function storageEntryToJson(entry: StorageEntry): Record<string, unknown> {
  return {
    key: entry.keyDisplay,
    keyType: entry.keyType,
    value: entry.valueDisplay,
    valueType: entry.valueType,
    durability: entry.durability,
    expirationLedger: entry.expirationLedger,
    rawKey: entry.key,
    rawValue: entry.value,
  };
}

/**
 * Export all storage entries as JSON
 */
export function exportStorageAsJson(result: ContractStorageResult): string {
  return JSON.stringify(
    {
      contractId: result.contractId,
      totalEntries: result.totalEntries,
      fetchedAt: new Date(result.fetchedAt).toISOString(),
      instanceData: result.instanceData,
      entries: result.entries.map(storageEntryToJson),
    },
    null,
    2
  );
}
