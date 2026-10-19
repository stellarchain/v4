import assert from 'node:assert/strict';
import { it } from 'node:test';
import { validatePartnerEntry, validPartnerReportRange } from './validation.ts';

const entry = {
  id: 'service',
  name: 'Service',
  description: 'Description',
  category: 'wallets',
  status: 'draft',
  relationship: 'directory',
  position: 0,
  websiteUrl: 'https://example.com/',
  trackingUrl: null,
  regionNotes: 'Varies',
  networkNotes: 'Stellar',
};

it('rejects unsafe destinations, invalid stable IDs and invalid order values', () => {
  assert.deepEqual(validatePartnerEntry(entry), {});
  for (const websiteUrl of [
    'javascript:alert(1)',
    'http://example.com',
    'https://user:secret@example.com',
    'https://example.com/ space',
  ])
    assert.ok(validatePartnerEntry({ ...entry, websiteUrl }).websiteUrl);
  assert.ok(validatePartnerEntry({ ...entry, id: '../../private' }).id);
  assert.ok(validatePartnerEntry({ ...entry, position: -1 }).position);
  assert.ok(validatePartnerEntry({ ...entry, position: 1.5 }).position);
});

it('validates real UTC calendar dates and the inclusive 90-day export boundary', () => {
  assert.equal(validPartnerReportRange('2026-01-01', '2026-03-31'), true);
  assert.equal(validPartnerReportRange('2026-01-01', '2026-04-01'), false);
  assert.equal(validPartnerReportRange('2026-02-30', '2026-03-01'), false);
  assert.equal(validPartnerReportRange('2026-10-19', '2026-10-18'), false);
  assert.equal(validPartnerReportRange('2026-10-19', '2026-10-19'), true);
});
