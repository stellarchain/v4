const RISK_LABELS = ['scam', 'hack', 'malicious', 'spam'];

/**
 * @param {unknown} labelText
 * @returns {'scam' | 'hack' | 'malicious' | 'spam' | null}
 */
export function getRiskLabelKind(labelText) {
  const normalized = String(labelText || '').toLowerCase();
  if (!normalized.trim()) return null;

  for (const label of RISK_LABELS) {
    if (normalized.includes(label)) {
      return label;
    }
  }

  return null;
}

/**
 * @param {unknown} labelText
 * @returns {boolean}
 */
export function isRiskLabel(labelText) {
  return getRiskLabelKind(labelText) !== null;
}

/**
 * @param {unknown} labelText
 * @returns {boolean}
 */
export function isRiskLinkDisabled(labelText) {
  return isRiskLabel(labelText);
}

/**
 * @param {unknown} labelText
 * @returns {string}
 */
export function getRiskLinkClassName(labelText) {
  if (!isRiskLinkDisabled(labelText)) {
    return '';
  }

  return 'text-red-600 line-through decoration-red-600 decoration-2 cursor-not-allowed dark:text-red-400 dark:decoration-red-400';
}
