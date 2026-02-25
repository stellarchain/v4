'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { HORIZON_URLS, NETWORK_PASSPHRASES, SOROBAN_RPC_URLS, type NetworkType } from '@/lib/network/config';
import { getStoredNetwork, persistNetwork } from '@/lib/network/state';
export type { NetworkType } from '@/lib/network/config';

export interface NetworkConfig {
  name: string;
  displayName: string;
  horizonUrl: string;
  rpcUrl: string;
  passphrase: string;
  friendbotUrl?: string;
  color: string;
}

export const NETWORK_CONFIGS: Record<NetworkType, NetworkConfig> = {
  mainnet: {
    name: 'mainnet',
    displayName: 'Mainnet',
    horizonUrl: HORIZON_URLS.mainnet,
    rpcUrl: SOROBAN_RPC_URLS.mainnet,
    passphrase: NETWORK_PASSPHRASES.mainnet,
    color: '#22c55e', // green
  },
  testnet: {
    name: 'testnet',
    displayName: 'Testnet',
    horizonUrl: HORIZON_URLS.testnet,
    rpcUrl: SOROBAN_RPC_URLS.testnet,
    passphrase: NETWORK_PASSPHRASES.testnet,
    friendbotUrl: 'https://friendbot.stellar.org',
    color: '#f59e0b', // amber
  },
  futurenet: {
    name: 'futurenet',
    displayName: 'Futurenet',
    horizonUrl: HORIZON_URLS.futurenet,
    rpcUrl: SOROBAN_RPC_URLS.futurenet,
    passphrase: NETWORK_PASSPHRASES.futurenet,
    friendbotUrl: 'https://friendbot-futurenet.stellar.org',
    color: '#8b5cf6', // purple
  },
};

interface NetworkContextType {
  network: NetworkType;
  networkConfig: NetworkConfig;
  setNetwork: (network: NetworkType) => void;
  isChangingNetwork: boolean;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetworkState] = useState<NetworkType>(() => getStoredNetwork() || 'mainnet');
  const [isChangingNetwork, setIsChangingNetwork] = useState(false);

  useEffect(() => {
    persistNetwork(network);
  }, [network]);

  const setNetwork = useCallback((newNetwork: NetworkType) => {
    if (newNetwork === network) return;

    setIsChangingNetwork(true);

    // Update state
    setNetworkState(newNetwork);

    // Small delay to allow UI to update before potential page refresh
    setTimeout(() => {
      setIsChangingNetwork(false);
      // Keep users on the same route when switching network.
      const currentUrl = window.location.pathname + window.location.search + window.location.hash;
      window.location.href = currentUrl;
    }, 100);
  }, [network]);

  const networkConfig = NETWORK_CONFIGS[network];

  return (
    <NetworkContext.Provider value={{ network, networkConfig, setNetwork, isChangingNetwork }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}

// Helper function to get current network config (for use outside React components)
export function getNetworkConfig(network: NetworkType): NetworkConfig {
  return NETWORK_CONFIGS[network];
}
