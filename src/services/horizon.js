import { Horizon } from '@stellar/stellar-sdk';
import { DEFAULT_NETWORK, HORIZON_URLS } from '@/lib/network/config';
import { getCurrentNetwork } from '@/lib/network/state';
import { ORION_BASE_URL } from './config';

export const getHorizonNetwork = (network) => network || getCurrentNetwork() || DEFAULT_NETWORK;

export const getHorizonBaseUrl = (network) => HORIZON_URLS[getHorizonNetwork(network)];

export const createHorizonServer = (network) => new Horizon.Server(getHorizonBaseUrl(network));

// Only transaction/ledger reads opt in; all other Horizon calls keep their provider.
export const createHistoryServer = (network) => {
  if (getHorizonNetwork(network) !== 'mainnet') return createHorizonServer(network);
  const server = new Horizon.Server(ORION_BASE_URL);
  server.httpClient.defaults.timeout = 20000;
  return server;
};

export const startAccountPaymentsStreamListener = ({
  accountId,
  network,
  cursor = 'now',
  onmessage,
  onerror,
  reconnectTimeout = 15000,
}) => {
  if (!accountId) {
    return () => {};
  }

  return createHorizonServer(network)
    .payments()
    .forAccount(accountId)
    .cursor(cursor)
    .stream({
      onmessage,
      onerror,
      reconnectTimeout,
    });
};
