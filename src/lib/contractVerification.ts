// Contract Build Verification Service (SEP-0055)
// Verifies deployed contracts against GitHub attestations
// https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0055.md

import { xdr, Address } from '@stellar/stellar-sdk';
import { getSorobanServer } from './soroban';
import type { ContractVerification } from './types/token';

// ============================================================================
// Types
// ============================================================================

interface GitHubAttestation {
  bundle: {
    dsseEnvelope: {
      payload: string;
      payloadType: string;
      signatures: Array<{ sig: string; keyid?: string }>;
    };
    verificationMaterial?: {
      publicKey?: {
        hint?: string;
      };
      certificate?: {
        rawBytes?: string;
      };
    };
  };
  repository_id: number;
  bundle_version?: string;
}

interface GitHubAttestationsResponse {
  attestations: GitHubAttestation[];
}

interface AttestationPayload {
  _type: string;
  predicateType: string;
  subject: Array<{
    name: string;
    digest: {
      sha256: string;
    };
  }>;
  predicate: {
    buildType?: string;
    builder?: {
      id: string;
    };
    invocation?: {
      configSource?: {
        uri?: string;
        digest?: {
          sha1?: string;
        };
        entryPoint?: string;
      };
      parameters?: Record<string, unknown>;
    };
    buildConfig?: {
      version?: string;
    };
    metadata?: {
      buildInvocationId?: string;
      buildStartedOn?: string;
      buildFinishedOn?: string;
    };
  };
}

export interface VerificationResult {
  isVerified: boolean;
  sourceRepo?: string;
  commitHash?: string;
  wasmHash?: string;
  attestationUrl?: string;
  buildWorkflow?: string;
  verifiedAt?: string;
  error?: string;
}

interface CacheEntry {
  result: VerificationResult;
  timestamp: number;
}

// ============================================================================
// Cache Configuration
// ============================================================================

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const verificationCache = new Map<string, CacheEntry>();

// Clean expired cache entries periodically
function cleanExpiredCache(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];
  verificationCache.forEach((entry, key) => {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((key) => verificationCache.delete(key));
}

// Run cache cleanup every minute
if (typeof setInterval !== 'undefined') {
  setInterval(cleanExpiredCache, 60 * 1000);
}

// ============================================================================
// Contract WASM Hash Retrieval
// ============================================================================

/**
 * Get the WASM hash of a deployed contract from Soroban RPC
 * The WASM hash is stored in the contract instance ledger entry
 */
export async function getContractWasmHash(contractId: string): Promise<string | null> {
  try {
    const server = getSorobanServer();
    const contractAddress = new Address(contractId);

    // Build the ledger key for the contract instance
    const ledgerKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: contractAddress.toScAddress(),
        key: xdr.ScVal.scvLedgerKeyContractInstance(),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );

    const response = await server.getLedgerEntries(ledgerKey);

    if (!response.entries || response.entries.length === 0) {
      console.warn(`No contract instance found for ${contractId}`);
      return null;
    }

    const entry = response.entries[0];
    const ledgerEntryData = entry.val;

    // Extract the contract data
    if (ledgerEntryData.switch() !== xdr.LedgerEntryType.contractData()) {
      return null;
    }

    const contractData = ledgerEntryData.contractData();
    const scVal = contractData.val();

    // The instance value contains the executable info
    if (scVal.switch() !== xdr.ScValType.scvContractInstance()) {
      return null;
    }

    const instance = scVal.instance();
    const executable = instance.executable();

    // Check if it's a WASM executable (not a Stellar Asset Contract)
    if (executable.switch() !== xdr.ContractExecutableType.contractExecutableWasm()) {
      // This is a Stellar Asset Contract (SAC), not a custom WASM contract
      return null;
    }

    // Get the WASM hash
    const wasmHash = executable.wasmHash();
    return wasmHash.toString('hex');
  } catch (error) {
    console.error(`Error getting WASM hash for ${contractId}:`, error);
    return null;
  }
}

// ============================================================================
// Contract Metadata Extraction (SEP-0046)
// ============================================================================

/**
 * Extract source_repo metadata from contract storage (SEP-0046)
 * This reads the contract's instance storage for metadata entries
 */
