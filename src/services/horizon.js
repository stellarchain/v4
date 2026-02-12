import { Horizon } from '@stellar/stellar-sdk';
import { DEFAULT_NETWORK, HORIZON_URLS } from '@/lib/network/config';
import { getCurrentNetwork } from '@/lib/network/state';

export const getHorizonNetwork = (network) => network || getCurrentNetwork() || DEFAULT_NETWORK;

export const getHorizonBaseUrl = (network) => HORIZON_URLS[getHorizonNetwork(network)];

export const createHorizonServer = (network) => new Horizon.Server(getHorizonBaseUrl(network));
