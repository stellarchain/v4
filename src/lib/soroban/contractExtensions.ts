// Contract Extensions Service
// Supports NFT (SEP-0050), Vault (ERC-4626), and RWA contracts

import {
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
} from '@stellar/stellar-sdk';
import { simulateContractRead } from './client';

// ============================================================================
// Types & Interfaces
// ============================================================================

// NFT Interfaces (SEP-0050)
export interface NFTInfo {
  contractId: string;
  name: string;
  symbol: string;
  totalSupply?: number;
}

export interface NFTTokenInfo {
  tokenId: string;
  owner: string;
  tokenUri?: string;
  imageUri?: string;
  metadata?: Record<string, unknown>;
  approved?: string;
}

// Vault Interfaces (ERC-4626)
export interface VaultInfo {
  contractId: string;
  name: string;
  symbol: string;
  underlyingAsset: string;
  totalAssets: string;
  totalShares: string;
  decimalsOffset: number;
}

export interface VaultConversionRate {
  sharesToAssets: string;
  assetsToShares: string;
}

// RWA Interfaces
export interface RWAComplianceStatus {
  isCompliant: boolean;
  isFrozen: boolean;
  frozenAmount?: string;
}

// Cache entry interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// ============================================================================
// Cache Configuration
// ============================================================================

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Separate caches for different data types
const nftInfoCache = new Map<string, CacheEntry<NFTInfo>>();
const nftTokenInfoCache = new Map<string, CacheEntry<NFTTokenInfo>>();
const vaultInfoCache = new Map<string, CacheEntry<VaultInfo>>();
const rwaComplianceCache = new Map<string, CacheEntry<RWAComplianceStatus>>();
const contractTypeCache = new Map<string, CacheEntry<'nft' | 'vault' | 'rwa' | 'unknown'>>();

// Cache helper functions
function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ============================================================================
// Internal Helpers
// ============================================================================

// Helper to convert token ID to ScVal (handles both numeric and string IDs)
function tokenIdToScVal(tokenId: string): xdr.ScVal {
  // Try parsing as number first (common for NFTs)
  const numericId = parseInt(tokenId, 10);
  if (!isNaN(numericId) && numericId.toString() === tokenId) {
    return nativeToScVal(numericId, { type: 'u128' });
  }
  // Fall back to string/bytes representation
  return nativeToScVal(tokenId, { type: 'string' });
}

// Helper to extract image URI from metadata or token URI
function extractImageUri(tokenUri?: string, metadata?: Record<string, unknown>): string | undefined {
  // Check metadata first
  if (metadata) {
    if (typeof metadata.image === 'string') return metadata.image;
    if (typeof metadata.image_url === 'string') return metadata.image_url;
    if (typeof metadata.imageUrl === 'string') return metadata.imageUrl;
  }

  // If tokenUri is an IPFS hash, construct gateway URL
  if (tokenUri?.startsWith('ipfs://')) {
    return tokenUri.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }

  return undefined;
}

// ============================================================================
// NFT Functions (SEP-0050)
// ============================================================================

/**
 * Get NFT collection information
 */
export async function getNFTInfo(contractId: string): Promise<NFTInfo | null> {
  // Check cache first
  const cached = getCached(nftInfoCache, contractId);
  if (cached) return cached;

  try {
    // Query name and symbol in parallel
    const [nameResult, symbolResult] = await Promise.all([
      simulateContractRead(contractId, 'name'),
      simulateContractRead(contractId, 'symbol'),
    ]);

    if (!nameResult || !symbolResult) {
      return null;
    }

    const name = scValToNative(nameResult) as string;
    const symbol = scValToNative(symbolResult) as string;

    // Try to get total supply (optional)
    let totalSupply: number | undefined;
    try {
      const supplyResult = await simulateContractRead(contractId, 'total_supply');
      if (supplyResult) {
        totalSupply = Number(scValToNative(supplyResult));
      }
    } catch {
      // total_supply is optional for NFT contracts
    }

    const info: NFTInfo = {
      contractId,
      name,
      symbol,
      totalSupply,
    };

    setCache(nftInfoCache, contractId, info);
    return info;
  } catch (error) {
    console.error('Error getting NFT info:', error);
    return null;
  }
}

/**
 * Get information about a specific NFT token
 */
