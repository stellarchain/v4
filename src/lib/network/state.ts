import {
  DEFAULT_NETWORK,
  NETWORK_COOKIE_NAME,
  NETWORK_STORAGE_KEY,
  getForcedNetworkFromHostname,
  isNetworkType,
  type NetworkType,
} from './config';

let currentNetwork: NetworkType = DEFAULT_NETWORK;

if (typeof window !== 'undefined') {
  const forced = getForcedNetworkFromHostname(window.location.hostname);
  if (forced) {
    currentNetwork = forced;
  } else {
    const stored = localStorage.getItem(NETWORK_STORAGE_KEY);
    if (stored && isNetworkType(stored)) {
      currentNetwork = stored;
    }
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
  const forced = getForcedNetworkFromHostname(window.location.hostname);
  if (forced) return forced;
  const stored = localStorage.getItem(NETWORK_STORAGE_KEY);
  return stored && isNetworkType(stored) ? stored : null;
}

export function persistNetwork(network: NetworkType): void {
  const forced = typeof window !== 'undefined' ? getForcedNetworkFromHostname(window.location.hostname) : null;
  const value = forced || network;
  setCurrentNetwork(value);
  if (typeof window === 'undefined') return;
  localStorage.setItem(NETWORK_STORAGE_KEY, value);
  document.cookie = `${NETWORK_COOKIE_NAME}=${value};path=/;max-age=31536000`;
}
