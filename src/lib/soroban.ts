// Soroban RPC Client for SEP-0041 Token Queries
// https://developers.stellar.org/docs/data/rpc

import { rpc, xdr, Address, Networks, Asset, Contract, nativeToScVal, scValToNative, Account, TransactionBuilder, BASE_FEE } from '@stellar/stellar-sdk';
import type { SEP41TokenMetadata, SACDetectionResult } from './types/token';

// RPC Configuration
const SOROBAN_RPC_URLS = {
  mainnet: 'https://soroban-rpc.mainnet.stellar.gateway.fm',
  testnet: 'https://soroban-rpc.testnet.stellar.gateway.fm',
};

const RPC_TIMEOUT_MS = 10000;

type NetworkType = 'mainnet' | 'testnet';

let currentNetwork: NetworkType = 'mainnet';

// Get the current network
export function getNetwork(): NetworkType {
  return currentNetwork;
}

// Set the network
export function setNetwork(network: NetworkType): void {
  currentNetwork = network;
}

// Get RPC server instance
export function getSorobanServer(network?: NetworkType): rpc.Server {
  const net = network || currentNetwork;
  return new rpc.Server(SOROBAN_RPC_URLS[net], {
    allowHttp: false,
  });
}

// Get network passphrase
function getNetworkPassphrase(network?: NetworkType): string {
  const net = network || currentNetwork;
  return net === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
}

// Check if RPC is healthy
export async function checkRpcHealth(): Promise<boolean> {
  try {
    const server = getSorobanServer();
    const health = await server.getHealth();
    return health.status === 'healthy';
  } catch (error) {
    console.error('Soroban RPC health check failed:', error);
    return false;
  }
}

