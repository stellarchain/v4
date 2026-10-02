import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { caseQueueKey, mergeCaseQueues, normalizeCaseTarget, parseCaseQueue, serializeCaseQueue } from './investigationCaseQueue.js';

const address = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const txHash = 'a'.repeat(64);
const entry = { network: 'mainnet', type: 'address', value: address, savedAt: '2026-09-29T12:00:00.000Z', watching: true };

describe('Investigator local case queue', () => {
  it('accepts only valid addresses and transaction hashes', () => {
    assert.deepEqual(normalizeCaseTarget(address.toLowerCase()), { type: 'address', value: address });
    assert.deepEqual(normalizeCaseTarget(txHash.toUpperCase()), { type: 'transaction', value: txHash });
    assert.equal(normalizeCaseTarget('GINVALID'), null);
    assert.equal(normalizeCaseTarget('=cmd()'), null);
  });

  it('round trips a versioned file without notes or evidence payloads', () => {
    const restored = parseCaseQueue(serializeCaseQueue([entry]));
    assert.deepEqual(restored, [entry]);
    assert.equal(caseQueueKey(restored[0]), `mainnet:address:${address}`);
  });

  it('rejects malformed, duplicated and untrusted entries atomically', () => {
    for (const entries of [[entry, entry], [{ ...entry, network: 'invalid' }], [{ ...entry, value: '=cmd()' }]]) {
      assert.throws(() => parseCaseQueue({ version: 1, entries }));
    }
    assert.throws(() => parseCaseQueue({ version: 2, entries: [] }));
    assert.throws(() => parseCaseQueue('{'));
  });

  it('merges imports without overwriting local watch state', () => {
    assert.deepEqual(mergeCaseQueues([entry], [{ ...entry, watching: false }]), [entry]);
  });
});
