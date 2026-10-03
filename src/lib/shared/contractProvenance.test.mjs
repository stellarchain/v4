import assert from 'node:assert/strict';
import { it } from 'node:test';
import { contractVerificationFromApi } from './contractProvenance.ts';

it('does not mistake decompiled code for a SEP-55 build attestation', () => {
  const verification = contractVerificationFromApi({ sourceCodeVerified: true, sourceCode: 'decompiled output', wasmId: 'abc' }, false);
  assert.equal(verification.isVerified, false);
  assert.equal(verification.sourceAvailable, true);
});

it('exposes only confirmed SEP-55 and safe GitHub source URLs', () => {
  const verification = contractVerificationFromApi({ sep55Verified: true, githubAddress: 'https://github.com/stellar/example', sep55CommitHash: 'a'.repeat(40) }, false);
  assert.equal(verification.isVerified, true);
  assert.equal(verification.sourceRepo, 'https://github.com/stellar/example');
  assert.equal(contractVerificationFromApi({ githubAddress: 'javascript:alert(1)' }, false).sourceRepo, undefined);
  assert.equal(contractVerificationFromApi({ sep55Verified: true }, true), null);
});