export async function getNFTTokenInfo(
  contractId: string,
  tokenId: string
): Promise<NFTTokenInfo | null> {
  const cacheKey = `${contractId}:${tokenId}`;
  const cached = getCached(nftTokenInfoCache, cacheKey);
  if (cached) return cached;

  try {
    const tokenIdScVal = tokenIdToScVal(tokenId);

    // Query owner and token_uri in parallel
    const [ownerResult, tokenUriResult] = await Promise.all([
      simulateContractRead(contractId, 'owner_of', [tokenIdScVal]),
      simulateContractRead(contractId, 'token_uri', [tokenIdScVal]),
    ]);

    if (!ownerResult) {
      return null; // Token doesn't exist or error
    }

    const owner = scValToNative(ownerResult) as string;
    const tokenUri = tokenUriResult ? (scValToNative(tokenUriResult) as string) : undefined;

    // Try to get approved address (optional)
    let approved: string | undefined;
    try {
      const approvedResult = await simulateContractRead(contractId, 'get_approved', [tokenIdScVal]);
      if (approvedResult) {
        approved = scValToNative(approvedResult) as string;
      }
    } catch {
      // get_approved is optional
    }

    // Try to fetch and parse metadata from tokenUri
    let metadata: Record<string, unknown> | undefined;
    if (tokenUri) {
      try {
        // Only attempt to fetch if it's an HTTP(S) URL
        if (tokenUri.startsWith('http://') || tokenUri.startsWith('https://')) {
          const response = await fetch(tokenUri, {
            signal: AbortSignal.timeout(5000)
          });
          if (response.ok) {
            metadata = await response.json();
          }
        }
      } catch {
        // Metadata fetch is best-effort
      }
    }

    const imageUri = extractImageUri(tokenUri, metadata);

    const info: NFTTokenInfo = {
      tokenId,
      owner,
      tokenUri,
      imageUri,
      metadata,
      approved,
    };

    setCache(nftTokenInfoCache, cacheKey, info);
    return info;
  } catch (error) {
    console.error('Error getting NFT token info:', error);
    return null;
  }
}

/**
 * Get the owner of a specific NFT token
 */
export async function getNFTOwner(
  contractId: string,
  tokenId: string
): Promise<string | null> {
  try {
    const tokenIdScVal = tokenIdToScVal(tokenId);
    const result = await simulateContractRead(contractId, 'owner_of', [tokenIdScVal]);

    if (result) {
      return scValToNative(result) as string;
    }
    return null;
  } catch (error) {
    console.error('Error getting NFT owner:', error);
    return null;
  }
}

/**
 * Get the token URI for a specific NFT
 */
export async function getNFTTokenUri(
  contractId: string,
  tokenId: string
): Promise<string | null> {
  try {
    const tokenIdScVal = tokenIdToScVal(tokenId);
    const result = await simulateContractRead(contractId, 'token_uri', [tokenIdScVal]);

    if (result) {
      return scValToNative(result) as string;
    }
    return null;
  } catch (error) {
    console.error('Error getting NFT token URI:', error);
    return null;
  }
}

/**
 * Check if a contract implements NFT interface (SEP-0050)
 */
export async function isNFTContract(contractId: string): Promise<boolean> {
  const cacheKey = contractId;
  const cached = getCached(contractTypeCache, cacheKey);
  if (cached === 'nft') return true;
  if (cached !== null) return false;

  try {
    // NFT contracts must implement owner_of - try with token ID 0 or 1
    // We're checking if the method exists, not if the token exists
    const testTokenId = nativeToScVal(0, { type: 'u128' });

    // Try to call owner_of - even if it fails for non-existent token,
    // the error will be different from "method not found"
    const result = await simulateContractRead(contractId, 'owner_of', [testTokenId]);

    // Also verify it has name() which is required for NFTs
    const nameResult = await simulateContractRead(contractId, 'name');

    // If we get results or specific errors (not "method not found"), it's an NFT
    const isNft = nameResult !== null;

    setCache(contractTypeCache, cacheKey, isNft ? 'nft' : 'unknown');
    return isNft;
  } catch (error) {
    console.error('Error checking if contract is NFT:', error);
    setCache(contractTypeCache, cacheKey, 'unknown');
    return false;
  }
}

// ============================================================================
// Vault Functions (ERC-4626)
// ============================================================================

/**
 * Get vault information
 */
