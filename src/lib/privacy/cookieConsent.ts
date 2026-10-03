export const COOKIE_CONSENT_KEY = 'stellarchain-cookie-consent';
export const COOKIE_CONSENT_EVENT = 'stellarchain:cookie-consent';

export type CookieConsentValue = 'accepted' | 'declined' | null;

export function readCookieConsent(): CookieConsentValue {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const value = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    return value === 'accepted' || value === 'declined' ? value : null;
  } catch {
    return null;
  }
}

export function persistCookieConsent(value: Exclude<CookieConsentValue, null>): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, value);
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: value }));
    return true;
  } catch {
    return false;
  }
}
