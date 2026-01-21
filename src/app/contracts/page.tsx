import verifiedContracts from '@/data/verified-contracts.json';
import { fetchContracts, APIContract } from '@/lib/stellar';
import ContractsClient from './ContractsClient';

export const revalidate = 60; // Revalidate every minute

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

  return {
    id: apiContract.contract_id,
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

export default async function ContractsPage() {
  // Fetch first page of contracts from API
  const initialData = await fetchContracts(1, 30);

  // Transform API contracts to display format
  const contracts = initialData.data.map(transformContract);

  // Calculate stats from current page (will be approximate for now)
  const stats = {
    total: initialData.total,
    active: contracts.filter(c => c.operationCount > 0).length,
    tokens: contracts.filter(c => c.type === 'token').length,
    dex: contracts.filter(c => c.type === 'dex').length,
    verified: contracts.filter(c => c.verified).length,
  };

  // Pagination info
  const pagination = {
    currentPage: initialData.current_page,
    totalPages: initialData.last_page,
    total: initialData.total,
    perPage: initialData.per_page,
  };

  return (
    <ContractsClient
      contracts={contracts}
      stats={stats}
      categories={verifiedContracts.categories}
      pagination={pagination}
    />
  );
}