export async function getVaultInfo(contractId: string): Promise<VaultInfo | null> {
  const cached = getCached(vaultInfoCache, contractId);
  if (cached) return cached;

  try {
    // Query basic info in parallel
    const [nameResult, symbolResult, assetResult, totalAssetsResult] = await Promise.all([
      simulateContractRead(contractId, 'name'),
      simulateContractRead(contractId, 'symbol'),
      simulateContractRead(contractId, 'asset'), // ERC-4626 standard method
      simulateContractRead(contractId, 'total_assets'),
    ]);

    // If asset() fails, try query_asset() (alternative naming)
    let underlyingAsset: string | null = null;
    if (assetResult) {
      underlyingAsset = scValToNative(assetResult) as string;
    } else {
      const queryAssetResult = await simulateContractRead(contractId, 'query_asset');
      if (queryAssetResult) {
        underlyingAsset = scValToNative(queryAssetResult) as string;
      }
    }

    if (!nameResult || !symbolResult || !underlyingAsset) {
      return null;
    }

    const name = scValToNative(nameResult) as string;
    const symbol = scValToNative(symbolResult) as string;
    const totalAssets = totalAssetsResult
      ? String(scValToNative(totalAssetsResult))
      : '0';

    // Get total shares (total supply of vault tokens)
    let totalShares = '0';
    try {
      const totalSupplyResult = await simulateContractRead(contractId, 'total_supply');
      if (totalSupplyResult) {
        totalShares = String(scValToNative(totalSupplyResult));
      }
    } catch {
      // total_supply might not be available
    }

    // Get decimals offset (for precision handling)
    let decimalsOffset = 0;
    try {
      const decimalsResult = await simulateContractRead(contractId, 'decimals');
      if (decimalsResult) {
        decimalsOffset = Number(scValToNative(decimalsResult));
      }
    } catch {
      // Use default offset
    }

    const info: VaultInfo = {
      contractId,
      name,
      symbol,
      underlyingAsset,
      totalAssets,
      totalShares,
      decimalsOffset,
    };

    setCache(vaultInfoCache, contractId, info);
    return info;
  } catch (error) {
    console.error('Error getting vault info:', error);
    return null;
  }
}

/**
 * Get the underlying asset of a vault
 */
export async function getVaultUnderlyingAsset(contractId: string): Promise<string | null> {
  try {
    // Try both naming conventions
    let result = await simulateContractRead(contractId, 'asset');
    if (!result) {
      result = await simulateContractRead(contractId, 'query_asset');
    }

    if (result) {
      return scValToNative(result) as string;
    }
    return null;
  } catch (error) {
    console.error('Error getting vault underlying asset:', error);
    return null;
  }
}

/**
 * Get total assets held by the vault
 */
export async function getVaultTotalAssets(contractId: string): Promise<string | null> {
  try {
    const result = await simulateContractRead(contractId, 'total_assets');

    if (result) {
      return String(scValToNative(result));
    }
    return null;
  } catch (error) {
    console.error('Error getting vault total assets:', error);
    return null;
  }
}

/**
 * Get conversion rates between shares and assets
 */
export async function getVaultConversionRate(
  contractId: string
): Promise<VaultConversionRate | null> {
  try {
    // Use a standard amount for conversion (1e18 for precision)
    const testAmount = nativeToScVal(BigInt('1000000000000000000'), { type: 'i128' });

    const [sharesToAssetsResult, assetsToSharesResult] = await Promise.all([
      simulateContractRead(contractId, 'convert_to_assets', [testAmount]),
      simulateContractRead(contractId, 'convert_to_shares', [testAmount]),
    ]);

    if (!sharesToAssetsResult || !assetsToSharesResult) {
      return null;
    }

    return {
      sharesToAssets: String(scValToNative(sharesToAssetsResult)),
      assetsToShares: String(scValToNative(assetsToSharesResult)),
    };
  } catch (error) {
    console.error('Error getting vault conversion rate:', error);
    return null;
  }
}

/**
 * Check if a contract implements Vault interface (ERC-4626)
 */
export async function isVaultContract(contractId: string): Promise<boolean> {
  const cacheKey = contractId;
  const cached = getCached(contractTypeCache, cacheKey);
  if (cached === 'vault') return true;
  if (cached !== null && cached !== 'unknown') return false;

  try {
    // Vault contracts must implement total_assets and either asset() or query_asset()
    const [totalAssetsResult, assetResult, queryAssetResult] = await Promise.all([
      simulateContractRead(contractId, 'total_assets'),
      simulateContractRead(contractId, 'asset'),
      simulateContractRead(contractId, 'query_asset'),
    ]);

    const hasAsset = assetResult !== null || queryAssetResult !== null;
    const isVault = totalAssetsResult !== null && hasAsset;

    if (isVault) {
      setCache(contractTypeCache, cacheKey, 'vault');
    }
    return isVault;
  } catch (error) {
    console.error('Error checking if contract is vault:', error);
    return false;
  }
}

