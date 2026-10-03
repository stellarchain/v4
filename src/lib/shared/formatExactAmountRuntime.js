/**
 * Formats a decimal string for display without rounding or converting it to a
 * JavaScript number.
 *
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function formatExactAmount(value) {
  const decimal = value?.trim();
  if (!decimal || !/^\d+(?:\.\d+)?$/.test(decimal)) return 'Unknown';

  const [rawInteger, rawFraction = ''] = decimal.split('.');
  const integer = rawInteger.replace(/^0+(?=\d)/, '');
  const fraction = rawFraction.replace(/0+$/, '');
  const groupedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return fraction ? `${groupedInteger}.${fraction}` : groupedInteger;
}
