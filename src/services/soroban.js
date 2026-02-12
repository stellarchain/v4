import { rpc } from '@stellar/stellar-sdk';
import { DEFAULT_NETWORK, NETWORK_PASSPHRASES, SOROBAN_RPC_URLS } from '@/lib/network/config';
import { getCurrentNetwork } from '@/lib/network/state';

export const getSorobanNetwork = (network) => network || getCurrentNetwork() || DEFAULT_NETWORK;

export const getSorobanRpcUrl = (network) => SOROBAN_RPC_URLS[getSorobanNetwork(network)];

export const getSorobanPassphrase = (network) => NETWORK_PASSPHRASES[getSorobanNetwork(network)];

export const createSorobanServer = (network) =>
  new rpc.Server(getSorobanRpcUrl(network), {
    allowHttp: false,
  });
