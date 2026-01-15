// Token Registry with Caching for SEP-0041 Tokens
// Provides fast lookup of token metadata with multi-layer caching

import type { TokenRegistryEntry, SEP41TokenMetadata } from './types/token';
import { queryTokenMetadata, detectSAC, isContractAddress } from './soroban';

// Cache configuration
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;  // 24 hours for valid entries
const FAILED_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes for failed lookups

// In-memory cache
interface CacheEntry {
  entry: TokenRegistryEntry | null;
  expiry: number;
  failed: boolean;
}

const tokenCache: Map<string, CacheEntry> = new Map();

// Known tokens registry - instant lookup for popular tokens
// These are verified contracts on Stellar mainnet
export const KNOWN_TOKENS: Record<string, TokenRegistryEntry> = {
  // USDC - Circle's USD Coin SAC
  'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75': {
    contractId: 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 7,
    isSAC: true,
    underlyingAsset: {
      code: 'USDC',
      issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    },
    lastFetched: Date.now(),
    fetchedFromRPC: false,
    verified: true,
    domain: 'centre.io',
    category: 'token',
  },

  // Native XLM SAC
  'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA': {
    contractId: 'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA',
    name: 'Stellar Lumens',
    symbol: 'XLM',
    decimals: 7,
    isSAC: true,
    lastFetched: Date.now(),
    fetchedFromRPC: false,
    verified: true,
    domain: 'stellar.org',
    category: 'token',
  },

  // AQUA Token
  'CDCYWK73YTYFJZZSJ5V7EDFNHYBG4QN3SI7URHY2A2YKYGC423AIM5C': {
    contractId: 'CDCYWK73YTYFJZZSJ5V7EDFNHYBG4QN3SI7URHY2A2YKYGC423AIM5C',
    name: 'Aquarius',
    symbol: 'AQUA',
    decimals: 7,
    isSAC: true,
    underlyingAsset: {
      code: 'AQUA',
      issuer: 'GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA',
    },
    lastFetched: Date.now(),
    fetchedFromRPC: false,
    verified: true,
    domain: 'aqua.network',
    category: 'token',
  },

  // yUSDC (Yieldblox wrapped USDC)
  'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA': {
    contractId: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
    name: 'yUSDC',
    symbol: 'yUSDC',
    decimals: 7,
    isSAC: false,
    lastFetched: Date.now(),
    fetchedFromRPC: false,
    verified: true,
    domain: 'yieldblox.finance',
    category: 'lending',
  },

  // Blend Protocol
  'CDVQVKOY2YSXS2IC7KN6MNASSHPAO7UN2UR2ON4OI2SKMFJNVAMDX6DP': {
    contractId: 'CDVQVKOY2YSXS2IC7KN6MNASSHPAO7UN2UR2ON4OI2SKMFJNVAMDX6DP',
    name: 'Blend Protocol',
    symbol: 'BLEND',
    decimals: 7,
    isSAC: false,
    lastFetched: Date.now(),
    fetchedFromRPC: false,
    verified: true,
    domain: 'blend.capital',
    category: 'lending',
  },

  // KALE Token (FarmBot/Kale Farm)
  'CDL74RF5BLYR2YBLCCI7F5FB6TPSCLKEJUBSD2RSVWZ4YHF3VMFAIGWA': {
    contractId: 'CDL74RF5BLYR2YBLCCI7F5FB6TPSCLKEJUBSD2RSVWZ4YHF3VMFAIGWA',
    name: 'KALE',
    symbol: 'KALE',
    decimals: 7,
    isSAC: false,
    lastFetched: Date.now(),
    fetchedFromRPC: false,
    verified: true,
    domain: 'kale.farm',
    category: 'token',
  },
};

// Get token from cache
export function getCachedToken(contractId: string): TokenRegistryEntry | null {
  const cached = tokenCache.get(contractId);
  if (!cached) return null;

  // Check expiry
  if (Date.now() > cached.expiry) {
    tokenCache.delete(contractId);
    return null;
  }

  return cached.entry;
}

// Set token in cache
export function setCachedToken(
  contractId: string,
  entry: TokenRegistryEntry | null,
  failed: boolean = false
): void {
  const ttl = failed ? FAILED_CACHE_TTL_MS : CACHE_TTL_MS;
  tokenCache.set(contractId, {
    entry,
    expiry: Date.now() + ttl,
    failed,
  });
}

// Invalidate cache for a contract
export function invalidateTokenCache(contractId: string): void {
  tokenCache.delete(contractId);
}

// Clear entire cache
export function clearTokenCache(): void {
  tokenCache.clear();
}

