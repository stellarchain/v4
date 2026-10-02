import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evidenceCsvCell, evidenceHtmlText, investigationCsv, investigationJson, investigationReportHtml } from './investigationExport.js';

describe('Investigator evidence exports', () => {
  it('neutralizes formulas including whitespace and escapes quotes/newlines', () => {
    for (const value of ['=cmd()', '+cmd()', '-cmd()', '@cmd()', '  =cmd()', '\tcmd()']) {
      assert.ok(evidenceCsvCell(value).startsWith('"\''));
    }
    assert.equal(evidenceCsvCell('memo,"one"\nline'), '"memo,""one""\nline"');
    assert.equal(evidenceCsvCell(null), '""');
  });

  const data = {
    network: 'mainnet', query: { address: 'GTEST', direction: 'both', asset: 'native:XLM', minAssetAmount: '0.0000001', dateFrom: '2026-05-15', dateTo: '2026-05-16', cursor: 'opaque' },
    coverage: { latestObservedLedger: 105, assetIndexFirstBuiltLedger: 90, assetIndexLatestBuiltLedger: 100, completeHistoryVerified: false },
    events: [{ id: '9007199254740993', ledger: 100, operationId: '268341957822431233', txHash: 'a'.repeat(64),
      sourceAsset: { key: 'native:XLM' }, destinationAsset: { key: 'native:XLM' },
      sourceAmount: '99999999999.1234567', destinationAmount: '0.0000001', memo: '=HYPERLINK("unsafe")' }],
  };

  it('keeps bigint IDs and exact decimal strings and labels page scope', () => {
    const csv = investigationCsv(data);
    assert.match(csv, /"9007199254740993"/);
    assert.match(csv, /"99999999999.1234567"/);
    assert.match(csv, /"current_page"/);
    assert.match(csv, /"asset_filter"/);
    assert.match(csv, /"min_asset_amount"/);
    assert.match(csv, /"0.0000001"/);
    assert.match(csv, /"date_from_utc"/);
    assert.match(csv, /"2026-05-15"/);
    assert.match(csv, /"native:XLM"/);
    assert.match(csv, /"asset_index_first_built_ledger"/);
    assert.match(csv, /"90"/);
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

  it('uses the asset as the report target for asset-only investigations', () => {
    const assetOnly = {
      ...data,
      query: { ...data.query, address: null, txHash: null, targetType: 'asset' },
      summary: { events: 1, transactions: 1, uniqueCounterparties: 0, uniqueAssets: 1 },
      riskContext: { signals: [], limitations: ['Asset-index coverage may contain gaps.'] },
    };

    assert.match(investigationCsv(assetOnly), /"native:XLM"/);
    assert.match(investigationReportHtml(assetOnly), /<dt>Target<\/dt><dd><code>native:XLM<\/code><\/dd>/);
  });

  it('escapes untrusted report evidence and states page scope', () => {
    const report = investigationReportHtml({ ...data,
      query: { ...data.query, address: '<script>alert(1)</script>' },
      summary: { events: 1, transactions: 1, uniqueCounterparties: 1, uniqueAssets: 1 },
      riskContext: { signals: [{ label: '<b>Risk</b>', description: 'Review' }], limitations: ['Only the selected page'] },
      events: [{ ...data.events[0], memo: '<img src=x onerror=alert(1)>', fromAddress: 'GTEST', toAddress: 'GOTHER' }],
    });
    assert.match(report, /Current page only/);
    assert.match(report, /Minimum matching amount: 0.0000001 native:XLM/);
    assert.match(report, /&lt;script&gt;/);
    assert.match(report, /&lt;img src=x onerror=alert\(1\)&gt;/);
    assert.doesNotMatch(report, /<script>alert\(1\)<\/script>/);
    assert.match(report, /Content-Security-Policy/);
    assert.equal(evidenceHtmlText('"<&'), '&quot;&lt;&amp;');
  });
});
