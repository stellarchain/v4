import assert from 'node:assert/strict';
import { it } from 'node:test';
import { partnerTrackingAllowed, recordPartnerClick } from './tracking.ts';

it('requires explicit optional consent and respects DNT and GPC', () => {
  for (const consent of [null, 'declined', 'unknown'])
    assert.equal(partnerTrackingAllowed(consent), false);
  assert.equal(partnerTrackingAllowed('accepted'), true);
  assert.equal(partnerTrackingAllowed('accepted', '1'), false);
  assert.equal(partnerTrackingAllowed('accepted', 'yes'), false);
  assert.equal(partnerTrackingAllowed('accepted', '0', true), false);
});

it('sends only allowlisted dimensions, omits credentials and referrers, and never requests without consent', (t) => {
  const previous = globalThis.fetch;
  const requests = [];
  globalThis.fetch = (url, options) => {
    requests.push({ url, options });
    return Promise.resolve(new Response(null, { status: 204 }));
  };
  t.after(() => {
    globalThis.fetch = previous;
  });
  recordPartnerClick(
    'https://api.example/v1/partner-clicks',
    'freighter',
    'category',
    false,
  );
  assert.equal(requests.length, 0);
  recordPartnerClick(
    'https://api.example/v1/partner-clicks',
    'freighter',
    'category',
    true,
  );
  assert.equal(requests.length, 1);
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    partnerId: 'freighter',
    placement: 'category',
    consent: true,
  });
  assert.equal(requests[0].options.credentials, 'omit');
  assert.equal(requests[0].options.referrerPolicy, 'no-referrer');
  assert.equal(requests[0].options.keepalive, true);
});

it('keeps navigation independent of rejected and unavailable tracking requests', async (t) => {
  const previous = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previous;
  });
  globalThis.fetch = () => Promise.reject(new Error('Offline'));
  assert.equal(
    recordPartnerClick('https://api.example', 'freighter', 'directory', true),
    undefined,
  );
  await new Promise((resolve) => setImmediate(resolve));
  globalThis.fetch = () => {
    throw new Error('Unavailable');
  };
  assert.doesNotThrow(() =>
    recordPartnerClick('https://api.example', 'freighter', 'directory', true),
  );
});