// Simulate a contract call to read state
async function simulateContractRead(
  contractId: string,
  method: string,
  args: xdr.ScVal[] = []
): Promise<xdr.ScVal | null> {
  try {
    const server = getSorobanServer();
    const contract = new Contract(contractId);

    // Build the operation
    const operation = contract.call(method, ...args);

    // Create a minimal transaction for simulation
    // We use a dummy source account since we're just reading
    const sourceAccount = new Account(
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', // Dummy account
      '0'
    );

    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    // Simulate the transaction
    const response = await server.simulateTransaction(transaction);

    if (rpc.Api.isSimulationSuccess(response)) {
      // Extract the result from simulation
      const result = response.result;
      if (result?.retval) {
        return result.retval;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error simulating contract call ${method}:`, error);
    return null;
  }
}

// Query token name (SEP-0041)
export async function queryTokenName(contractId: string): Promise<string | null> {
  try {
    const result = await simulateContractRead(contractId, 'name');
    if (result) {
      return scValToNative(result) as string;
    }
    return null;
  } catch (error) {
    console.error('Error querying token name:', error);
    return null;
  }
}

// Query token symbol (SEP-0041)
export async function queryTokenSymbol(contractId: string): Promise<string | null> {
  try {
    const result = await simulateContractRead(contractId, 'symbol');
    if (result) {
      return scValToNative(result) as string;
    }
    return null;
  } catch (error) {
    console.error('Error querying token symbol:', error);
    return null;
  }
}

// Query token decimals (SEP-0041)
export async function queryTokenDecimals(contractId: string): Promise<number | null> {
  try {
    const result = await simulateContractRead(contractId, 'decimals');
    if (result) {
      return scValToNative(result) as number;
    }
    return null;
  } catch (error) {
    console.error('Error querying token decimals:', error);
    return null;
  }
}

// Query all token metadata at once
export async function queryTokenMetadata(contractId: string): Promise<SEP41TokenMetadata | null> {
  try {
    // Query all three in parallel
    const [name, symbol, decimals] = await Promise.all([
      queryTokenName(contractId),
      queryTokenSymbol(contractId),
      queryTokenDecimals(contractId),
    ]);

    // If we got at least symbol and decimals, consider it a valid token
    if (symbol !== null && decimals !== null) {
      return {
        contractId,
        name: name || symbol, // Fallback to symbol if name is null
        symbol,
        decimals,
        isSAC: false, // Will be detected separately
        lastFetched: Date.now(),
        fetchedFromRPC: true,
      };
    }

    return null;
  } catch (error) {
    console.error('Error querying token metadata:', error);
    return null;
  }
}

// Query token balance for an account
export async function queryTokenBalance(
  contractId: string,
  accountId: string
): Promise<bigint | null> {
  try {
    const addressScVal = new Address(accountId).toScVal();
    const result = await simulateContractRead(contractId, 'balance', [addressScVal]);

    if (result) {
      const balance = scValToNative(result);
      return BigInt(balance);
    }

    return null;
  } catch (error) {
    console.error('Error querying token balance:', error);
    return null;
  }
}

// Derive SAC (Stellar Asset Contract) ID from classic asset
export function deriveSACContractId(
  assetCode: string,
  assetIssuer: string,
  network?: NetworkType
): string {
  const passphrase = getNetworkPassphrase(network);
  const asset = new Asset(assetCode, assetIssuer);
  return asset.contractId(passphrase);
}

// Derive SAC for native XLM
export function deriveNativeSACContractId(network?: NetworkType): string {
  const passphrase = getNetworkPassphrase(network);
  const asset = Asset.native();
  return asset.contractId(passphrase);
}

// Check if a contract ID is a SAC for a known asset
export async function detectSAC(contractId: string): Promise<SACDetectionResult> {
  // First check if it matches known SAC patterns
  // SACs have specific metadata that matches their underlying asset

  try {
    const metadata = await queryTokenMetadata(contractId);

    if (!metadata) {
      return { isSAC: false, contractId };
    }

    // Check if this symbol matches a known classic asset
    // Common SAC patterns: symbol matches classic asset code
    // and name often contains "Stellar Asset Contract" or the asset name

    // Try to verify by deriving the SAC ID from the metadata
    // This is a heuristic - we check if the token behaves like a SAC
    const symbolUpper = metadata.symbol.toUpperCase();

    // Known SAC patterns
    const knownSACSymbols = ['USDC', 'XLM', 'AQUA', 'yUSDC', 'yXLM'];

    if (knownSACSymbols.includes(symbolUpper)) {
      return {
        isSAC: true,
        assetCode: metadata.symbol,
        contractId,
      };
    }

    return { isSAC: false, contractId };
  } catch (error) {
    console.error('Error detecting SAC:', error);
    return { isSAC: false, contractId };
  }
}

// Check if an address is a contract (starts with 'C')
export function isContractAddress(address: string): boolean {
  if (!address || address.length !== 56) return false;
  const upper = address.toUpperCase();
  return upper.startsWith('C');
}

// Normalize contract address to uppercase
export function normalizeContractAddress(address: string): string {
  return address.toUpperCase();
}

// Check if an address is an account (starts with 'G')
export function isAccountAddress(address: string): boolean {
  return address.startsWith('G') && address.length === 56;
}

// Get contract instance data (for advanced use)
export async function getContractData(
  contractId: string,
  key: xdr.ScVal
): Promise<rpc.Api.LedgerEntryResult | null> {
  try {
    const server = getSorobanServer();
    const contractAddress = new Address(contractId);

    const ledgerKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: contractAddress.toScAddress(),
        key,
        durability: xdr.ContractDataDurability.persistent(),
      })
    );

    const response = await server.getLedgerEntries(ledgerKey);

    if (response.entries && response.entries.length > 0) {
      return response.entries[0];
    }

    return null;
  } catch (error) {
    console.error('Error getting contract data:', error);
    return null;
  }
}

// Fetch transaction result meta XDR from Soroban RPC
// This is needed for decoding contract invocation traces
export async function getTransactionResultMetaXdr(
  txHash: string,
  network?: NetworkType
): Promise<{ resultMetaXdr: string | null; diagnosticEventsXdr?: string[] } | null> {
  try {
    const server = getSorobanServer(network);
    const response = await server.getTransaction(txHash);

    if ((response.status === 'SUCCESS' || response.status === 'FAILED') && response.resultMetaXdr) {
      const resultMetaXdr = response.resultMetaXdr.toXDR('base64');
      const diagnosticEventsXdr = response.diagnosticEventsXdr?.map(evt => evt.toXDR('base64'));
      return { resultMetaXdr, diagnosticEventsXdr };
    }

    return null;
  } catch (error) {
    console.error('Error fetching transaction result meta XDR:', error);
    return null;
  }
}

// Export types for use elsewhere
export type { NetworkType };
