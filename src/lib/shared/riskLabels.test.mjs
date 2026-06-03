import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getRiskLabelKind, getRiskLinkClassName, isRiskLabel, isRiskLinkDisabled } from './riskLabels.js';

describe('risk label detection', () => {
  it('marks scam-like labels as risk labels', () => {
    assert.equal(isRiskLabel('Scam'), true);
    assert.equal(isRiskLabel('Likely malicious issuer'), true);
    assert.equal(isRiskLabel('Known hack account'), true);
  });

  it('distinguishes spam from red-flag scam labels', () => {
    assert.equal(getRiskLabelKind('Spam Issuer'), 'spam');
    assert.equal(getRiskLabelKind('Scam'), 'scam');
  });

  it('ignores normal labels and empty values', () => {
    assert.equal(isRiskLabel('MoneyGram'), false);
    assert.equal(isRiskLabel(''), false);
    assert.equal(isRiskLabel(null), false);
  });

  it('disables risky links and applies red strike-through styling', () => {
    assert.equal(isRiskLinkDisabled('Scam'), true);
    assert.match(getRiskLinkClassName('Scam'), /line-through/);
    assert.match(getRiskLinkClassName('Scam'), /decoration-red-600/);
    assert.match(getRiskLinkClassName('Scam'), /cursor-not-allowed/);
  });

  it('keeps normal links enabled without risk styling', () => {
    assert.equal(isRiskLinkDisabled('MoneyGram'), false);
    assert.equal(getRiskLinkClassName('MoneyGram'), '');
  });
});
