import {
  DEFAULT_NETWORK,
  NETWORK_COOKIE_NAME,
  NETWORK_STORAGE_KEY,
  isNetworkType,
  type NetworkType,
} from './config';

let currentNetwork: NetworkType = DEFAULT_NETWORK;

if (typeof window !== 'undefined') {
  const stored = localStorage.getItem(NETWORK_STORAGE_KEY);
  if (stored && isNetworkType(stored)) {
    currentNetwork = stored;
  }
}

export function getCurrentNetwork(): NetworkType {
  return currentNetwork;
}

export function setCurrentNetwork(network: NetworkType): void {
  currentNetwork = network;
}

export function getStoredNetwork(): NetworkType | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(NETWORK_STORAGE_KEY);
  return stored && isNetworkType(stored) ? stored : null;
}

export function persistNetwork(network: NetworkType): void {
  setCurrentNetwork(network);
  if (typeof window === 'undefined') return;
  localStorage.setItem(NETWORK_STORAGE_KEY, network);
  document.cookie = `${NETWORK_COOKIE_NAME}=${network};path=/;max-age=31536000`;
}
