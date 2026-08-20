import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getVerifiedIssuedAssetToken,
  resolveVerifiedIssuedAssetMetadata,
} from './verifiedIssuedAssets.ts';

const USDT0_ISSUER = 'GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q';

describe('verified issued asset registry', () => {
  it('returns the official USDT0 metadata for the exact code and issuer', () => {
    const token = getVerifiedIssuedAssetToken('USDT0', USDT0_ISSUER);

    assert.equal(token?.symbol, 'USDT0');
    assert.equal(token?.domain, 'usdt0.to');
    assert.equal(
      token?.iconUrl,
      'https://ipfs.io/ipfs/bafkreifaalohkkikosp27qp6qczwaffwseejvoaafkgv7ahyrqvejmpqou'
    );
  });

  it('does not return verified metadata for a lookalike issuer', () => {
    assert.equal(
      getVerifiedIssuedAssetToken('USDT0', 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'),
      null
    );
  });

  it('treats the Stellar asset identity as case-sensitive', () => {
    assert.equal(getVerifiedIssuedAssetToken('usdt0', USDT0_ISSUER), null);
    assert.equal(getVerifiedIssuedAssetToken('USDT0', USDT0_ISSUER.toLowerCase()), null);
  });

  it('does not apply mainnet verification on another network', () => {
    assert.equal(getVerifiedIssuedAssetToken('USDT0', USDT0_ISSUER, 'testnet'), null);
  });

  it('provides asset-page metadata when Horizon has no TOML link', () => {
    const metadata = resolveVerifiedIssuedAssetMetadata('USDT0', USDT0_ISSUER, 'mainnet');

    assert.equal(metadata.image, 'https://ipfs.io/ipfs/bafkreifaalohkkikosp27qp6qczwaffwseejvoaafkgv7ahyrqvejmpqou');
    assert.equal(metadata.homeDomain, 'usdt0.to');
  });

  it('keeps TOML metadata authoritative over the verified fallback', () => {
    const metadata = resolveVerifiedIssuedAssetMetadata('USDT0', USDT0_ISSUER, 'mainnet', {
      name: 'TOML USDT0',
      image: 'https://usdt0.to/toml-logo.png',
      homeDomain: 'toml.usdt0.to',
    });

    assert.equal(metadata.name, 'TOML USDT0');
    assert.equal(metadata.image, 'https://usdt0.to/toml-logo.png');
    assert.equal(metadata.homeDomain, 'toml.usdt0.to');
  });
});
