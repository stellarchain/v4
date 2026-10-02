export interface ChartSeriesRow {
  bucketStart: string;
  valueDecimal: string;
}

export interface ChartSeriesPoint {
  bucketStart: string;
  value: number | null;
}

export function chartSeries(rows: ChartSeriesRow[], bucketMinutes: number): { points: ChartSeriesPoint[]; gaps: number } {
  const ordered = [...rows].sort((left, right) => left.bucketStart.localeCompare(right.bucketStart));
  const points: ChartSeriesPoint[] = [];
  const bucketMilliseconds = bucketMinutes * 60_000;
  let previousTimestamp: number | null = null;
  let gaps = 0;

  for (const row of ordered) {
    const timestamp = Date.parse(row.bucketStart);
    if (!Number.isFinite(timestamp)) continue;
    if (previousTimestamp !== null && timestamp - previousTimestamp > bucketMilliseconds) {
      points.push({ bucketStart: new Date(previousTimestamp + bucketMilliseconds).toISOString(), value: null });
      gaps += 1;
    }
    const numericValue = Number(row.valueDecimal);
    points.push({ bucketStart: row.bucketStart, value: Number.isFinite(numericValue) ? numericValue : null });
    previousTimestamp = timestamp;
  }

  return { points, gaps };
}