export async function extractSourceRepo(contractId: string): Promise<string | null> {
  try {
    const server = getSorobanServer();
    const contractAddress = new Address(contractId);

    // Try to read the __meta__ or metadata storage key
    // SEP-0046 defines metadata storage conventions
    const metadataKeys = ['__meta__', 'source_repo', 'repository', 'meta'];

    for (const keyName of metadataKeys) {
      try {
        const key = xdr.ScVal.scvSymbol(keyName);

        const ledgerKey = xdr.LedgerKey.contractData(
          new xdr.LedgerKeyContractData({
            contract: contractAddress.toScAddress(),
            key,
            durability: xdr.ContractDataDurability.persistent(),
          })
        );

        const response = await server.getLedgerEntries(ledgerKey);

        if (response.entries && response.entries.length > 0) {
          const entry = response.entries[0];
          const data = entry.val.contractData();
          const value = data.val();

          // Try to extract string value
          if (value.switch() === xdr.ScValType.scvString()) {
            return value.str().toString();
          }

          // Try to extract from map
          if (value.switch() === xdr.ScValType.scvMap()) {
            const mapEntries = value.map();
            if (mapEntries) {
              for (const mapEntry of mapEntries) {
                const mapKey = mapEntry.key();
                if (mapKey.switch() === xdr.ScValType.scvSymbol()) {
                  const symName = mapKey.sym().toString();
                  if (symName === 'source_repo' || symName === 'repository') {
                    const mapValue = mapEntry.val();
                    if (mapValue.switch() === xdr.ScValType.scvString()) {
                      return mapValue.str().toString();
                    }
                  }
                }
              }
            }
          }
        }
      } catch {
        // Key doesn't exist, try next
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error extracting source repo for ${contractId}:`, error);
    return null;
  }
}

// ============================================================================
// GitHub Attestation API
// ============================================================================

/**
 * Fetch GitHub attestation for a WASM hash
 * Uses GitHub's artifact attestations API
 * https://docs.github.com/en/actions/security-guides/using-artifact-attestations-to-establish-provenance-for-builds
 */
export async function fetchGitHubAttestation(
  repoOwner: string,
  repoName: string,
  wasmHash: string
): Promise<GitHubAttestation | null> {
  try {
    // GitHub attestations API endpoint
    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/attestations/sha256:${wasmHash}`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Stellarchain-Verification/1.0',
        // Note: For private repos, you'd need to add: 'Authorization': `Bearer ${token}`
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // No attestation found - this is expected for unverified contracts
        return null;
      }
      console.warn(`GitHub attestation API error: ${response.status}`);
      return null;
    }

    const data: GitHubAttestationsResponse = await response.json();

    if (!data.attestations || data.attestations.length === 0) {
      return null;
    }

    // Return the most recent attestation (first in the list)
    return data.attestations[0];
  } catch (error) {
    console.error(`Error fetching GitHub attestation for ${repoOwner}/${repoName}:`, error);
    return null;
  }
}

/**
 * Parse the attestation payload to extract build details
 */
function parseAttestationPayload(attestation: GitHubAttestation): Partial<VerificationResult> {
  try {
    const payloadBase64 = attestation.bundle.dsseEnvelope.payload;
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
    const payload: AttestationPayload = JSON.parse(payloadJson);

    const result: Partial<VerificationResult> = {};

    // Extract source repository from invocation config
    if (payload.predicate?.invocation?.configSource?.uri) {
      const uri = payload.predicate.invocation.configSource.uri;
      // Parse git+https://github.com/owner/repo@refs/heads/main format
      const match = uri.match(/github\.com\/([^@]+)/);
      if (match) {
        result.sourceRepo = `https://github.com/${match[1]}`;
      }
    }

    // Extract commit hash
    if (payload.predicate?.invocation?.configSource?.digest?.sha1) {
      result.commitHash = payload.predicate.invocation.configSource.digest.sha1;
    }

    // Extract build workflow entry point
    if (payload.predicate?.invocation?.configSource?.entryPoint) {
      result.buildWorkflow = payload.predicate.invocation.configSource.entryPoint;
    }

    // Extract verification timestamp
    if (payload.predicate?.metadata?.buildFinishedOn) {
      result.verifiedAt = payload.predicate.metadata.buildFinishedOn;
    }

    // Extract WASM hash from subject
    if (payload.subject && payload.subject.length > 0) {
      result.wasmHash = payload.subject[0].digest.sha256;
    }

    return result;
  } catch (error) {
    console.error('Error parsing attestation payload:', error);
    return {};
  }
}

// ============================================================================
// Main Verification Function
// ============================================================================

/**
 * Verify a contract against GitHub attestations
 * This is the main entry point for contract verification
 */
