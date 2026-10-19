export function partnerTrackingAllowed(
  consent: string | null,
  doNotTrack?: string | null,
  globalPrivacyControl?: boolean,
): boolean {
  return (
    consent === 'accepted' &&
    doNotTrack !== '1' &&
    doNotTrack !== 'yes' &&
    globalPrivacyControl !== true
  );
}

/** Best effort; never delays the direct link. No retries or visitor identifiers. */
export function recordPartnerClick(
  endpoint: string,
  partnerId: string,
  placement: 'directory' | 'category',
  allowed: boolean,
): void {
  if (!allowed) return;
  try {
    void fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnerId, placement, consent: true }),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      keepalive: true,
      signal: AbortSignal.timeout(2500),
    }).catch(() => undefined);
  } catch {
    // Navigation remains available when browser tracking APIs are unavailable.
  }
}