// Get token metadata with full fallback chain
export async function getTokenMetadata(contractId: string): Promise<TokenRegistryEntry | null> {
  // Validate input
  if (!contractId || !isContractAddress(contractId)) {
    return null;
  }

  // Layer 1: Check in-memory cache
  const cached = getCachedToken(contractId);
  if (cached !== null) {
    return cached;
  }

  // Layer 2: Check known tokens registry
  const known = KNOWN_TOKENS[contractId];
  if (known) {
    setCachedToken(contractId, known);
    return known;
  }

  // Layer 3: Query Soroban RPC
  try {
    const rpcMetadata = await queryTokenMetadata(contractId);

    if (rpcMetadata) {
      // Check if it's a SAC
      const sacResult = await detectSAC(contractId);

      const entry: TokenRegistryEntry = {
        ...rpcMetadata,
        isSAC: sacResult.isSAC,
        underlyingAsset: sacResult.assetCode
          ? { code: sacResult.assetCode, issuer: sacResult.assetIssuer || '' }
          : undefined,
        verified: false,
      };

      setCachedToken(contractId, entry);
      return entry;
    }
  } catch (error) {
    console.error('Error fetching token metadata from RPC:', error);
  }

  // Layer 4: Return placeholder for unknown tokens
  const placeholder: TokenRegistryEntry = {
    contractId,
    name: 'Unknown Token',
    symbol: shortenContractId(contractId),
    decimals: 7, // Default Stellar decimals
    isSAC: false,
    lastFetched: Date.now(),
    fetchedFromRPC: false,
    verified: false,
  };

  // Cache the placeholder with shorter TTL
  setCachedToken(contractId, placeholder, true);
  return placeholder;
}

// Get metadata for multiple tokens (batch)
export async function getTokenMetadataBatch(
  contractIds: string[]
): Promise<Map<string, TokenRegistryEntry>> {
  const results = new Map<string, TokenRegistryEntry>();

  // Deduplicate and validate
  const uniqueIds = [...new Set(contractIds)].filter(isContractAddress);

  // Fetch in parallel with concurrency limit
  const BATCH_SIZE = 5;
  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (id) => {
        const metadata = await getTokenMetadata(id);
        return { id, metadata };
      })
    );

    for (const { id, metadata } of batchResults) {
      if (metadata) {
        results.set(id, metadata);
      }
    }
  }

  return results;
}

// Format token amount with correct decimals
export function formatTokenAmount(
  rawAmount: bigint | string | number,
  decimals: number = 7
): string {
  const ZERO = BigInt(0);
  const TEN = BigInt(10);

  const amount = typeof rawAmount === 'bigint'
    ? rawAmount
    : BigInt(Math.floor(Number(rawAmount)));

  if (amount === ZERO) return '0';

  const divisor = TEN ** BigInt(decimals);
  const wholePart = amount / divisor;
  const fracPart = amount % divisor;

  if (fracPart === ZERO) {
    return formatLargeNumber(wholePart);
  }

  // Format fractional part, removing trailing zeros
  const fracStr = fracPart.toString().padStart(decimals, '0').replace(/0+$/, '');

  if (wholePart === ZERO) {
    return `0.${fracStr}`;
  }

  return `${formatLargeNumber(wholePart)}.${fracStr}`;
}

// Format large numbers with K, M, B suffixes
function formatLargeNumber(value: bigint): string {
  const num = Number(value);

  if (num >= 1_000_000_000_000) {
    return (num / 1_000_000_000_000).toFixed(2) + 'T';
  }
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2) + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + 'M';
  }
  if (num >= 10_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }

  return num.toLocaleString();
}

// Shorten contract ID for display
export function shortenContractId(contractId: string, chars: number = 4): string {
  if (!contractId || contractId.length < chars * 2 + 3) {
    return contractId;
  }
  return `${contractId.slice(0, chars)}...${contractId.slice(-chars)}`;
}

// Get display info for a token (for UI components)
export interface TokenDisplayInfo {
  name: string;
  symbol: string;
  iconUrl?: string;
  contractId: string;
  verified: boolean;
  isSAC: boolean;
}

export async function getTokenDisplayInfo(contractId: string): Promise<TokenDisplayInfo> {
  const metadata = await getTokenMetadata(contractId);

  if (!metadata) {
    return {
      name: 'Unknown',
      symbol: shortenContractId(contractId),
      contractId,
      verified: false,
      isSAC: false,
    };
  }

  return {
    name: metadata.name,
    symbol: metadata.symbol,
    iconUrl: metadata.iconUrl,
    contractId: metadata.contractId,
    verified: metadata.verified || false,
    isSAC: metadata.isSAC,
  };
}

// Get all known/verified tokens
export function getVerifiedTokens(): TokenRegistryEntry[] {
  return Object.values(KNOWN_TOKENS).filter(t => t.verified);
}

// Search tokens by name or symbol
export function searchTokens(query: string): TokenRegistryEntry[] {
  const q = query.toLowerCase();
  return Object.values(KNOWN_TOKENS).filter(
    t =>
      t.name.toLowerCase().includes(q) ||
      t.symbol.toLowerCase().includes(q) ||
      t.contractId.toLowerCase().includes(q)
  );
}
