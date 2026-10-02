import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  collectTradingPairCandidatesFromOffers,
  summarizeTradingPairAggregations,
} from './assetTradingPairs.ts';

const USDT0_ISSUER = 'GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q';

const USDT0 = {
  asset_type: 'credit_alphanum12',
  asset_code: 'USDT0',
  asset_issuer: USDT0_ISSUER,
};
const XLM = { asset_type: 'native' };

describe('Horizon asset trading pairs', () => {
  it('normalizes buying and selling offers to counter units per tracked asset', () => {
    const candidates = collectTradingPairCandidatesFromOffers('USDT0', USDT0_ISSUER, [
      {
        selling: USDT0,
        buying: XLM,
        price: '0.21',
        last_modified_time: '2026-08-31T10:00:00Z',
      },
      {
        selling: XLM,
        buying: USDT0,
        price: '5',
        last_modified_time: '2026-08-31T11:00:00Z',
      },
    ]);

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].counterAsset.code, 'XLM');
    assert.equal(candidates[0].offerCount, 2);
    assert.ok(Math.abs(candidates[0].referencePrice - 0.205) < 1e-12);
    assert.ok(Math.abs(candidates[0].spread - 4.8780487804878) < 1e-12);
    assert.equal(candidates[0].lastOfferTime, '2026-08-31T11:00:00Z');
  });

  it('ignores offers that do not contain the exact tracked asset', () => {
    const candidates = collectTradingPairCandidatesFromOffers('USDT0', USDT0_ISSUER, [
      {
        selling: { ...USDT0, asset_issuer: 'GOTHER' },
        buying: XLM,
        price: '1',
      },
    ]);

    assert.deepEqual(candidates, []);
  });

  it('summarizes pair-specific aggregations in chronological price order', () => {
    const summary = summarizeTradingPairAggregations([
      {
        timestamp: 2,
        trade_count: 3,
        base_volume: '20',
        counter_volume: '4.4',
        open: '0.21',
        close: '0.22',
      },
      {
        timestamp: 1,
        trade_count: 2,
        base_volume: '10',
        counter_volume: '2',
        open: '0.20',
        close: '0.21',
      },
    ]);

    assert.deepEqual(summary, {
      price: 0.22,
      baseVolume: 30,
      counterVolume: 6.4,
      tradeCount: 5,
      priceChange: 9.999999999999995,
    });
  });
});
