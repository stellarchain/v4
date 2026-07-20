export const DEFAULT_ISSUED_ASSETS_PAGE_SIZE = 50;

/**
 * @param {unknown} address
 * @param {number} itemsPerPage
 * @returns {{ issuer: string, itemsPerPage: number, page: number }}
 */
export function buildIssuedAssetsFilters(address, itemsPerPage = DEFAULT_ISSUED_ASSETS_PAGE_SIZE) {
  return {
    issuer: String(address || '').trim().toUpperCase(),
    itemsPerPage,
    page: 1,
  };
}

function toFiniteNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sumNumericObjectValues(value) {
  if (!value || typeof value !== 'object') {
    return 0;
  }

  return Object.values(value).reduce((sum, item) => sum + toFiniteNumber(item), 0);
}

/**
 * @param {Record<string, unknown>} record
 * @param {string} issuer
 * @param {{name?: string, image?: string}} metadata
 */
export function mapHorizonAssetRecordToIssuedAsset(record, issuer, metadata = {}) {
  const code = String(record.asset_code || record.code || 'UNKNOWN');
  const assetIssuer = String(record.asset_issuer || record.issuer || issuer || '');
  const supply = toFiniteNumber(record.amount) || sumNumericObjectValues(record.balances);
  const holders = sumNumericObjectValues(record.accounts);

  return {
    rank: 0,
    code,
    issuer: assetIssuer,
    name: metadata.name || code,
    image: metadata.image,
    price_usd: 0,
    price_xlm: 0,
    change_1h: 0,
    change_24h: 0,
    change_7d: 0,
    volume_24h: 0,
    market_cap: 0,
    circulating_supply: supply,
    sparkline: [],
    holders,
  };
}

/**
 * @param {boolean} issuedAssetsFetched
 * @param {unknown[]} issuedAssets
 */
export function shouldShowIssuedAssetsTab(issuedAssetsFetched, issuedAssets) {
  return issuedAssetsFetched && Array.isArray(issuedAssets) && issuedAssets.length > 0;
}
