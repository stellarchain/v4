import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildIssuedAssetsFilters, mapHorizonAssetRecordToIssuedAsset, shouldShowIssuedAssetsTab } from './issuedAssets.js';

describe('issued asset filters', () => {
  it('builds a mainnet issued-assets issuer filter for an address', () => {
    assert.deepEqual(
      buildIssuedAssetsFilters(' gaiugzzzsl47bkh27sudzeszelfjdpe2um52racosfj7bivbgkuejsuz ', 25),
      {
        issuer: 'GAIUGZZZSL47BKH27SUDZESZELFJDPE2UM52RACOSFJ7BIVBGKUEJSUZ',
        itemsPerPage: 25,
        page: 1,
      }
    );
  });

  it('uses TOML metadata for Horizon-only issued asset rows', () => {
    const asset = mapHorizonAssetRecordToIssuedAsset({
      asset_code: 'MGUSD',
      asset_issuer: 'GAIUGZZZSL47BKH27SUDZESZELFJDPE2UM52RACOSFJ7BIVBGKUEJSUZ',
    }, 'GAIUGZZZSL47BKH27SUDZESZELFJDPE2UM52RACOSFJ7BIVBGKUEJSUZ', {
      name: 'MoneyGram USD',
      image: 'https://mgusd.moneygram.com/mgusd-logo.jpeg',
    });

    assert.equal(asset.name, 'MoneyGram USD');
    assert.equal(asset.image, 'https://mgusd.moneygram.com/mgusd-logo.jpeg');
  });
});

describe('issued asset horizon fallback mapping', () => {
  it('maps a Horizon issuer asset record into the issued-assets row shape', () => {
    assert.deepEqual(
      mapHorizonAssetRecordToIssuedAsset({
        asset_code: 'MGUSD',
        asset_issuer: 'GAIUGZZZSL47BKH27SUDZESZELFJDPE2UM52RACOSFJ7BIVBGKUEJSUZ',
        amount: '1000000.5000000',
        accounts: {
          authorized: 2,
          authorized_to_maintain_liabilities: 1,
          unauthorized: 3,
        },
      }, 'GAIUGZZZSL47BKH27SUDZESZELFJDPE2UM52RACOSFJ7BIVBGKUEJSUZ', 1),
      {
        rank: 0,
        code: 'MGUSD',
        issuer: 'GAIUGZZZSL47BKH27SUDZESZELFJDPE2UM52RACOSFJ7BIVBGKUEJSUZ',
        name: 'MGUSD',
        image: undefined,
        price_usd: 0,
        price_xlm: 0,
        change_1h: 0,
        change_24h: 0,
        change_7d: 0,
        volume_24h: 0,
        market_cap: 0,
        circulating_supply: 1000000.5,
        sparkline: [],
        holders: 6,
      }
    );
  });
});

describe('issued assets tab visibility', () => {
  it('shows the issued assets tab only after issued assets were found', () => {
    assert.equal(shouldShowIssuedAssetsTab(false, [{ code: 'MGUSD' }]), false);
    assert.equal(shouldShowIssuedAssetsTab(true, []), false);
    assert.equal(shouldShowIssuedAssetsTab(true, [{ code: 'MGUSD' }]), true);
  });
});
