import { Suspense } from 'react';
import { getTokenMetadata } from '@/lib/tokenRegistry';
import { isContractAddress, normalizeContractAddress } from '@/lib/soroban';
import type { ContractInvocation } from '@/lib/stellar';
import { getContractInvocations } from '@/lib/stellar';
import Link from 'next/link';
import verifiedContracts from '@/data/verified-contracts.json';
import { verifyContract, toContractVerification } from '@/lib/contractVerification';
import { getContractMetadata, getContractAccessControl, detectContractType, getContractSpec } from '@/lib/contractMetadata';
import { getNFTInfo, getVaultInfo } from '@/lib/contractExtensions';
import { getContractEvents, getEventSummary, ParsedEvent } from '@/lib/eventParser';
import { getContractStorage, ContractStorageResult } from '@/lib/contractStorage';
import ContractPageClient from '@/components/contract/ContractPageClient';
import { ContractHeaderSkeleton, ContractEventsSkeleton, ContractInvocationsSkeleton, ContractStorageSkeleton } from '@/components/mobile/skeletons/ContractSkeleton';

export const revalidate = 60;

interface ContractPageProps {
  params: Promise<{ id: string }>;
}

// ============ QUICK DATA (loads first) ============
async function getQuickContractData(id: string) {
  const [tokenMetadata, contractType, accessControl] = await Promise.all([
    getTokenMetadata(id).catch(() => null),
    detectContractType(id).catch(() => null),
    getContractAccessControl(id).catch(() => null),
  ]);

  const verifiedContract = verifiedContracts.contracts.find(c => c.id === id);

  return {
    id,
    tokenMetadata,
    verifiedContract,
    type: contractType || verifiedContract?.type || (tokenMetadata?.isSAC ? 'token' : tokenMetadata ? 'token' : 'contract'),
    accessControl,
    isVerified: !!verifiedContract,
  };
}

// ============ ASYNC DATA SECTIONS ============

// Events section
async function EventsData({ id }: { id: string }) {
  const events = await getContractEvents(id, 50).catch(() => [] as ParsedEvent[]);
  const eventSummary = getEventSummary(events);
  return { events, eventSummary };
}

async function EventsSection({ id }: { id: string }) {
  const data = await EventsData({ id });
  return (
    <script
      id="events-data"
      type="application/json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Invocations section
async function InvocationsData({ id }: { id: string }) {
  const invocations = await getContractInvocations(id, 50).catch(() => [] as ContractInvocation[]);
  return { invocations };
}

async function InvocationsSection({ id }: { id: string }) {
  const data = await InvocationsData({ id });
  return (
    <script
      id="invocations-data"
      type="application/json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Storage section
async function StorageData({ id }: { id: string }) {
  const storage = await getContractStorage(id).catch(() => null as ContractStorageResult | null);
  return { storage };
}

async function StorageSection({ id }: { id: string }) {
  const data = await StorageData({ id });
  return (
    <script
      id="storage-data"
      type="application/json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Spec & verification section
async function SpecData({ id }: { id: string }) {
  const [specRes, verificationRes, nftInfoRes, vaultInfoRes, contractMetaRes] = await Promise.allSettled([
    getContractSpec(id),
    verifyContract(id),
    getNFTInfo(id),
    getVaultInfo(id),
    getContractMetadata(id),
  ]);

  return {
    spec: specRes.status === 'fulfilled' ? specRes.value : null,
    verification: verificationRes.status === 'fulfilled' ? toContractVerification(verificationRes.value) : null,
    nftInfo: nftInfoRes.status === 'fulfilled' ? nftInfoRes.value : null,
    vaultInfo: vaultInfoRes.status === 'fulfilled' ? vaultInfoRes.value : null,
    contractMetadata: contractMetaRes.status === 'fulfilled' ? contractMetaRes.value : null,
  };
}

async function SpecSection({ id }: { id: string }) {
  const data = await SpecData({ id });
  return (
    <script
      id="spec-data"
      type="application/json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default async function ContractPage({ params }: ContractPageProps) {
  const { id: rawId } = await params;
  const id = normalizeContractAddress(rawId);

  // Validate contract ID format - instant, no API call
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

  // Get quick data first (header info)
  const quickData = await getQuickContractData(id);

  return (
    <>
      {/* Render client component with quick data */}
      <ContractPageClient quickData={quickData} />

      {/* Stream in heavy data sections - each loads independently */}
      <div className="hidden">
        <Suspense fallback={null}>
          <EventsSection id={id} />
        </Suspense>
        <Suspense fallback={null}>
          <InvocationsSection id={id} />
        </Suspense>
        <Suspense fallback={null}>
          <StorageSection id={id} />
        </Suspense>
        <Suspense fallback={null}>
          <SpecSection id={id} />
        </Suspense>
      </div>
    </>
  );
}
