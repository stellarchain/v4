import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sumHorizonAssetSupply } from './horizonAssetSupply.js';

describe('Horizon asset supply', () => {
  it('includes trustlines, claimable balances, liquidity pools, and SAC contracts', () => {
    const supply = sumHorizonAssetSupply({
      balances: {
        authorized: '5549.0635998',
        authorized_to_maintain_liabilities: '0.0000000',
        unauthorized: '0.0000000',
      },
      claimable_balances_amount: '0.3070000',
      liquidity_pools_amount: '123.3508800',
      contracts_amount: '2589385.3296482',
    });

    assert.equal(supply, 2595058.051128);
  });

  it('treats missing optional balance locations as zero', () => {
    const supply = sumHorizonAssetSupply({
      balances: {
        authorized: '1.5000000',
      },
    });

    assert.equal(supply, 1.5);
  });
});
