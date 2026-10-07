import assert from 'node:assert/strict';
import { it } from 'node:test';
import { CHART_PAGE_SIZE, loadChartYearHistory } from './chartHistory.ts';

const DAY = 86_400_000;
const END = '2026-10-07T00:00:00.000Z';

function collection({ page = 1, before = null, windowDays = 30, sources = ['ledger'], hasOlder = true } = {}) {
  const end = Date.parse(before ?? END);
  const start = end - windowDays * DAY;
  const points = [];
  for (let day = 1; day <= windowDays; day += 1) {
    for (const source of sources) {
      points.push({ metricKey: 'operations', source, bucketStart: new Date(end - day * DAY).toISOString(), bucketEnd: new Date(end - (day - 1) * DAY).toISOString(), valueDecimal: '9007199254740993.0000001' });
    }
  }
  return {
    totalItems: points.length,
    member: points.slice((page - 1) * CHART_PAGE_SIZE, page * CHART_PAGE_SIZE),
    view: page * CHART_PAGE_SIZE < points.length ? { next: 'next-page' } : {},
    window: { start: new Date(start).toISOString(), end: new Date(end).toISOString(), olderBefore: hasOlder ? new Date(start).toISOString() : null, newerBefore: null, isLatest: before === null },
  };
}

it('loads exactly 365 daily buckets through bounded windows, keeping exact values', async () => {
  const requests = [];
  const result = await loadChartYearHistory(collection(), null, new AbortController().signal, async (request) => {
    requests.push(request);
    return collection(request);
  });
  assert.equal(result.points.length, 365);
  assert.equal(requests.length, 12);
  assert.ok(requests.every((request) => request.windowDays >= 1 && request.windowDays <= 30));
  assert.equal(requests.at(-1).windowDays, 5);
  assert.equal(result.points.at(-1).bucketStart, '2025-10-07T00:00:00.000Z');
  assert.equal(result.points[0].valueDecimal, '9007199254740993.0000001');
  assert.equal(result.cursor.olderBefore, '2025-10-07T00:00:00.000Z');
});

it('finishes every source page before moving to the preceding historical window', async () => {
  const sources = ['ledger', 'archive'];
  const requests = [];
  const result = await loadChartYearHistory(collection({ sources }), null, new AbortController().signal, async (request) => {
    requests.push(request);
    return collection({ ...request, sources });
  });
  assert.deepEqual(requests[0], { page: 2, before: null, windowDays: 30 });
  assert.equal(requests[1].page, 1);
  assert.equal(requests[1].before, '2026-09-07T00:00:00.000Z');
  for (const source of sources) assert.equal(result.points.filter((point) => point.source === source).length, 365);
  assert.equal(new Set(result.points.map((point) => `${point.source}:${point.bucketStart}`)).size, 730);
});

it('stops at available coverage and preserves gaps rather than inventing a year', async () => {
  const initial = collection({ windowDays: 15, hasOlder: false });
  initial.member.splice(5, 1);
  const result = await loadChartYearHistory(initial, null, new AbortController().signal, async () => {
    assert.fail('No older request should be made.');
  });
  assert.equal(result.points.length, 14);
  assert.equal(result.cursor.olderBefore, null);
  assert.ok(!result.points.some((point) => point.bucketStart === '2026-10-01T00:00:00.000Z'));
});

it('anchors a historical year to the requested window rather than the wall clock', async () => {
  const before = '2024-03-01T00:00:00.000Z';
  const result = await loadChartYearHistory(collection({ before }), before, new AbortController().signal, async (request) => collection(request));
  assert.equal(result.points.length, 365);
  assert.equal(result.points.at(-1).bucketStart, '2023-03-02T00:00:00.000Z');
});

it('cancels remaining windows when navigation aborts the year load', async () => {
  const controller = new AbortController();
  let requests = 0;
  await assert.rejects(loadChartYearHistory(collection(), null, controller.signal, async (request) => {
    requests += 1;
    controller.abort();
    return collection(request);
  }), { name: 'AbortError' });
  assert.equal(requests, 1);
});

it('rejects a stuck cursor and surfaces an interrupted year request', async () => {
  const stuck = collection();
  stuck.window.olderBefore = stuck.window.end;
  await assert.rejects(loadChartYearHistory(stuck, null, new AbortController().signal, async () => assert.fail()), /did not move backward/);
  await assert.rejects(loadChartYearHistory(collection(), null, new AbortController().signal, async () => {
    throw new Error('Unavailable');
  }), /Unavailable/);
});
