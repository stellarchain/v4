import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evidenceCsvCell, investigationCsv, investigationJson } from './investigationExport.js';

describe('Investigator evidence exports', () => {
  it('neutralizes formulas including whitespace and escapes quotes/newlines', () => {
    for (const value of ['=cmd()', '+cmd()', '-cmd()', '@cmd()', '  =cmd()', '\tcmd()']) {
      assert.ok(evidenceCsvCell(value).startsWith('"\''));
    }
    assert.equal(evidenceCsvCell('memo,"one"\nline'), '"memo,""one""\nline"');
    assert.equal(evidenceCsvCell(null), '""');
  });

  const data = {
    network: 'mainnet', query: { address: 'GTEST', direction: 'both', cursor: 'opaque' },
    coverage: { latestObservedLedger: 105, completeHistoryVerified: false },
    events: [{ id: '9007199254740993', ledger: 100, operationId: '268341957822431233', txHash: 'a'.repeat(64),
      sourceAsset: { key: 'native:XLM' }, destinationAsset: { key: 'native:XLM' },
      sourceAmount: '99999999999.1234567', destinationAmount: '0.0000001', memo: '=HYPERLINK("unsafe")' }],
  };

  it('keeps bigint IDs and exact decimal strings and labels page scope', () => {
    const csv = investigationCsv(data);
    assert.match(csv, /"9007199254740993"/);
    assert.match(csv, /"99999999999.1234567"/);
    assert.match(csv, /"current_page"/);
    assert.match(csv, /"'\=HYPERLINK/);
    assert.ok(csv.endsWith('\r\n'));
  });

  it('includes query, coverage, export time and only the returned events in JSON', () => {
    const exported = JSON.parse(investigationJson(data));
    assert.equal(exported.exportScope, 'current_page');
    assert.equal(exported.query.cursor, 'opaque');
    assert.equal(exported.coverage.completeHistoryVerified, false);
    assert.equal(exported.events.length, 1);
    assert.equal(exported.events[0].id, '9007199254740993');
    assert.ok(Date.parse(exported.exportedAt));
  });
});
