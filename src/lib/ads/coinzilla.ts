const COINZILLA_ZONE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export interface CoinzillaConfig {
  enabled: boolean;
  homeZoneId: string | null;
  preview: boolean;
}

export function normalizeCoinzillaZoneId(value: string | undefined): string | null {
  const normalizedValue = value?.trim() ?? '';
  return COINZILLA_ZONE_ID_PATTERN.test(normalizedValue) ? normalizedValue : null;
}

export function getCoinzillaConfig(): CoinzillaConfig {
  return {
    enabled: process.env.NEXT_PUBLIC_COINZILLA_ENABLED === 'true',
    homeZoneId: normalizeCoinzillaZoneId(process.env.NEXT_PUBLIC_COINZILLA_HOME_ZONE_ID),
    preview:
      process.env.NODE_ENV !== 'production' &&
      process.env.NEXT_PUBLIC_COINZILLA_PREVIEW === 'true',
  };
}
