import assert from 'node:assert/strict';
import { it } from 'node:test';
import { chartSeries } from './chartSeries.ts';

it('breaks the trend at missing buckets without fabricating values', () => {
  const result = chartSeries([
    { bucketStart: '2026-05-15T00:15:00+00:00', valueDecimal: '3' },
    { bucketStart: '2026-05-15T00:00:00+00:00', valueDecimal: '1' },
  ], 5);

  assert.deepEqual(result, {
    gaps: 1,
    points: [
      { bucketStart: '2026-05-15T00:00:00+00:00', value: 1 },
      { bucketStart: '2026-05-15T00:05:00.000Z', value: null },
      { bucketStart: '2026-05-15T00:15:00+00:00', value: 3 },
    ],
  });
});

it('keeps contiguous rows adjacent and does not convert non-finite values into a trend', () => {
  const result = chartSeries([
    { bucketStart: '2026-05-15T00:00:00+00:00', valueDecimal: '2' },
    { bucketStart: '2026-05-15T01:00:00+00:00', valueDecimal: '1e999' },
  ], 60);

  assert.equal(result.gaps, 0);
  assert.deepEqual(result.points.map((point) => point.value), [2, null]);
});
