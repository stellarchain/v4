import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  collectFundedAssetHolderBatch,
  extractFundedAssetHolders,
  sortAssetHoldersByBalance,
} from './assetHolders.ts';

const ISSUER = 'GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q';

function account(accountId, balance) {
  return {
    id: accountId,
    account_id: accountId,
    balances: [
      {
        asset_code: 'USDT0',
        asset_issuer: ISSUER,
        balance,
      },
    ],
  };
}

describe('Horizon asset holder collection', () => {
  it('ignores zero-balance trustlines without treating the asset as empty', () => {
    const firstPage = [account('GZERO1', '0.0000000'), account('GZERO2', '0.0000000')];
    const secondPage = [account('GFUNDED', '10.0000000')];

    assert.deepEqual(extractFundedAssetHolders(firstPage, 'USDT0', ISSUER), []);
    assert.deepEqual(extractFundedAssetHolders(secondPage, 'USDT0', ISSUER), [
      {
        account_id: 'GFUNDED',
        balance: '10.0000000',
        paging_token: 'GFUNDED',
      },
    ]);
  });

  it('sorts funded holders within the loaded Horizon page', () => {
    const holders = [
      { account_id: 'GSECOND', balance: '29.9800000', paging_token: '2' },
      { account_id: 'GFIRST', balance: '1998.8172000', paging_token: '1' },
      { account_id: 'GTHIRD', balance: '10.0000000', paging_token: '3' },
    ];

    assert.deepEqual(
      sortAssetHoldersByBalance(holders).map(holder => holder.account_id),
      ['GFIRST', 'GSECOND', 'GTHIRD']
    );
  });

  it('stops at the target holder without skipping the rest of the Horizon page', () => {
    const accounts = [
      account('GZERO', '0'),
      account('GFIRST', '3'),
      account('GSECOND', '2'),
      account('GUNREAD', '1'),
    ];

    assert.deepEqual(collectFundedAssetHolderBatch(accounts, 'USDT0', ISSUER, 2), {
      holders: [
        { account_id: 'GFIRST', balance: '3', paging_token: 'GFIRST' },
        { account_id: 'GSECOND', balance: '2', paging_token: 'GSECOND' },
      ],
      lastProcessedCursor: 'GSECOND',
      processedAccounts: 3,
      targetReached: true,
    });
  });

  it('returns the last scanned cursor when the target was not reached', () => {
    const accounts = [account('GZERO', '0'), account('GFIRST', '3')];

    assert.deepEqual(collectFundedAssetHolderBatch(accounts, 'USDT0', ISSUER, 2), {
      holders: [{ account_id: 'GFIRST', balance: '3', paging_token: 'GFIRST' }],
      lastProcessedCursor: 'GFIRST',
      processedAccounts: 2,
      targetReached: false,
    });
  });
});
