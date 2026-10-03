import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatExactDecimal,
  getSacDifferencePresentation,
  rawIntegerToDecimal,
} from './sacBalanceComparison.ts';

describe('SAC balance comparison presentation', () => {
  it('converts raw token units without losing precision', () => {
    assert.equal(rawIntegerToDecimal('3462315178113057', 7), '346231517.8113057');
    assert.equal(rawIntegerToDecimal('-1', 7), '-0.0000001');
    assert.equal(rawIntegerToDecimal('0', 7), '0');
  });

  it('turns a negative difference into a plain-language coverage gap', () => {
    const result = getSacDifferencePresentation('-3462315178113057', 7);

    assert.equal(result.display, '346.23M below');
    assert.equal(result.exact, '-346231517.8113057');
    assert.equal(result.relation, 'below');
  });

  it('handles positive, equal and unavailable comparisons', () => {
    assert.equal(getSacDifferencePresentation('12500000000', 7).display, '1.25K above');
    assert.equal(getSacDifferencePresentation('0', 7).display, 'No gap observed');
    assert.equal(getSacDifferencePresentation(null, 7).display, 'Unavailable');
  });

  it('groups an exact decimal without converting it to a number', () => {
    assert.equal(formatExactDecimal('-346231517.8113057'), '−346,231,517.8113057');
  });
});
