const BALANCE_KEYS = [
  'authorized',
  'authorized_to_maintain_liabilities',
  'unauthorized',
];

function toFiniteNumber(value) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

/**
 * @param {Record<string, unknown>} record
 * @returns {number}
 */
export function sumHorizonAssetSupply(record) {
  const balances = record.balances && typeof record.balances === 'object'
    ? record.balances
    : {};
  let supply = 0;

  for (const key of BALANCE_KEYS) {
    supply += toFiniteNumber(balances[key]);
  }

  supply += toFiniteNumber(record.claimable_balances_amount);
  supply += toFiniteNumber(record.liquidity_pools_amount);
  supply += toFiniteNumber(record.contracts_amount);

  return supply;
}
