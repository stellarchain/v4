import type { TokenRegistryEntry } from '../shared/interfaces';

export const VERIFIED_ISSUED_ASSET_TOKENS: Record<string, TokenRegistryEntry> = {
  'CBSJZEIO5C7KC2SF3MKSNXXJSW5G3VTNBX4ATMKUI3B2MR4JKM4R26YF': {
    contractId: 'CBSJZEIO5C7KC2SF3MKSNXXJSW5G3VTNBX4ATMKUI3B2MR4JKM4R26YF',
    name: 'USDT0',
    symbol: 'USDT0',
    decimals: 7,
    isSAC: true,
    underlyingAsset: {
      code: 'USDT0',
      issuer: 'GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q',
    },
    lastFetched: Date.now(),
    fetchedFromRPC: false,
    verified: true,
    domain: 'usdt0.to',
    iconUrl: '/usdt0-icon.svg',
    description: 'USDT0 is the omnichain deployment of Tether\'s USDT.',
    category: 'token',
  },
};

export type VerifiedIssuedAssetMetadata = {
  name?: string;
  description?: string;
  image?: string;
  homeUrl?: string;
  orgLogo?: string;
  homeDomain?: string;
  verified?: boolean;
};

export function getVerifiedIssuedAssetToken(
  code: string,
  issuer: string,
  network: string = 'mainnet'
): TokenRegistryEntry | null {
  if (String(network || '').trim().toLowerCase() !== 'mainnet') {
    return null;
  }

  const assetCode = String(code || '');
  const assetIssuer = String(issuer || '');

  return Object.values(VERIFIED_ISSUED_ASSET_TOKENS).find((token) =>
    token.verified === true
    && token.underlyingAsset?.code === assetCode
    && token.underlyingAsset.issuer === assetIssuer
  ) || null;
}

export function resolveVerifiedIssuedAssetMetadata(
  code: string,
  issuer: string,
  network: string,
  primaryMetadata: VerifiedIssuedAssetMetadata = {}
): VerifiedIssuedAssetMetadata {
  const verifiedToken = getVerifiedIssuedAssetToken(code, issuer, network);
  if (!verifiedToken) {
    return primaryMetadata;
  }

  return {
    name: primaryMetadata.name || verifiedToken.name,
    description: primaryMetadata.description || verifiedToken.description,
    image: verifiedToken.iconUrl || primaryMetadata.image,
    homeUrl: primaryMetadata.homeUrl || (verifiedToken.domain ? `https://${verifiedToken.domain}` : undefined),
    orgLogo: primaryMetadata.orgLogo,
    homeDomain: primaryMetadata.homeDomain || verifiedToken.domain,
    verified: primaryMetadata.verified ?? verifiedToken.verified === true,
  };
}