// ============================================================================
// RWA Functions (Real World Assets)
// ============================================================================

/**
 * Get RWA compliance status for an account
 */
export async function getRWAComplianceStatus(
  contractId: string,
  account: string
): Promise<RWAComplianceStatus | null> {
  const cacheKey = `${contractId}:${account}`;
  const cached = getCached(rwaComplianceCache, cacheKey);
  if (cached) return cached;

  try {
    const accountScVal = new Address(account).toScVal();

    // Query frozen status
    const [isFrozenResult, frozenBalanceResult] = await Promise.all([
      simulateContractRead(contractId, 'is_frozen', [accountScVal]),
      simulateContractRead(contractId, 'frozen_balance', [accountScVal]),
    ]);

    const isFrozen = isFrozenResult
      ? (scValToNative(isFrozenResult) as boolean)
      : false;

    const frozenAmount = frozenBalanceResult
      ? String(scValToNative(frozenBalanceResult))
      : undefined;

    // Check if account is compliant (not frozen and no frozen balance)
    const isCompliant = !isFrozen && (!frozenAmount || frozenAmount === '0');

    const status: RWAComplianceStatus = {
      isCompliant,
      isFrozen,
      frozenAmount,
    };

    setCache(rwaComplianceCache, cacheKey, status);
    return status;
  } catch (error) {
    console.error('Error getting RWA compliance status:', error);
    return null;
  }
}

/**
 * Check if a contract implements RWA compliance interface
 */
export async function isRWAContract(contractId: string): Promise<boolean> {
  const cacheKey = contractId;
  const cached = getCached(contractTypeCache, cacheKey);
  if (cached === 'rwa') return true;
  if (cached !== null && cached !== 'unknown') return false;

  try {
    // RWA contracts typically implement is_frozen and/or frozen_balance
    // Test with a dummy address
    const testAddress = new Address(
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'
    ).toScVal();

    const [isFrozenResult, frozenBalanceResult] = await Promise.all([
      simulateContractRead(contractId, 'is_frozen', [testAddress]),
      simulateContractRead(contractId, 'frozen_balance', [testAddress]),
    ]);

    // If either method returns a result, it's likely an RWA contract
    const isRwa = isFrozenResult !== null || frozenBalanceResult !== null;

    if (isRwa) {
      setCache(contractTypeCache, cacheKey, 'rwa');
    }
    return isRwa;
  } catch (error) {
    console.error('Error checking if contract is RWA:', error);
    return false;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Detect contract type (NFT, Vault, RWA, or unknown)
 */
export async function detectContractType(
  contractId: string
): Promise<'nft' | 'vault' | 'rwa' | 'token' | 'unknown'> {
  const cached = getCached(contractTypeCache, contractId);
  if (cached && cached !== 'unknown') return cached;

  // Check in order of specificity
  if (await isVaultContract(contractId)) return 'vault';
  if (await isNFTContract(contractId)) return 'nft';
  if (await isRWAContract(contractId)) return 'rwa';

  // Check if it's a basic token (has name, symbol, decimals)
  try {
    const [name, symbol, decimals] = await Promise.all([
      simulateContractRead(contractId, 'name'),
      simulateContractRead(contractId, 'symbol'),
      simulateContractRead(contractId, 'decimals'),
    ]);

    if (name && symbol && decimals) {
      return 'token';
    }
  } catch {
    // Not a token
  }

  return 'unknown';
}

/**
 * Clear all caches (useful for testing or forcing refresh)
 */
export function clearExtensionCaches(): void {
  nftInfoCache.clear();
  nftTokenInfoCache.clear();
  vaultInfoCache.clear();
  rwaComplianceCache.clear();
  contractTypeCache.clear();
}

/**
 * Clear cache for a specific contract
 */
export function clearContractCache(contractId: string): void {
  nftInfoCache.delete(contractId);
  vaultInfoCache.delete(contractId);
  contractTypeCache.delete(contractId);

  // Clear token-specific caches (pattern match)
  for (const key of nftTokenInfoCache.keys()) {
    if (key.startsWith(`${contractId}:`)) {
      nftTokenInfoCache.delete(key);
    }
  }
  for (const key of rwaComplianceCache.keys()) {
    if (key.startsWith(`${contractId}:`)) {
      rwaComplianceCache.delete(key);
    }
  }
}
