import axios from 'axios';

export const API_BASE_URL = 'https://localhost';
export const API_V1_BASE_URL = `${API_BASE_URL}/v1`;
export const DEFAULT_API_NETWORK = 'mainnet';

const withDefaultNetworkParam = (params = {}) => {
  if (Object.prototype.hasOwnProperty.call(params, 'network')) {
    return params;
  }
  return { ...params, network: DEFAULT_API_NETWORK };
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

const ensureNetworkInPath = (path) => {
  const [baseWithQuery, hash = ''] = String(path).split('#');
  if (baseWithQuery.includes('network=')) {
    return hash ? `${baseWithQuery}#${hash}` : baseWithQuery;
  }
  const separator = baseWithQuery.includes('?') ? '&' : '?';
  const next = `${baseWithQuery}${separator}network=${DEFAULT_API_NETWORK}`;
  return hash ? `${next}#${hash}` : next;
};

export const apiEndpoints = {
  coins: {
    stellar: (params) => withQuery('/api/coins/stellar', params),
  },
  v1: {
    accounts: (params) => withQuery('/accounts', params),
    accountById: (accountId, params) => withQuery(`/accounts/${accountId}`, params),
    contracts: (params) => withQuery('/contracts', params),
    contractById: (contractId, params) => withQuery(`/contracts/${contractId}`, params),
    assets: (params) => withQuery('/assets', params),
    assetById: (assetId, params) => withQuery(`/assets/${assetId}`, params),
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

export const fetchStellarCoinData = async () => {
  return getApiData(apiEndpoints.coins.stellar());
};

export const buildApiUrl = (path) => `${API_BASE_URL}${ensureNetworkInPath(path)}`;
export const buildApiV1Url = (path) => `${API_V1_BASE_URL}${ensureNetworkInPath(path)}`;
