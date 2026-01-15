import { getTokenMetadata } from '@/lib/tokenRegistry';
import { isContractAddress } from '@/lib/soroban';
import type { Operation } from '@/lib/stellar';
import Link from 'next/link';
import ContractMobileView from '@/components/mobile/ContractMobileView';
import ContractDesktopView from '@/components/desktop/ContractDesktopView';
import verifiedContracts from '@/data/verified-contracts.json';
import { verifyContract, toContractVerification } from '@/lib/contractVerification';
import { getContractMetadata, getContractAccessControl, detectContractType } from '@/lib/contractMetadata';
import { getNFTInfo, getVaultInfo, getRWAComplianceStatus, isNFTContract, isVaultContract, isRWAContract } from '@/lib/contractExtensions';
import { getContractEvents, ParsedEvent, getEventSummary } from '@/lib/eventParser';
import { getContractStorage, ContractStorageResult } from '@/lib/contractStorage';

export const revalidate = 60;

interface ContractPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContractPage({ params }: ContractPageProps) {
  const { id } = await params;

  // Validate contract ID format
  if (!isContractAddress(id)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid Contract ID</h1>
        <p className="text-slate-500 mb-6 text-center">Contract IDs must start with &apos;C&apos; and be 56 characters long.</p>
        <p className="text-slate-400 font-mono text-sm mb-8 break-all max-w-lg text-center">{id}</p>
        <Link
          href="/"
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  let account = null;
  const operations: Operation[] = []; // Operations are empty for contracts - use events instead
  let tokenMetadata = null;
  let error: string | null = null;

  // Store enhanced data results
  let verificationResult: PromiseSettledResult<Awaited<ReturnType<typeof verifyContract>>> | null = null;
  let contractMetaResult: PromiseSettledResult<Awaited<ReturnType<typeof getContractMetadata>>> | null = null;
  let accessControlResult: PromiseSettledResult<Awaited<ReturnType<typeof getContractAccessControl>>> | null = null;
  let contractTypeResult: PromiseSettledResult<Awaited<ReturnType<typeof detectContractType>>> | null = null;
  let nftInfoResult: PromiseSettledResult<Awaited<ReturnType<typeof getNFTInfo>>> | null = null;
  let vaultInfoResult: PromiseSettledResult<Awaited<ReturnType<typeof getVaultInfo>>> | null = null;
  let eventsResult: PromiseSettledResult<ParsedEvent[]> | null = null;
  let storageResult: PromiseSettledResult<ContractStorageResult | null> | null = null;

  try {
    // Fetch all enhanced data in parallel
    // Note: We don't use getAccountOperations for contracts as Horizon doesn't support it
    // Contracts use Soroban events as their activity feed instead
    const [
      metadataRes,
      verificationRes,
      contractMetaRes,
      accessControlRes,
      contractTypeRes,
      nftInfoRes,
      vaultInfoRes,
      eventsRes,
      storageRes,
    ] = await Promise.allSettled([
      getTokenMetadata(id),
      verifyContract(id),
      getContractMetadata(id),
      getContractAccessControl(id),
      detectContractType(id),
      getNFTInfo(id),
      getVaultInfo(id),
      getContractEvents(id, 50),
      getContractStorage(id),
    ]);

    // Extract core data results
    if (metadataRes.status === 'fulfilled') {
      tokenMetadata = metadataRes.value;
    }

    // Store enhanced data results for later use
    verificationResult = verificationRes;
    contractMetaResult = contractMetaRes;
    accessControlResult = accessControlRes;
    contractTypeResult = contractTypeRes;
    nftInfoResult = nftInfoRes;
    vaultInfoResult = vaultInfoRes;
    eventsResult = eventsRes;
    storageResult = storageRes;
  } catch (e) {
    error = 'Error fetching contract data';
    console.error(e);
  }

  // Check if this is a verified contract from static data
  const verifiedContract = verifiedContracts.contracts.find(c => c.id === id);

  // Get detected contract type
  const detectedType = contractTypeResult?.status === 'fulfilled' ? contractTypeResult.value : null;

  // Build enhanced contract data object
  const contractData = {
    id,
    account,
    tokenMetadata,
    verifiedContract,
    isVerified: !!verifiedContract || (verificationResult?.status === 'fulfilled' && verificationResult.value?.isVerified),
    type: detectedType || verifiedContract?.type || (tokenMetadata?.isSAC ? 'token' : tokenMetadata ? 'token' : 'contract'),
    // New enhanced fields
    verification: verificationResult?.status === 'fulfilled' ? toContractVerification(verificationResult.value) : null,
    contractMetadata: contractMetaResult?.status === 'fulfilled' ? contractMetaResult.value : null,
    accessControl: accessControlResult?.status === 'fulfilled' ? accessControlResult.value : null,
    nftInfo: nftInfoResult?.status === 'fulfilled' ? nftInfoResult.value : null,
    vaultInfo: vaultInfoResult?.status === 'fulfilled' ? vaultInfoResult.value : null,
    events: eventsResult?.status === 'fulfilled' ? eventsResult.value : [],
    eventSummary: eventsResult?.status === 'fulfilled' ? getEventSummary(eventsResult.value) : null,
    storage: storageResult?.status === 'fulfilled' ? storageResult.value : null,
  };

  // If we couldn't fetch any data, show error
  if (error && !account && !tokenMetadata) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Contract Not Found</h1>
        <p className="text-slate-500 mb-6 text-center">This contract may not exist or has not been deployed yet.</p>
        <p className="text-slate-400 font-mono text-sm mb-8 break-all max-w-lg text-center">{id}</p>
        <Link
          href="/"
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="hidden lg:block">
        <ContractDesktopView
          contract={contractData}
          operations={operations}
        />
      </div>
      <div className="block lg:hidden">
        <ContractMobileView
          contract={contractData}
          operations={operations}
        />
      </div>
    </>
  );
}
