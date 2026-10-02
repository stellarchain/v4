import assert from 'node:assert/strict';
import { it } from 'node:test';
import { CHART_METRICS, chartMetric } from './chartCatalog.ts';

it('gives every historical metric its own stable route and explanation', () => {
  const keys = CHART_METRICS.map((metric) => metric.key);

  assert.equal(keys.length, 21);
  assert.equal(new Set(keys).size, keys.length);
  for (const metric of CHART_METRICS) {
    assert.equal(chartMetric(metric.key)?.key, metric.key);
    assert.ok(metric.label.length > 0);
    assert.ok(metric.description.length > 0);
    assert.ok(metric.valueLabel.length > 0);
  }
  assert.equal(chartMetric('unknown'), null);
});

it('qualifies non-comparable and derived metric values', () => {
  assert.equal(chartMetric('output-value')?.showTrend, false);
  assert.match(chartMetric('output-value')?.note ?? '', /no common unit|not.*comparable/i);
  assert.match(chartMetric('active-addresses')?.note ?? '', /only five-minute buckets.*cannot be reconstructed/i);
  assert.match(chartMetric('max-fee')?.note ?? '', /not the maximum fee of an individual transaction/i);
  assert.match(chartMetric('trades')?.description ?? '', /native XLM/i);
});
