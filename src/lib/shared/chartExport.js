import { evidenceCsvCell } from './investigationExport.js';

/** @param {{metricKey:string,network:string,bucketMinutes:number,page:number,windowStart:string|null,windowEnd:string|null,description:string,valueLabel:string,note:string|null,member:Array<{bucketStart:string,bucketEnd:string,source:string,valueDecimal:string}>}} dataset */
export function chartPageCsv(dataset) {
  const columns = ['network', 'metric_key', 'scope', 'page', 'bucket_minutes', 'window_start_utc', 'window_end_utc_exclusive', 'metric_definition', 'value_unit', 'interpretation_note', 'bucket_start_utc', 'bucket_end_utc', 'source', 'value_decimal'];
  const rows = dataset.member.map((point) => [
    dataset.network, dataset.metricKey, 'current_page', dataset.page, dataset.bucketMinutes,
    dataset.windowStart ?? '', dataset.windowEnd ?? '', dataset.description, dataset.valueLabel, dataset.note ?? '',
    point.bucketStart, point.bucketEnd, point.source, point.valueDecimal,
  ]);
  return [columns, ...rows].map((row) => row.map(evidenceCsvCell).join(',')).join('\r\n') + '\r\n';
}
