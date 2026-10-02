import assert from 'node:assert/strict';
import { it } from 'node:test';
import { chartAxisValue, chartTimeTick } from './chartDisplay.ts';

it('shows UTC time for subdaily buckets and date for daily buckets', () => {
  assert.equal(chartTimeTick('2026-05-17T08:35:00Z', 5), '17 May 08:35');
  assert.equal(chartTimeTick('2026-05-17T08:35:00Z', 60), '17 May 08:35');
  assert.equal(chartTimeTick('2026-05-17T00:00:00Z', 1440), '17 May');
});

it('does not round small nonzero axis values to zero', () => {
  assert.equal(chartAxisValue(0), '0');
  assert.equal(chartAxisValue(0.00001), '0.0000100');
  assert.equal(chartAxisValue(2500), '2.5K');
  assert.equal(chartAxisValue(6429), '6.4K');
});
