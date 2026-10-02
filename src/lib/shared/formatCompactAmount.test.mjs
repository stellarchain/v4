import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCompactAmount } from './formatCompactAmount.ts';

test('formats large decimal strings for scan-friendly UI display', () => {
  assert.equal(formatCompactAmount('3000000005.1261547'), '3B');
  assert.equal(formatCompactAmount('12500'), '12.5K');
  assert.equal(formatCompactAmount('1250000.25'), '1.25M');
});

test('preserves small and precise values', () => {
  assert.equal(formatCompactAmount('999.1200000'), '999.12');
  assert.equal(formatCompactAmount('0.0000001'), '0.0000001');
  assert.equal(formatCompactAmount(null), 'Unknown');
});
