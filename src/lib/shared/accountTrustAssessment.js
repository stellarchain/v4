import { getRiskLabelKind } from './riskLabels.js';

/**
 * @typedef {'trusted' | 'untrusted' | 'unverified'} AccountTrustStatus
 */

/**
 * @typedef {{
 *   label?: string | null;
 *   verified?: boolean;
 *   orgName?: string | null;
 * } | null | undefined} AccountTrustMetadata
 */

/**
 * Derive a bounded account assessment from public directory metadata only.
 * Payment patterns intentionally do not affect this result.
 *
 * @param {AccountTrustMetadata} account
 * @param {boolean} metadataUnavailable
 * @returns {{
 *   status: AccountTrustStatus;
 *   label: 'Trusted' | 'Untrusted' | 'Unverified';
 *   reason: string;
 *   directorySignal: string;
 * }}
 */
export function getAccountTrustAssessment(account, metadataUnavailable = false) {
  const riskLabel = account?.label?.trim() || null;
  const riskKind = getRiskLabelKind(riskLabel);

  if (riskKind) {
    return {
      status: 'untrusted',
      label: 'Untrusted',
      reason: `Public directory warning: ${riskLabel}.`,
      directorySignal: riskLabel,
    };
  }

  if (account?.verified) {
    return {
      status: 'trusted',
      label: 'Trusted',
      reason: 'A verified public identity was found for this account.',
      directorySignal: account.label?.trim() || account.orgName?.trim() || 'Verified directory identity',
    };
  }

  if (metadataUnavailable) {
    return {
      status: 'unverified',
      label: 'Unverified',
      reason: 'Public directory data is currently unavailable.',
      directorySignal: 'Directory unavailable',
    };
  }

  if (riskLabel) {
    return {
      status: 'unverified',
      label: 'Unverified',
      reason: 'A public label exists, but the account identity is not verified.',
      directorySignal: riskLabel,
    };
  }

  return {
    status: 'unverified',
    label: 'Unverified',
    reason: 'No verified public identity or adverse directory label was found.',
    directorySignal: 'Unlisted account',
  };
}
