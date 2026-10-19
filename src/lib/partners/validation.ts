import type { PartnerEntry } from './types';

export type PartnerFieldErrors = Partial<Record<keyof PartnerEntry, string>>;

export function validatePartnerEntry(entry: PartnerEntry): PartnerFieldErrors {
  const errors: PartnerFieldErrors = {};
  const limits = {
    id: 64,
    name: 100,
    description: 1000,
    regionNotes: 500,
    networkNotes: 500,
  } as const;
  for (const [field, limit] of Object.entries(limits)) {
    const key = field as keyof typeof limits;
    if (!entry[key].trim() || Array.from(entry[key]).length > limit)
      errors[key] = `Enter between 1 and ${limit} characters.`;
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id))
    errors.id = 'Use lowercase letters, digits and single hyphens.';
  if (
    !Number.isInteger(entry.position) ||
    entry.position < 0 ||
    entry.position > 9999
  )
    errors.position = 'Enter an integer from 0 to 9999.';
  for (const field of ['websiteUrl', 'trackingUrl'] as const) {
    if (field === 'trackingUrl' && !entry[field]) continue;
    try {
      const raw = entry[field] || '';
      const url = new URL(raw);
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        raw.length > 2048 ||
        /\s/.test(raw)
      )
        throw new Error();
    } catch {
      errors[field] = 'Enter an HTTPS URL without credentials or whitespace.';
    }
  }
  return errors;
}

export function validPartnerReportRange(from: string, to: string): boolean {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(from) &&
    /^\d{4}-\d{2}-\d{2}$/.test(to) &&
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    new Date(start).toISOString().slice(0, 10) === from &&
    new Date(end).toISOString().slice(0, 10) === to &&
    end >= start &&
    end - start <= 89 * 86400000
  );
}
