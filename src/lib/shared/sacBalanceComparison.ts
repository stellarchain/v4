import { formatCompactAmount } from './formatCompactAmountRuntime.js';

export type SacDifferenceRelation = 'above' | 'below' | 'equal' | 'unavailable';

export interface SacDifferencePresentation {
  display: string;
  exact: string | null;
  magnitudeExact: string | null;
  relation: SacDifferenceRelation;
}

export function rawIntegerToDecimal(raw: string | null | undefined, decimals: number): string | null {
  const value = String(raw ?? '').trim();
  if (!/^-?\d+$/.test(value)) return null;

  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const normalizedDecimals = Math.max(0, decimals);

  if (normalizedDecimals === 0) {
    const whole = unsigned.replace(/^0+(?=\d)/, '') || '0';
    return `${negative && whole !== '0' ? '-' : ''}${whole}`;
  }

  const padded = unsigned.padStart(normalizedDecimals + 1, '0');
  const whole = padded.slice(0, -normalizedDecimals).replace(/^0+(?=\d)/, '') || '0';
  const fraction = padded.slice(-normalizedDecimals).replace(/0+$/, '');
  const decimal = `${whole}${fraction ? `.${fraction}` : ''}`;

  return `${negative && decimal !== '0' ? '-' : ''}${decimal}`;
}

export function formatExactDecimal(value: string): string {
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [whole, fraction] = unsigned.split('.');
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return `${negative ? '−' : ''}${groupedWhole}${fraction ? `.${fraction}` : ''}`;
}

export function getSacDifferencePresentation(
  raw: string | null | undefined,
  decimals: number,
): SacDifferencePresentation {
  const exact = rawIntegerToDecimal(raw, decimals);
  if (exact === null) {
    return { display: 'Unavailable', exact: null, magnitudeExact: null, relation: 'unavailable' };
  }

  const negative = exact.startsWith('-');
  const magnitudeExact = negative ? exact.slice(1) : exact;
  const isZero = /^0(?:\.0*)?$/.test(magnitudeExact);

  if (isZero) {
    return { display: 'No gap observed', exact, magnitudeExact: '0', relation: 'equal' };
  }

  const relation: SacDifferenceRelation = negative ? 'below' : 'above';
  return {
    display: `${formatCompactAmount(magnitudeExact)} ${relation}`,
    exact,
    magnitudeExact,
    relation,
  };
}
