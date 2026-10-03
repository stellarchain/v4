export interface ChartMetric {
  key: string;
  label: string;
  group: string;
  description: string;
  valueLabel: string;
  note?: string;
  showTrend?: boolean;
}

export const CHART_METRICS = [
  { key: 'trades', label: 'DEX trades involving XLM', group: 'Markets', description: 'Count of indexed trades in pairs containing native XLM.', valueLabel: 'Trades' },
  { key: 'dex-vol-xlm', label: 'DEX volume on the XLM side', group: 'Markets', description: 'XLM-side volume of indexed trades in pairs containing native XLM.', valueLabel: 'XLM' },
  { key: 'xlm-total-pay', label: 'XLM payment volume', group: 'Payments', description: 'Native-asset amounts recorded in indexed payment-operation details.', valueLabel: 'XLM' },
  { key: 'ledgers', label: 'Closed ledgers', group: 'Network', description: 'Number of indexed ledgers closed within each UTC bucket.', valueLabel: 'Ledgers' },
  { key: 'tps', label: 'Transactions per second', group: 'Network', description: 'Average of indexed five-minute transaction-per-second rates.', valueLabel: 'Transactions / second' },
  { key: 'ops', label: 'Operations per second', group: 'Network', description: 'Average of indexed five-minute operation-per-second rates.', valueLabel: 'Operations / second' },
  { key: 'tx-ledger', label: 'Transactions per ledger', group: 'Network', description: 'Average of indexed five-minute transaction-per-ledger ratios.', valueLabel: 'Transactions / ledger' },
  { key: 'tx-success', label: 'Successful transactions', group: 'Network', description: 'Indexed successful transaction count in each UTC bucket.', valueLabel: 'Transactions' },
  { key: 'tx-failed', label: 'Failed transactions', group: 'Network', description: 'Indexed failed transaction count in each UTC bucket.', valueLabel: 'Transactions' },
  { key: 'ops-ledger', label: 'Operations per ledger', group: 'Network', description: 'Average of indexed five-minute operation-per-ledger ratios.', valueLabel: 'Operations / ledger' },
  { key: 'transactions', label: 'Transactions', group: 'Network', description: 'Indexed transaction count, including successful and failed transactions.', valueLabel: 'Transactions' },
  { key: 'operations', label: 'Operations', group: 'Network', description: 'Indexed operation count in each UTC bucket.', valueLabel: 'Operations' },
  { key: 'avg-ledger-sec', label: 'Average ledger close time', group: 'Network', description: 'Average of indexed five-minute mean ledger gaps; longer buckets are not ledger-weighted.', valueLabel: 'Seconds' },
  { key: 'output-value', label: 'Payment amount field (mixed assets)', group: 'Payments', description: 'Indexed operation amounts added across asset types; values have no common unit.', valueLabel: 'Mixed asset units', note: 'Do not interpret these values as a comparable volume or a single-asset total. The trend is withheld until amounts are grouped by asset.', showTrend: false },
  { key: 'invocations', label: 'Contract invocation matches', group: 'Contracts', description: 'Indexed operations whose details contain an InvokeContract marker.', valueLabel: 'Matches', note: 'This is a detail-text match, not a complete verified count of every invocation.' },
  { key: 'contracts', label: 'Contract creation matches', group: 'Contracts', description: 'Indexed operations whose details contain a CreateContract marker.', valueLabel: 'Matches', note: 'This is a detail-text match, not a complete verified count of every deployment.' },
  { key: 'fee-charged', label: 'Fees charged (raw)', group: 'Network', description: 'Sum of indexed Horizon fee_charged fields in each UTC bucket.', valueLabel: 'Raw fee units' },
  { key: 'max-fee', label: 'Peak summed fee limit (raw)', group: 'Network', description: 'Largest five-minute sum of indexed Horizon max_fee fields within each displayed bucket.', valueLabel: 'Raw fee units', note: 'This is not the maximum fee of an individual transaction.' },
  { key: 'active-addresses', label: 'Active transaction sources', group: 'Accounts', description: 'Distinct transaction source accounts in each indexed five-minute bucket.', valueLabel: 'Source accounts', note: 'Only five-minute buckets are available. Distinct accounts over an hour or day cannot be reconstructed by summing or averaging five-minute counts.' },
  { key: 'accounts-created', label: 'Accounts created', group: 'Accounts', description: 'Indexed create-account operation count in each UTC bucket.', valueLabel: 'Operations' },
  { key: 'accounts-merged', label: 'Accounts merged', group: 'Accounts', description: 'Indexed account-merge operation count in each UTC bucket.', valueLabel: 'Operations' },
] as const satisfies readonly ChartMetric[];

export type ChartMetricKey = typeof CHART_METRICS[number]['key'];

export function chartMetric(key: string): ChartMetric | null {
  return CHART_METRICS.find((metric) => metric.key === key) ?? null;
}
