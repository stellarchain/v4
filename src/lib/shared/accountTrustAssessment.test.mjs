import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getAccountTrustAssessment } from './accountTrustAssessment.js';

describe('account trust assessment', () => {
  it('marks a verified public identity as trusted', () => {
    const assessment = getAccountTrustAssessment({
      verified: true,
      label: 'SDF Direct Development',
      orgName: 'Stellar Development Foundation',
    });

    assert.equal(assessment.status, 'trusted');
    assert.equal(assessment.label, 'Trusted');
    assert.equal(assessment.directorySignal, 'SDF Direct Development');
  });

  it('lets an explicit adverse label override verification', () => {
    const assessment = getAccountTrustAssessment({ verified: true, label: 'Scam Verified' });

    assert.equal(assessment.status, 'untrusted');
    assert.equal(assessment.label, 'Untrusted');
    assert.match(assessment.reason, /Scam Verified/);
  });

  it('does not treat an unlisted account as untrusted', () => {
    const assessment = getAccountTrustAssessment({ verified: false, label: null });

    assert.equal(assessment.status, 'unverified');
    assert.equal(assessment.label, 'Unverified');
    assert.equal(assessment.directorySignal, 'Unlisted account');
  });

  it('keeps a normal unverified directory label inconclusive', () => {
    const assessment = getAccountTrustAssessment({ verified: false, label: 'Community account' });

    assert.equal(assessment.status, 'unverified');
    assert.equal(assessment.directorySignal, 'Community account');
  });

  it('reports unavailable metadata without inventing a verdict', () => {
    const assessment = getAccountTrustAssessment(null, true);

    assert.equal(assessment.status, 'unverified');
    assert.equal(assessment.directorySignal, 'Directory unavailable');
  });
});
