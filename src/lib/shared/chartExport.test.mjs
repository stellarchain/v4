import assert from 'node:assert/strict';
import { it } from 'node:test';
import { chartPageCsv } from './chartExport.js';

it('exports only a selected metric page with its window and exact decimals', () => {
  const csv = chartPageCsv({ metricKey: 'dex-vol-xlm', network: 'mainnet', bucketMinutes: 1440, page: 2,
    windowStart: '2026-05-01T00:00:00+00:00', windowEnd: '2026-06-01T00:00:00+00:00',
    description: 'XLM-side trade volume.', valueLabel: 'XLM', note: null,
    member: [{ bucketStart: '2026-05-15T00:00:00+00:00', bucketEnd: '2026-05-16T00:00:00+00:00', source: 'horizon_db', valueDecimal: '12345678901234567890.1234567' }] });
  assert.match(csv, /"current_page"/);
  assert.match(csv, /"12345678901234567890.1234567"/);
  assert.match(csv, /"1440"/);
  assert.match(csv, /"window_end_utc_exclusive"/);
  assert.match(csv, /"XLM-side trade volume\."/);
  assert.ok(csv.endsWith('\r\n'));
});

it('carries a metric interpretation warning into the export', () => {
  const csv = chartPageCsv({ metricKey: 'output-value', network: 'mainnet', bucketMinutes: 5, page: 1,
    windowStart: null, windowEnd: null, description: 'Mixed asset values.', valueLabel: 'Mixed asset units',
    note: 'Not a comparable volume.',
    member: [{ bucketStart: '2026-05-15T00:00:00+00:00', bucketEnd: '2026-05-15T00:05:00+00:00', source: 'horizon_db', valueDecimal: '42' }] });
  assert.match(csv, /"Not a comparable volume\."/);
});
