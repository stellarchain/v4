import { formatExactAmount } from './formatExactAmountRuntime.js';

const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 2,
});

/**
 * Produces a scan-friendly display value. The original decimal string remains
 * the source of truth and must be used for tooltips, exports and calculations.
 */
export function formatCompactAmount(value: string | null | undefined): string {
  const exact = formatExactAmount(value);
  if (exact === 'Unknown') return exact;

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || Math.abs(numericValue) < 1_000) return exact;

  return compactNumberFormatter.format(numericValue);
}
