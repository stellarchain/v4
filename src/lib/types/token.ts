// SEP-0041 Token Interface Types
// https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0041.md

export interface SEP41TokenMetadata {
  contractId: string;
  name: string;
  symbol: string;
  decimals: number;
  isSAC: boolean;  // Is Stellar Asset Contract (wrapped classic asset)
  underlyingAsset?: {
    code: string;
    issuer: string;
  };
  lastFetched: number;  // Unix timestamp
  fetchedFromRPC: boolean;
}

export interface TokenRegistryEntry extends SEP41TokenMetadata {
  iconUrl?: string;
  description?: string;
  domain?: string;
  verified?: boolean;
  category?: 'token' | 'dex' | 'lending' | 'nft' | 'other';
}

// Result type for token queries
export interface TokenQueryResult {
  success: boolean;
  data?: SEP41TokenMetadata;
  error?: string;
  fromCache: boolean;
}

// SAC detection result
export interface SACDetectionResult {
  isSAC: boolean;
  assetCode?: string;
  assetIssuer?: string;
  contractId: string;
}

// Contract function types for display
export type ContractFunctionType =
  | 'transfer'
  | 'swap'
  | 'mint'
  | 'burn'
  | 'approve'
  | 'deposit'
  | 'withdraw'
  | 'initialize'
  | 'unknown';

// Enhanced decoded parameter with type info
export interface DecodedParam {
  name: string;
  value: string;
  type: 'address' | 'symbol' | 'i128' | 'u128' | 'i64' | 'u64' | 'i32' | 'u32' | 'bool' | 'bytes' | 'string' | 'vec' | 'map' | 'unknown';
  rawValue?: bigint;  // For numeric types
  isContract?: boolean;  // True if address starts with 'C'
}

// Complete contract display info for UI
export interface ContractDisplayInfo {
  functionName: string;
  functionType: ContractFunctionType;
  contractAddress: string | null;
  parameters: DecodedParam[];
  // For transfer/swap operations
  from?: string;
  to?: string;
  amount?: string;
  formattedAmount?: string;
  tokenSymbol?: string;
  tokenName?: string;
  decimals?: number;
}

// Verified contract entry for static data
export interface VerifiedContract {
  id: string;
  name: string;
  type: 'token' | 'dex' | 'lending' | 'nft' | 'other';
  sep41: boolean;
  symbol?: string;
  decimals?: number;
  verified: boolean;
  website?: string;
  description?: string;
  iconUrl?: string;
  addedAt: string;  // ISO date
}

// Soroban RPC configuration
export interface SorobanRpcConfig {
  mainnetUrl: string;
  testnetUrl: string;
  timeout: number;
  retryAttempts: number;
}

// =============================================================================
// NFT Support (SEP-0050)
// =============================================================================

export interface NFTMetadata {
  contractId: string;
  name: string;
  symbol: string;
  tokenUri?: string;
  imageUri?: string;
  description?: string;
  attributes?: Array<{ type: string; value: string; display_type?: string }>;
  owner?: string;
  royaltyInfo?: { receiver: string; percentage: number };
}

// =============================================================================
// RWA Token Support (Real World Assets)
// =============================================================================

export interface RWATokenInfo {
  contractId: string;
  name: string;
  symbol: string;
  decimals: number;
  complianceContract?: string;
  identityVerifier?: string;
  isFrozen?: boolean;
  frozenAmount?: string;
}

// =============================================================================
// Vault Support (ERC-4626 style)
// =============================================================================

export interface VaultInfo {
  contractId: string;
  name: string;
  symbol: string;
  underlyingAsset: string;
  totalAssets: string;
  totalShares: string;
  decimalsOffset: number;
  shareToAssetRate: string;
}

// =============================================================================
// Access Control
// =============================================================================

export interface ContractAccessControl {
  owner?: string;
  admin?: string;
  pendingOwner?: string;
  isPaused: boolean;
  roles?: Array<{ role: string; members: string[] }>;
}

// =============================================================================
// Contract Verification (SEP-0055)
// =============================================================================

export interface ContractVerification {
  isVerified: boolean;
  sourceRepo?: string;
  commitHash?: string;
  wasmHash?: string;
  attestationUrl?: string;
  buildWorkflow?: string;
  verifiedAt?: string;
}

// =============================================================================
// Contract Metadata (SEP-0046)
// =============================================================================

export interface ContractMetadata {
  sourceRepo?: string;
  homeDomain?: string;
  customMeta?: Record<string, string>;
}

// =============================================================================
// Contract Storage
// =============================================================================

export interface ContractStorageEntry {
  key: string;
  value: string;
  keyType: string;
  valueType: string;
  durability: 'temporary' | 'persistent' | 'instance';
  ttl?: number;
  lastUpdated?: string;
}

// =============================================================================
// Enhanced Contract Info (combining all contract-related types)
// =============================================================================

export interface EnhancedContractInfo {
  contractId: string;
  type: 'token' | 'nft' | 'rwa' | 'vault' | 'dex' | 'lending' | 'other';
  tokenMetadata?: TokenRegistryEntry;
  nftMetadata?: NFTMetadata;
  rwaInfo?: RWATokenInfo;
  vaultInfo?: VaultInfo;
  accessControl?: ContractAccessControl;
  verification?: ContractVerification;
  metadata?: ContractMetadata;
  storage?: ContractStorageEntry[];
}
