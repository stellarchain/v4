import axios from 'axios';
import { DEFAULT_NETWORK } from '@/lib/network/config';
import { getCurrentNetwork } from '@/lib/network/state';

const appEnv = (process.env.NEXT_PUBLIC_ENV || '').toLowerCase();

const resolveApiBaseUrl = () => {
  if (appEnv === 'development') {
    return 'https://localhost';
  }
  if (appEnv === 'staging') {
    return 'https://stellarchain.dev';
  }
  if (appEnv === 'prod' || appEnv === 'production') {
    return 'http://stellarchain.io';
  }
  return 'https://api.stellarchain.dev';
};

export const API_BASE_URL = resolveApiBaseUrl();
export const API_V1_BASE_URL = `${API_BASE_URL}/v1`;
export const DEFAULT_API_NETWORK = DEFAULT_NETWORK;

const getApiNetwork = () => getCurrentNetwork() || DEFAULT_API_NETWORK;

const withDefaultNetworkParam = (params = {}) => {
  if (Object.prototype.hasOwnProperty.call(params, 'network')) {
    return params;
  }
  return { ...params, network: getApiNetwork() };
};

const toQueryString = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    query.append(key, String(value));
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
};

const withQuery = (path, params) => `${path}${toQueryString(withDefaultNetworkParam(params || {}))}`;
const withPlainQuery = (path, params) => `${path}${toQueryString(params || {})}`;

const ensureNetworkInPath = (path) => {
  const [baseWithQuery, hash = ''] = String(path).split('#');
  if (baseWithQuery.includes('network=')) {
    return hash ? `${baseWithQuery}#${hash}` : baseWithQuery;
  }
  const separator = baseWithQuery.includes('?') ? '&' : '?';
  const next = `${baseWithQuery}${separator}network=${getApiNetwork()}`;
  return hash ? `${next}#${hash}` : next;
};

export const apiEndpoints = {
  coins: {
    stellar: (params) => withQuery('/api/coins/stellar', params),
  },
  v1: {
    orders: () => '/orders',
    orderById: (orderId) => `/orders/${orderId}`,
    accounts: (params) => withQuery('/accounts', params),
    accountById: (accountId, params) => withQuery(`/accounts/${accountId}`, params),
    contracts: (params) => withQuery('/contracts', params),
    contractById: (contractId, params) => withQuery(`/contracts/${contractId}`, params),
    contractTransactions: (contractId, params) => withQuery(`/contracts/${contractId}/transactions`, params),
    contractEvents: (contractId, params) => withQuery(`/contracts/${contractId}/events`, params),
    contractStorage: (contractId, params) => withQuery(`/contracts/${contractId}/storage`, params),
    marketAssets: (params) => withQuery('/market/assets', params),
    marketOverview: (params) => withQuery('/market/overview', params),
    assets: (params) => withQuery('/assets', params),
    assetById: (assetId, params) => withQuery(`/assets/${assetId}`, params),
    projects: (params) => withPlainQuery('/projects', params),
    projectById: (projectId, params) => withPlainQuery(`/projects/${projectId}`, params),
    projectCategories: () => '/projects/categories',
  },
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Accept': 'application/ld+json',
  },
});

export const apiV1Client = axios.create({
  baseURL: API_V1_BASE_URL,
  headers: {
    'Accept': 'application/ld+json',
  },
});

export async function getApiData(path, config = {}) {
  const response = await apiClient.get(path, config);
  return response.data;
}

export async function getApiV1Data(path, config = {}) {
  const response = await apiV1Client.get(path, config);
  return response.data;
}

export async function postApiV1Data(path, data = {}, config = {}) {
  const response = await apiV1Client.post(path, data, config);
  return response.data;
}

export async function patchApiV1Data(path, data = {}, config = {}) {
  const response = await apiV1Client.patch(path, data, config);
  return response.data;
}

export const fetchStellarCoinData = async () => {
  return getApiData(apiEndpoints.coins.stellar());
};

export const fetchMarketOverviewData = async (params) => {
  return getApiV1Data(apiEndpoints.v1.marketOverview(params));
};

export const buildApiUrl = (path) => `${API_BASE_URL}${ensureNetworkInPath(path)}`;
export const buildApiV1Url = (path) => `${API_V1_BASE_URL}${ensureNetworkInPath(path)}`;
