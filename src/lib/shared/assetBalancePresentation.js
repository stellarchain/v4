/**
 * @param {unknown} code
 * @param {unknown} issuer
 */
export function buildBalanceAssetKey(code, issuer) {
  return `${String(code || '')}:${String(issuer || '')}`;
}

/**
 * @template T, R
 * @param {T[]} requests
 * @param {(request: T) => Promise<R>} load
 * @param {(result: R, request: T) => void | Promise<void>} publish
 * @param {number} concurrency
 */
export async function runBalanceAssetRequests(requests, load, publish, concurrency = 4) {
  const workerCount = Math.min(requests.length, Math.max(1, Math.floor(concurrency)));
  let nextIndex = 0;

  const runWorker = async () => {
    while (nextIndex < requests.length) {
      const request = requests[nextIndex];
      nextIndex += 1;
      const result = await load(request);
      await publish(result, request);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
}

/**
 * @param {{domain?: unknown, issuer?: unknown, assetType?: unknown}} asset
 * @param {(issuer: string) => string} shortenIssuer
 */
export function buildBalanceAssetSubtitle(asset, shortenIssuer) {
  const domain = String(asset.domain || '');
  const issuer = String(asset.issuer || '');
  const identity = [domain, issuer ? shortenIssuer(issuer) : ''].filter(Boolean).join(' · ');

  return identity || String(asset.assetType || '');
}

/**
 * @param {{asset_type?: unknown, asset_code?: unknown, asset_issuer?: unknown}} balance
 * @param {{code?: unknown, issuer?: unknown, name?: unknown, image?: unknown, verified?: unknown, domain?: unknown} | null | undefined} details
 */
export function buildBalanceAssetPresentation(balance, details) {
  const code = String(details?.code || balance.asset_code || 'LP');
  const issuer = String(details?.issuer || balance.asset_issuer || '');

  return {
    code,
    issuer,
    name: String(details?.name || code),
    image: details?.image ? String(details.image) : undefined,
    verified: details?.verified === true,
    domain: details?.domain ? String(details.domain) : undefined,
    assetType: String(balance.asset_type || '').replace(/_/g, ' '),
  };
}
