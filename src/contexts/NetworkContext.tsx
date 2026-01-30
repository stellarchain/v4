'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

export type NetworkType = 'mainnet' | 'testnet' | 'futurenet';

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
    horizonUrl: 'https://horizon.stellar.org',
    rpcUrl: 'https://soroban-rpc.mainnet.stellar.gateway.fm',
    passphrase: 'Public Global Stellar Network ; September 2015',
    color: '#22c55e', // green
  },
  testnet: {
    name: 'testnet',
    displayName: 'Testnet',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    rpcUrl: 'https://soroban-testnet.stellar.org',
    passphrase: 'Test SDF Network ; September 2015',
    friendbotUrl: 'https://friendbot.stellar.org',
    color: '#f59e0b', // amber
  },
  futurenet: {
    name: 'futurenet',
    displayName: 'Futurenet',
    horizonUrl: 'https://horizon-futurenet.stellar.org',
    rpcUrl: 'https://rpc-futurenet.stellar.org',
    passphrase: 'Test SDF Future Network ; October 2022',
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

const STORAGE_KEY = 'stellarchain-network';

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetworkState] = useState<NetworkType>('mainnet');
  const [mounted, setMounted] = useState(false);
  const [isChangingNetwork, setIsChangingNetwork] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check localStorage for saved network preference
    const stored = localStorage.getItem(STORAGE_KEY) as NetworkType | null;
    if (stored && NETWORK_CONFIGS[stored]) {
      setNetworkState(stored);
      // Sync with stellar.ts and soroban.ts
      syncNetworkModules(stored);
      // Also set cookie for server-side reading
      document.cookie = `stellarchain-network=${stored};path=/;max-age=31536000`;
    }
  }, []);

  const syncNetworkModules = async (newNetwork: NetworkType) => {
    // Dynamically import and set network in both modules
    const [stellar, soroban] = await Promise.all([
      import('@/lib/stellar'),
      import('@/lib/soroban'),
    ]);
    stellar.setNetwork(newNetwork);
    soroban.setNetwork(newNetwork);
  };

  const setNetwork = useCallback(async (newNetwork: NetworkType) => {
    if (newNetwork === network) return;

    setIsChangingNetwork(true);

    // Update state
    setNetworkState(newNetwork);

    // Persist to localStorage
    localStorage.setItem(STORAGE_KEY, newNetwork);

    // Set cookie for server-side reading
    document.cookie = `stellarchain-network=${newNetwork};path=/;max-age=31536000`;

    // Sync with stellar.ts and soroban.ts modules
    await syncNetworkModules(newNetwork);

    // Small delay to allow UI to update before potential page refresh
    setTimeout(() => {
      setIsChangingNetwork(false);
      // Reload the page to fetch fresh data for the new network
      window.location.reload();
    }, 100);
  }, [network]);

  // Prevent flash during hydration
  if (!mounted) {
    return null;
  }

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