export async function verifyContract(contractId: string): Promise<VerificationResult> {
  // Check cache first
  const cached = verificationCache.get(contractId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  try {
    // Step 1: Get the contract's WASM hash
    const wasmHash = await getContractWasmHash(contractId);

    if (!wasmHash) {
      const result: VerificationResult = {
        isVerified: false,
        error: 'Unable to retrieve WASM hash. This may be a Stellar Asset Contract (SAC) or the contract may not exist.',
      };
      verificationCache.set(contractId, { result, timestamp: Date.now() });
      return result;
    }

    // Step 2: Try to extract source repository from contract metadata
    const sourceRepo = await extractSourceRepo(contractId);

    if (!sourceRepo) {
      // Without source repo metadata, we can't verify
      // But we can still return the WASM hash for manual verification
      const result: VerificationResult = {
        isVerified: false,
        wasmHash,
        error: 'No source repository metadata found in contract. Manual verification may be possible if you know the source repository.',
      };
      verificationCache.set(contractId, { result, timestamp: Date.now() });
      return result;
    }

    // Step 3: Parse the repository URL to extract owner and repo name
    const repoMatch = sourceRepo.match(/github\.com\/([^\/]+)\/([^\/\s]+)/);
    if (!repoMatch) {
      const result: VerificationResult = {
        isVerified: false,
        wasmHash,
        sourceRepo,
        error: 'Source repository URL is not a GitHub repository. Only GitHub attestations are currently supported.',
      };
      verificationCache.set(contractId, { result, timestamp: Date.now() });
      return result;
    }

    const repoOwner = repoMatch[1];
    const repoName = repoMatch[2].replace(/\.git$/, '');

    // Step 4: Fetch GitHub attestation
    const attestation = await fetchGitHubAttestation(repoOwner, repoName, wasmHash);

    if (!attestation) {
      const result: VerificationResult = {
        isVerified: false,
        wasmHash,
        sourceRepo,
        attestationUrl: `https://github.com/${repoOwner}/${repoName}/attestations`,
        error: 'No GitHub attestation found for this WASM hash. The contract may not have been built with attestation signing.',
      };
      verificationCache.set(contractId, { result, timestamp: Date.now() });
      return result;
    }

    // Step 5: Parse attestation payload for details
    const attestationDetails = parseAttestationPayload(attestation);

    // Success - contract is verified
    const result: VerificationResult = {
      isVerified: true,
      wasmHash,
      sourceRepo: attestationDetails.sourceRepo || sourceRepo,
      commitHash: attestationDetails.commitHash,
      buildWorkflow: attestationDetails.buildWorkflow,
      verifiedAt: attestationDetails.verifiedAt || new Date().toISOString(),
      attestationUrl: `https://github.com/${repoOwner}/${repoName}/attestations`,
    };

    verificationCache.set(contractId, { result, timestamp: Date.now() });
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const result: VerificationResult = {
      isVerified: false,
      error: `Verification failed: ${errorMessage}`,
    };
    verificationCache.set(contractId, { result, timestamp: Date.now() });
    return result;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Verify a contract with a known source repository
 * Use this when you already know the source repository
 */
export async function verifyContractWithRepo(
  contractId: string,
  repoOwner: string,
  repoName: string
): Promise<VerificationResult> {
  const cacheKey = `${contractId}:${repoOwner}/${repoName}`;

  // Check cache
  const cached = verificationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  try {
    const wasmHash = await getContractWasmHash(contractId);

    if (!wasmHash) {
      const result: VerificationResult = {
        isVerified: false,
        error: 'Unable to retrieve WASM hash.',
      };
      verificationCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }

    const attestation = await fetchGitHubAttestation(repoOwner, repoName, wasmHash);

    if (!attestation) {
      const result: VerificationResult = {
        isVerified: false,
        wasmHash,
        sourceRepo: `https://github.com/${repoOwner}/${repoName}`,
        attestationUrl: `https://github.com/${repoOwner}/${repoName}/attestations`,
        error: 'No attestation found for this WASM hash in the specified repository.',
      };
      verificationCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }

    const attestationDetails = parseAttestationPayload(attestation);

    const result: VerificationResult = {
      isVerified: true,
      wasmHash,
      sourceRepo: `https://github.com/${repoOwner}/${repoName}`,
      commitHash: attestationDetails.commitHash,
      buildWorkflow: attestationDetails.buildWorkflow,
      verifiedAt: attestationDetails.verifiedAt || new Date().toISOString(),
      attestationUrl: `https://github.com/${repoOwner}/${repoName}/attestations`,
    };

    verificationCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const result: VerificationResult = {
      isVerified: false,
      error: `Verification failed: ${errorMessage}`,
    };
    verificationCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }
}

/**
 * Clear the verification cache for a specific contract or all contracts
 */
export function clearVerificationCache(contractId?: string): void {
  if (contractId) {
    // Clear all cache entries for this contract
    const keysToDelete: string[] = [];
    verificationCache.forEach((_, key) => {
      if (key.startsWith(contractId)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => verificationCache.delete(key));
  } else {
    verificationCache.clear();
  }
}

/**
 * Convert VerificationResult to ContractVerification type for UI
 */
export function toContractVerification(result: VerificationResult): ContractVerification {
  return {
    isVerified: result.isVerified,
    sourceRepo: result.sourceRepo,
    commitHash: result.commitHash,
    wasmHash: result.wasmHash,
    attestationUrl: result.attestationUrl,
    buildWorkflow: result.buildWorkflow,
    verifiedAt: result.verifiedAt,
  };
}

/**
 * Check if a WASM hash matches any attestation in a repository
 * Useful for batch verification or finding which repo a contract belongs to
 */
export async function findAttestationForWasmHash(
  wasmHash: string,
  repositories: Array<{ owner: string; name: string }>
): Promise<{ found: boolean; repository?: string; attestation?: GitHubAttestation }> {
  for (const repo of repositories) {
    const attestation = await fetchGitHubAttestation(repo.owner, repo.name, wasmHash);
    if (attestation) {
      return {
        found: true,
        repository: `${repo.owner}/${repo.name}`,
        attestation,
      };
    }
  }
  return { found: false };
}
