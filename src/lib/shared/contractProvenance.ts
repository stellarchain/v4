import type { ContractVerification } from './interfaces';

interface ContractProvenanceInput {
  sourceCodeVerified?: boolean;
  sourceCode?: string | null;
  sep55Verified?: boolean;
  githubAddress?: string | null;
  sep55CommitHash?: string | null;
  sep55AttestationUrl?: string | null;
  wasmId?: string | null;
  source?: { sourceCodeAvailable?: boolean } | null;
}

export function contractVerificationFromApi(input: ContractProvenanceInput, isSac: boolean): ContractVerification | null {
  if (isSac) return null;
  const sourceRepo = input.githubAddress && /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(input.githubAddress)
    ? input.githubAddress : undefined;
  return {
    isVerified: Boolean(input.sep55Verified),
    sourceAvailable: Boolean(input.source?.sourceCodeAvailable || input.sourceCodeVerified || input.sourceCode),
    sourceRepo,
    commitHash: input.sep55CommitHash || undefined,
    attestationUrl: input.sep55AttestationUrl || undefined,
    wasmHash: input.wasmId || undefined,
  };
}
