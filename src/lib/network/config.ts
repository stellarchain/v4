import { Networks } from '@stellar/stellar-sdk';

export type NetworkType = 'mainnet' | 'testnet' | 'futurenet';

export const DEFAULT_NETWORK: NetworkType = 'mainnet';
export const NETWORK_STORAGE_KEY = 'stellarchain-network';
export const NETWORK_COOKIE_NAME = 'stellarchain-network';

export const HORIZON_URLS: Record<NetworkType, string> = {
  mainnet: 'https://horizon.stellar.org',
  testnet: 'https://horizon-testnet.stellar.org',
  futurenet: 'https://horizon-futurenet.stellar.org',
};

export const SOROBAN_RPC_URLS: Record<NetworkType, string> = {
  mainnet: 'https://soroban-rpc.mainnet.stellar.gateway.fm',
  testnet: 'https://soroban-testnet.stellar.org',
  futurenet: 'https://rpc-futurenet.stellar.org',
};

export const NETWORK_PASSPHRASES: Record<NetworkType, string> = {
  mainnet: Networks.PUBLIC,
  testnet: Networks.TESTNET,
  futurenet: 'Test SDF Future Network ; October 2022',
};

export const SOROBAN_SIMULATION_SOURCE = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
export const SOROBAN_SIMULATION_TIMEOUT = 30;

export function isNetworkType(value: string): value is NetworkType {
  return value in HORIZON_URLS;
}

export function getForcedNetworkFromHostname(hostname: string): NetworkType | null {
  const host = String(hostname || '').toLowerCase();
  if (host.startsWith('testnet.')) return 'testnet';
  if (host.startsWith('futurenet.')) return 'futurenet';
  return null;
}
