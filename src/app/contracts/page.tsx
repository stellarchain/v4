'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import verifiedContracts from '@/data/verified-contracts.json';
import { APIContract } from '@/lib/stellar';
import ContractsClient from './ContractsClient';
import ContractDetailsClientPage from '@/app/contract/[id]/client-page';
import { StrKey } from '@stellar/stellar-sdk';
import { getDetailRouteValue } from '@/lib/routeDetail';

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
  current_page: number;
  total: number;
  per_page: number;
  last_page: number;
  data: APIContract[];
}

// Transform API contract to display format
function transformContract(apiContract: APIContract): EnhancedContract {
  // Check if this is a verified contract from static data
  const verifiedContract = verifiedContracts.contracts.find(
    c => c.id.toLowerCase() === apiContract.contract_id.toLowerCase()
  );

  // Determine contract type
  let type = 'contract';
  if (apiContract.contract_type === 1 || apiContract.asset_code) {
    type = 'token';
  } else if (verifiedContract?.type) {
    type = verifiedContract.type;
  }

  // Build name from various sources
  let name = 'Unknown Contract';
  if (verifiedContract?.name) {
    name = verifiedContract.name;
  } else if (apiContract.asset_code) {
    name = apiContract.asset_code;
  }

  // Convert hex contract ID to StrKey format
  const contractId = hexToContractStrKey(apiContract.contract_id);

  return {
    id: contractId,
    name,
    type,
    symbol: apiContract.asset_code || verifiedContract?.symbol,
    description: verifiedContract?.description,
    verified: apiContract.source_code_verified || verifiedContract?.verified || false,
    sep41: apiContract.contract_type === 1 || !!apiContract.asset_code || verifiedContract?.sep41,
    website: verifiedContract?.website,
    operationCount: apiContract.transactions_count || 0,
    lastActivity: apiContract.created_at,
    wasmId: apiContract.wasm_id || undefined,
    createdAt: apiContract.created_at,
    createTxHash: apiContract.create_transaction?.hash,
  };
}

// Fetch contracts from Stellarchain API
async function fetchContracts(
  page: number = 1,
  perPage: number = 20
): Promise<ContractsAPIResponse> {
  try {
    const url = `https://api.stellarchain.io/v1/contracts/env/public?page=${page}&paginate=${perPage}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Failed to fetch contracts: ${response.status}`);
    }

    const data = await response.json();

    return {
      current_page: data.current_page || 1,
      total: data.total || 0,
      per_page: data.per_page || perPage,
      last_page: data.last_page || 1,
      data: data.data || [],
    };
  } catch (error) {
    console.error('Error fetching contracts:', error);
    return {
      current_page: 1,
      total: 0,
      per_page: perPage,
      last_page: 1,
      data: [],
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
    active: 0,
    tokens: 0,
    dex: 0,
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
        // Fetch first page of contracts from API
        const initialData = await fetchContracts(1, 30);

        // Transform API contracts to display format
        const transformedContracts = initialData.data.map(transformContract);

        // Calculate stats from current page (will be approximate for now)
        const calculatedStats = {
          total: initialData.total,
          active: transformedContracts.filter(c => c.operationCount > 0).length,
          tokens: transformedContracts.filter(c => c.type === 'token').length,
          dex: transformedContracts.filter(c => c.type === 'dex').length,
          verified: transformedContracts.filter(c => c.verified).length,
        };

        // Pagination info
        const paginationInfo = {
          currentPage: initialData.current_page,
          totalPages: initialData.last_page,
          total: initialData.total,
          perPage: initialData.per_page,
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
