import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as assetPresentation from './assetBalancePresentation.js';

describe('account balance asset presentation', () => {
  it('exposes a shared balance presentation builder', () => {
    assert.equal(typeof assetPresentation.buildBalanceAssetPresentation, 'function');
  });

  it('uses the same identity metadata as the asset detail page', () => {
    const issuer = 'GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q';

    assert.deepEqual(
      assetPresentation.buildBalanceAssetPresentation(
        {
          asset_type: 'credit_alphanum12',
          asset_code: 'USDT0',
          asset_issuer: issuer,
        },
        {
          code: 'USDT0',
          issuer,
          name: 'USDT0',
          image: '/usdt0-icon.svg',
          verified: true,
          domain: 'usdt0.to',
        }
      ),
      {
        code: 'USDT0',
        issuer,
        name: 'USDT0',
        image: '/usdt0-icon.svg',
        verified: true,
        domain: 'usdt0.to',
        assetType: 'credit alphanum12',
      }
    );
  });

  it('keeps a stable fallback while asset metadata loads', () => {
    assert.deepEqual(
      assetPresentation.buildBalanceAssetPresentation({
        asset_type: 'credit_alphanum4',
        asset_code: 'TEST',
        asset_issuer: 'GTESTISSUER',
      }),
      {
        code: 'TEST',
        issuer: 'GTESTISSUER',
        name: 'TEST',
        image: undefined,
        verified: false,
        domain: undefined,
        assetType: 'credit alphanum4',
      }
    );
  });

  it('builds the same lookup key for a balance and its asset details', () => {
    const issuer = 'GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q';

    assert.equal(
      assetPresentation.buildBalanceAssetKey('USDT0', issuer),
      `USDT0:${issuer}`
    );
  });

  it('publishes fast metadata without waiting for a slow lookup', async () => {
    let releaseSlow;
    const slowResult = new Promise((resolve) => {
      releaseSlow = resolve;
    });
    const published = [];

    const execution = assetPresentation.runBalanceAssetRequests(
      ['slow', 'fast', 'later'],
      async (request) => request === 'slow' ? slowResult : request.toUpperCase(),
      (result) => published.push(result),
      2
    );

    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(published, ['FAST', 'LATER']);

    releaseSlow('SLOW');
    await execution;
    assert.deepEqual(published, ['FAST', 'LATER', 'SLOW']);
  });

  it('keeps both the domain and issuer in the compact asset subtitle', () => {
    assert.equal(
      assetPresentation.buildBalanceAssetSubtitle(
        {
          domain: 'usdt0.to',
          issuer: 'GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q',
          assetType: 'credit alphanum12',
        },
        () => 'GATISX...KXJHN6Q'
      ),
      'usdt0.to · GATISX...KXJHN6Q'
    );
  });
});
