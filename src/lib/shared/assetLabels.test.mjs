import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { attachIssuerLabel } from './assetLabels.js';

describe('asset issuer labels', () => {
  it('attaches an issuer label when the issuer exists in the label map', () => {
    const issuer = 'GDFAPQOSUUISQU4CN2G2QYPJK4G532N3337PHVMIDTHTNEAVFWUMGUSD';
    const asset = { code: 'MGUSD', issuer };
    const labels = new Map([[issuer, { name: 'Scam', verified: false }]]);

    assert.deepEqual(attachIssuerLabel(asset, labels), {
      code: 'MGUSD',
      issuer,
      issuerLabel: { name: 'Scam', verified: false },
    });
  });

  it('leaves assets unchanged when there is no issuer label', () => {
    const asset = { code: 'MGUSD', issuer: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF' };

    assert.equal(attachIssuerLabel(asset, new Map()), asset);
  });
});
