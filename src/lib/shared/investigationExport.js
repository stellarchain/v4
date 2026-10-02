/** CSV cells are always quoted, and untrusted spreadsheet formulas are inert. */
export function evidenceCsvCell(value) {
  const text = value == null ? '' : String(value);
  const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

/** @param {import('./interfaces').PaymentFlowInvestigationResponse} investigation */
export function investigationCsv(investigation) {
  const columns = ['network', 'scope', 'query', 'direction', 'hop_depth', 'operation_filter', 'asset_filter', 'min_asset_amount', 'ledger_from', 'ledger_to', 'date_from_utc', 'date_to_utc', 'cursor',
    'latest_observed_ledger', 'asset_index_first_built_ledger', 'asset_index_latest_built_ledger',
    'complete_history_verified', 'event_id', 'ledger', 'closed_at_utc', 'tx_hash',
    'operation_id', 'operation_type', 'from_address', 'to_address', 'source_asset', 'source_amount',
    'destination_asset', 'destination_amount', 'memo_type', 'memo'];
  const rows = investigation.events.map((event) => [
    investigation.network, 'current_page', investigation.query.address ?? investigation.query.txHash ?? investigation.query.asset,
    investigation.query.direction, investigation.query.depth ?? 1, investigation.query.operationType, investigation.query.asset, investigation.query.minAssetAmount, investigation.query.ledgerFrom,
    investigation.query.ledgerTo, investigation.query.dateFrom, investigation.query.dateTo,
    investigation.query.cursor, investigation.coverage.latestObservedLedger,
    investigation.coverage.assetIndexFirstBuiltLedger, investigation.coverage.assetIndexLatestBuiltLedger,
    false, event.id, event.ledger, event.closedAt, event.txHash, event.operationId, event.operationType,
    event.fromAddress, event.toAddress, event.sourceAsset.key, event.sourceAmount,
    event.destinationAsset.key, event.destinationAmount, event.memoType, event.memo,
  ]);
  return [columns, ...rows].map((row) => row.map(evidenceCsvCell).join(',')).join('\r\n') + '\r\n';
}

/** @param {import('./interfaces').PaymentFlowInvestigationResponse} investigation */
export function investigationJson(investigation) {
  return JSON.stringify({ exportScope: 'current_page', exportedAt: new Date().toISOString(), ...investigation }, null, 2);
}

export function evidenceHtmlText(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

/** @param {import('./interfaces').PaymentFlowInvestigationResponse} investigation */
export function investigationReportHtml(investigation) {
  const safe = evidenceHtmlText;
  const query = investigation.query.address ?? investigation.query.txHash ?? investigation.query.asset ?? 'Unknown target';
  const signals = investigation.riskContext.signals.map((signal) =>
    `<li><strong>${safe(signal.label)}</strong> — ${safe(signal.description)}</li>`).join('');
  const limitations = [
    ...investigation.riskContext.limitations,
    ...(investigation.trace?.depthReturned === 2 ? [investigation.trace.note] : []),
    ...(investigation.query.minAssetAmount
      ? [`Minimum matching amount: ${investigation.query.minAssetAmount} ${investigation.query.asset ?? ''} (source or destination).`]
      : []),
  ].map((item) => `<li>${safe(item)}</li>`).join('');
  const rows = investigation.events.map((event) => `<tr><td>${safe(event.ledger)}</td><td>${safe(event.closedAt)}</td><td>${safe(event.txHash)}</td><td>${safe(event.operationType)}</td><td>${safe(event.fromAddress)}</td><td>${safe(event.toAddress)}</td><td>${safe(event.sourceAmount)} ${safe(event.sourceAsset.key)}</td><td>${safe(event.destinationAmount)} ${safe(event.destinationAsset.key)}</td><td>${safe(event.memo)}</td></tr>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>StellarChain investigation report — current page</title><style>body{font:14px/1.5 system-ui,sans-serif;color:#172334;margin:2rem auto;max-width:1100px;padding:0 1rem}h1,h2{line-height:1.2}small,.muted{color:#475569}.notice{padding:1rem;border:1px solid #94a3b8;border-radius:.5rem;background:#f8fafc}dl{display:grid;grid-template-columns:150px 1fr;gap:.4rem 1rem}dt{font-weight:600}dd{margin:0;overflow-wrap:anywhere}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #cbd5e1;padding:.45rem;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#f1f5f9}.scroll{overflow-x:auto}ul{padding-left:1.25rem}code{overflow-wrap:anywhere}@media print{body{margin:0}.scroll{overflow:visible}table{font-size:9px}thead{display:table-header-group}tr{break-inside:avoid}}</style></head><body><h1>StellarChain investigation report</h1><p class="notice"><strong>Current page only.</strong> This report includes ${safe(investigation.events.length)} returned payment-flow events, not complete account history. Signals are heuristics, not fraud or safety verdicts. ${safe(investigation.coverage.note)}</p><dl><dt>Network</dt><dd>${safe(investigation.network)}</dd><dt>Target</dt><dd><code>${safe(query)}</code></dd><dt>Direction</dt><dd>${safe(investigation.query.direction)}</dd><dt>Hop depth</dt><dd>${safe(investigation.query.depth ?? 1)}</dd><dt>Candidate paths</dt><dd>${safe(investigation.trace?.candidatePaths.length ?? 0)}${investigation.trace?.truncated ? ' (bounded/truncated)' : ''}</dd><dt>Operation</dt><dd>${safe(investigation.query.operationType ?? 'All')}</dd><dt>Asset</dt><dd>${safe(investigation.query.asset ?? 'All')}</dd><dt>UTC date range</dt><dd>${safe(investigation.query.dateFrom ?? 'Open')} to ${safe(investigation.query.dateTo ?? 'Open')}</dd><dt>Ledger range</dt><dd>${safe(investigation.query.ledgerFrom ?? 'Open')} to ${safe(investigation.query.ledgerTo ?? 'Open')}</dd><dt>Latest observed ledger</dt><dd>${safe(investigation.coverage.latestObservedLedger)}</dd><dt>Exported at (UTC)</dt><dd>${safe(new Date().toISOString())}</dd></dl><h2>Page summary</h2><p>${safe(investigation.summary.events)} events · ${safe(investigation.summary.transactions)} transactions · ${safe(investigation.summary.uniqueCounterparties)} counterparties · ${safe(investigation.summary.uniqueAssets)} assets</p><h2>Context signals</h2>${signals ? `<ul>${signals}</ul>` : '<p>No signals on this page.</p>'}<h2>Limitations</h2>${limitations ? `<ul>${limitations}</ul>` : '<p>No additional limitations supplied.</p>'}<h2>Evidence</h2><div class="scroll"><table><thead><tr><th>Ledger</th><th>Closed (UTC)</th><th>Transaction</th><th>Operation</th><th>From</th><th>To</th><th>Source amount / asset</th><th>Destination amount / asset</th><th>Memo</th></tr></thead><tbody>${rows}</tbody></table></div></body></html>`;
}
