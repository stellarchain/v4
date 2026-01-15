import Link from 'next/link';
import verifiedContracts from '@/data/verified-contracts.json';
import { shortenAddress, getActiveContracts, ActiveContract } from '@/lib/stellar';
import { getTokenMetadata } from '@/lib/tokenRegistry';
import ContractsClient from './ContractsClient';

export const revalidate = 60; // Revalidate every minute

// Combine verified contracts with active contracts
interface EnhancedContract {
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
}

async function getEnhancedContracts(): Promise<EnhancedContract[]> {
  // Fetch active contracts from Horizon (scan up to 5000 contract operations)
  const activeContracts = await getActiveContracts(5000);

  // Create a map of verified contracts for quick lookup
  const verifiedMap = new Map<string, typeof verifiedContracts.contracts[0]>();
  for (const contract of verifiedContracts.contracts) {
    verifiedMap.set(contract.id, contract);
  }

  // Create a map to track all contracts
  const contractMap = new Map<string, EnhancedContract>();

  // Add active contracts first (they have activity data)
  for (const active of activeContracts) {
    const verified = verifiedMap.get(active.contractId);

    contractMap.set(active.contractId, {
      id: active.contractId,
      name: verified?.name || 'Unknown Contract',
      type: verified?.type || 'contract',
      symbol: verified?.symbol,
      description: verified?.description,
      verified: verified?.verified || false,
      sep41: verified?.sep41,
      website: verified?.website,
      operationCount: active.operationCount,
      lastActivity: active.lastActivity,
      functions: active.functions,
    });
  }

  // Add verified contracts that aren't in active list
  for (const verified of verifiedContracts.contracts) {
    if (!contractMap.has(verified.id)) {
      contractMap.set(verified.id, {
        id: verified.id,
        name: verified.name,
        type: verified.type,
        symbol: verified.symbol,
        description: verified.description,
        verified: verified.verified,
        sep41: verified.sep41,
        website: verified.website,
        operationCount: 0,
        lastActivity: undefined,
        functions: [],
      });
    }
  }

  // Try to fetch metadata for unknown contracts
  const unknownContracts = Array.from(contractMap.values()).filter(c => c.name === 'Unknown Contract');

  // Fetch metadata in parallel (limit to 10 to avoid rate limiting)
  const metadataPromises = unknownContracts.slice(0, 10).map(async (contract) => {
    try {
      const metadata = await getTokenMetadata(contract.id);
      if (metadata) {
        return { id: contract.id, metadata };
      }
    } catch {
      // Ignore errors
    }
    return null;
  });

  const metadataResults = await Promise.all(metadataPromises);

  // Update contracts with fetched metadata
  for (const result of metadataResults) {
    if (result && result.metadata) {
      const contract = contractMap.get(result.id);
      if (contract && contract.name === 'Unknown Contract') {
        contract.name = result.metadata.name || result.metadata.symbol || 'Unknown Contract';
        contract.symbol = result.metadata.symbol;
        contract.type = 'token';
        contract.sep41 = true;
      }
    }
  }

  // Convert to array and sort by operation count
  const contracts = Array.from(contractMap.values());
  contracts.sort((a, b) => b.operationCount - a.operationCount);

  return contracts;
}

export default async function ContractsPage() {
  const contracts = await getEnhancedContracts();

  // Calculate stats
  const stats = {
    total: contracts.length,
    active: contracts.filter(c => c.operationCount > 0).length,
    tokens: contracts.filter(c => c.type === 'token').length,
    dex: contracts.filter(c => c.type === 'dex').length,
    verified: contracts.filter(c => c.verified).length,
  };

  return <ContractsClient contracts={contracts} stats={stats} categories={verifiedContracts.categories} />;
}
