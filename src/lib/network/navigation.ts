import type { NetworkType } from './config';
import { persistNetwork } from './state';

const MAINNET_HOSTNAME = 'stellarchain.io';

function shouldRedirectToMainDomain(targetNetwork: NetworkType): boolean {
  if (typeof window === 'undefined' || targetNetwork !== 'mainnet') {
    return false;
  }

  const host = window.location.hostname.toLowerCase();
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost');

  return !isLocalHost && host !== MAINNET_HOSTNAME;
}

export function redirectToNetwork(
  targetNetwork: NetworkType,
  pathname: string,
  queryString = '',
  hash = ''
): void {
  persistNetwork(targetNetwork);

  if (typeof window === 'undefined') {
    return;
  }

  const query = queryString ? `?${queryString}` : '';
  const targetPath = `${pathname}${query}${hash}`;

  if (shouldRedirectToMainDomain(targetNetwork)) {
    window.location.href = `https://${MAINNET_HOSTNAME}${targetPath}`;
    return;
  }

  window.location.href = targetPath;
}
