'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import verifiedContracts from '@/data/verified-contracts.json';
import { APIContract } from '@/lib/stellar';
import ContractsClient from './ContractsClient';
import ContractDetailsClientPage from '@/app/contract/[id]/client-page';
import { StrKey } from '@stellar/stellar-sdk';
import { getDetailRouteValue } from '@/lib/routeDetail';
import { isContractAddress } from '@/lib/soroban';

// Convert hex contract ID to StrKey format (C...)
function hexToContractStrKey(hexId: string): string {
  try {
    // If already in StrKey format (starts with C and is 56 chars), return as is
    if (hexId.startsWith('C') && hexId.length === 56) {
      return hexId;
    }
    // Convert hex to buffer and encode as contract strkey
    const buffer = Buffer.from(hexId, 'hex');
    return StrKey.encodeContract(buffer);
  } catch (e) {
    console.error('Failed to convert contract ID:', e);
    return hexId; // Return original if conversion fails
  }
}

// Enhanced contract interface for display
export interface EnhancedContract {
  id: string;
  name: string;
  type: string;
  symbol?: string;
  description?: string;
  verified: boolean;
  sep41?: boolean;
  website?: string;
  operationCount: number;
  lastActivity?: string;
  functions?: string[];
  wasmId?: string;
  createdAt?: string;
  createTxHash?: string;
}

interface ContractsAPIResponse {
  '@context': string;
  '@id': string;
  '@type': string;
  totalItems: number;
  member: APIContract[];
  view?: {
    '@type': string;
    first?: string;
    last?: string;
    next?: string;
    previous?: string;
  };
}

// Transform API contract to display format
function transformContract(apiContract: APIContract): EnhancedContract {
  // Check if this is a verified contract from static data
  const verifiedContract = verifiedContracts.contracts.find(
    c => c.id.toLowerCase() === apiContract.contractId.toLowerCase()
  );

  // Determine contract type
  let type = 'contract';
  if (apiContract.sac || apiContract.assetCode) {
    type = 'token';
  } else if (verifiedContract?.type) {
    type = verifiedContract.type;
  }

  // Build name from various sources
  let name = 'Unknown Contract';
  if (verifiedContract?.name) {
    name = verifiedContract.name;
  } else if (apiContract.assetCode) {
    name = apiContract.assetCode;
  }

  // Use contractId directly (already in StrKey format from API)
  const contractId = apiContract.contractId;

  return {
    id: contractId,
    name,
    type,
    symbol: apiContract.assetCode || verifiedContract?.symbol,
    description: verifiedContract?.description,
    verified: apiContract.sourceCodeVerified || verifiedContract?.verified || false,
    sep41: apiContract.sac || !!apiContract.assetCode || verifiedContract?.sep41,
    website: verifiedContract?.website,
    operationCount: apiContract.totalTransactions || 0,
    lastActivity: apiContract.createdAt,
    wasmId: apiContract.wasmId || undefined,
    createdAt: apiContract.createdAt,
    createTxHash: undefined, // Not available in new API
  };
}

// Fetch contracts from Stellarchain API
async function fetchContracts(
  page: number = 1,
  perPage: number = 30
): Promise<ContractsAPIResponse> {
  try {
    const url = `https://api.stellarchain.dev/v1/contracts?page=${page}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: { 'Accept': 'application/ld+json' },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Failed to fetch contracts: ${response.status}`);
    }

    const data = await response.json();

    return {
      '@context': data['@context'] || '',
      '@id': data['@id'] || '',
      '@type': data['@type'] || '',
      totalItems: data.totalItems || 0,
      member: data.member || [],
      view: data.view,
    };
  } catch (error) {
    console.error('Error fetching contracts:', error);
    return {
      '@context': '',
      '@id': '',
      '@type': '',
      totalItems: 0,
      member: [],
    };
  }
}

export default function ContractsPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const detailsContractId = getDetailRouteValue({
    pathname,
    searchParams,
    queryKey: 'id',
    aliases: ['/contracts'],
  });
  const hasDetailsRoute = Boolean(detailsContractId);

  const [contracts, setContracts] = useState<EnhancedContract[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    contracts: 0,
    tokens: 0,
    verified: 0,
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    perPage: 30,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasDetailsRoute) return;

    const loadContracts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch first 3 pages to get accurate stats (90 contracts sample)
        const [page1, page2, page3] = await Promise.all([
          fetchContracts(1, 30),
          fetchContracts(2, 30),
          fetchContracts(3, 30),
        ]);

        // Transform all contracts for stats calculation
        const allSampleContracts = [
          ...page1.member,
          ...page2.member,
          ...page3.member,
        ]
          .filter(c => isContractAddress(c.contractId))
          .map(transformContract);

        // Calculate stats from the larger sample (90 contracts)
        const calculatedStats = {
          total: page1.totalItems,
          tokens: allSampleContracts.filter(c => c.type === 'token').length,
          contracts: allSampleContracts.filter(c => c.type !== 'token').length,
          verified: allSampleContracts.filter(c => c.verified).length,
        };

        // Only display first page contracts initially
        const transformedContracts = page1.member
          .filter(c => isContractAddress(c.contractId))
          .map(transformContract);

        // Calculate total pages (assuming 30 items per page)
        const itemsPerPage = 30;
        const totalPages = Math.ceil(page1.totalItems / itemsPerPage);

        // Pagination info
        const paginationInfo = {
          currentPage: 1,
          totalPages: totalPages,
          total: page1.totalItems,
          perPage: itemsPerPage,
        };

        setContracts(transformedContracts);
        setStats(calculatedStats);
        setPagination(paginationInfo);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load contracts.');
      } finally {
        setIsLoading(false);
      }
    };

    loadContracts();
  }, [hasDetailsRoute]);

  if (hasDetailsRoute) {
    return <ContractDetailsClientPage />;
  }

  if (!isLoading && error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <h1 className="text-2xl font-bold mb-2">Error</h1>
        <p className="text-muted">{error}</p>
      </div>
    );
  }

  return (
    <ContractsClient
      contracts={contracts}
      stats={stats}
      categories={verifiedContracts.categories}
      pagination={pagination}
      loading={isLoading}
    />
  );
}
