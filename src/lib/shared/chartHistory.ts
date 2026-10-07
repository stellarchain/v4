export interface ChartMetricPoint {
  metricKey: string;
  source: string;
  bucketStart: string;
  bucketEnd: string;
  valueDecimal: string;
}

export interface ChartMetricCollection {
  totalItems: number;
  member: ChartMetricPoint[];
  view: { next?: string; previous?: string };
  window: {
    start: string;
    end: string;
    olderBefore: string | null;
    newerBefore: string | null;
    isLatest: boolean;
  } | null;
}

export interface OlderHistoryCursor {
  page: number;
  before: string | null;
  hasNextPage: boolean;
  olderBefore: string | null;
}

interface ChartHistoryRequest {
  page: number;
  before: string | null;
  windowDays: number;
}

export const CHART_YEAR_DAYS = 365;
export const CHART_PAGE_SIZE = 50;
const DAY_MILLISECONDS = 86_400_000;

export async function loadChartYearHistory(
  initial: ChartMetricCollection,
  before: string | null,
  signal: AbortSignal,
  fetchPage: (request: ChartHistoryRequest) => Promise<ChartMetricCollection>,
): Promise<{ points: ChartMetricPoint[]; cursor: OlderHistoryCursor }> {
  const end = Date.parse(initial.window?.end ?? '');
  const start = end - CHART_YEAR_DAYS * DAY_MILLISECONDS;
  const points = new Map<string, ChartMetricPoint>();
  let collection = initial;
  let request: ChartHistoryRequest = { page: 1, before, windowDays: 30 };

  for (;;) {
    signal.throwIfAborted();
    for (const point of collection.member) {
      const timestamp = Date.parse(point.bucketStart);
      if (Number.isFinite(start) && (timestamp < start || timestamp >= end)) continue;
      points.set(`${point.metricKey}\u0000${point.source}\u0000${point.bucketStart}`, point);
    }

    const cursor: OlderHistoryCursor = {
      page: request.page,
      before: request.before,
      hasNextPage: Boolean(collection.view.next),
      olderBefore: collection.window?.olderBefore ?? null,
    };
    if (!Number.isFinite(start) || !collection.window) return { points: [...points.values()], cursor };

    if (cursor.hasNextPage) {
      const lastPage = Math.ceil(collection.totalItems / CHART_PAGE_SIZE);
      if (request.page >= lastPage) throw new Error('Invalid historical page cursor.');
      request = { ...request, page: request.page + 1 };
    } else {
      const nextEnd = Date.parse(cursor.olderBefore ?? '');
      if (Date.parse(collection.window.start) <= start || !cursor.olderBefore) {
        return { points: [...points.values()], cursor };
      }
      if (!Number.isFinite(nextEnd) || nextEnd >= Date.parse(collection.window.end)) {
        throw new Error('Historical window did not move backward.');
      }
      request = {
        page: 1,
        before: cursor.olderBefore,
        windowDays: Math.min(30, Math.ceil((nextEnd - start) / DAY_MILLISECONDS)),
      };
    }
    collection = await fetchPage(request);
  }
}
