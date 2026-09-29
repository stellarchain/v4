/** CSV cells are always quoted, and untrusted spreadsheet formulas are inert. */
export function evidenceCsvCell(value) {
  const text = value == null ? '' : String(value);
  const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

/** @param {import('./interfaces').PaymentFlowInvestigationResponse} investigation */
export function investigationCsv(investigation) {
  const columns = ['network', 'scope', 'query', 'direction', 'operation_filter', 'ledger_from', 'ledger_to', 'cursor',
    'latest_observed_ledger', 'complete_history_verified', 'event_id', 'ledger', 'closed_at_utc', 'tx_hash',
    'operation_id', 'operation_type', 'from_address', 'to_address', 'source_asset', 'source_amount',
    'destination_asset', 'destination_amount', 'memo_type', 'memo'];
  const rows = investigation.events.map((event) => [
    investigation.network, 'current_page', investigation.query.address ?? investigation.query.txHash,
    investigation.query.direction, investigation.query.operationType, investigation.query.ledgerFrom,
    investigation.query.ledgerTo, investigation.query.cursor, investigation.coverage.latestObservedLedger,
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
