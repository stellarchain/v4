import assert from 'node:assert/strict';
import { it } from 'node:test';
import { getOfferPresentation } from './offerPresentation.ts';

it('labels a sell offer amount as the selling asset without inventing a recipient', () => {
  const offer = getOfferPresentation({ id: '1', type: 'manage_sell_offer', amount: '6071.6049072',
    selling_asset_code: 'FINTECH', buying_asset_type: 'native' });
  assert.equal(offer.sellingAmount, '6071.6049072');
  assert.equal(offer.buyingAmount, '');
  assert.equal(offer.amountAsset, 'FINTECH');
  assert.equal(offer.priceUnit, 'XLM / FINTECH');
});

it('labels a buy offer amount and price using the buying side', () => {
  const offer = getOfferPresentation({ id: '2', type: 'manage_buy_offer', amount: '30',
    selling_asset_type: 'native', buying_asset_code: 'USDC' });
  assert.equal(offer.buyingAmount, '30');
  assert.equal(offer.sellingAmount, '');
  assert.equal(offer.amountAsset, 'USDC');
  assert.equal(offer.priceUnit, 'XLM / USDC');
});
