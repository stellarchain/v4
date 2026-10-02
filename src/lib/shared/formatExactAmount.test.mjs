import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatExactAmount } from './formatExactAmount.ts';

describe('exact investigation amount formatting', () => {
  it('does not turn a nonzero dust amount into zero', () => {
    assert.equal(formatExactAmount('0.00000090000000'), '0.0000009');
    assert.equal(formatExactAmount('0.00000000000001'), '0.00000000000001');
  });

  it('preserves large exact decimal values without floating-point conversion', () => {
    assert.equal(
      formatExactAmount('999999999999999999.12345678901234'),
      '999,999,999,999,999,999.12345678901234',
    );
  });

  it('normalizes zero and rejects missing or invalid amounts', () => {
    assert.equal(formatExactAmount('0000.00000000000000'), '0');
    assert.equal(formatExactAmount(null), 'Unknown');
    assert.equal(formatExactAmount('not-a-number'), 'Unknown');
  });
});
