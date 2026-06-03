/**
 * @template T
 * @param {T & { issuer?: string | null }} assetDetails
 * @param {Map<string, unknown>} labels
 * @returns {T & { issuerLabel?: unknown }}
 */
export function attachIssuerLabel(assetDetails, labels) {
  if (!assetDetails?.issuer) {
    return assetDetails;
  }

  const issuerLabel = labels.get(assetDetails.issuer);
  if (!issuerLabel) {
    return assetDetails;
  }

  return { ...assetDetails, issuerLabel };
}
