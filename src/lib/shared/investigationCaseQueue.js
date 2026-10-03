import { StrKey } from '@stellar/stellar-sdk';

export const CASE_QUEUE_STORAGE_KEY = 'stellarchain-investigator-case-queue-v1';
export const CASE_QUEUE_LIMIT = 100;
const NETWORKS = new Set(['mainnet', 'testnet', 'futurenet']);

export function normalizeCaseTarget(value) {
  if (typeof value !== 'string') return null;
  const target = value.trim();
  if (StrKey.isValidEd25519PublicKey(target.toUpperCase())) {
    return { type: 'address', value: target.toUpperCase() };
  }
  if (/^[a-fA-F0-9]{64}$/.test(target)) {
    return { type: 'transaction', value: target.toLowerCase() };
  }
  return null;
}

export function caseQueueKey(entry) {
  return `${entry.network}:${entry.type}:${entry.value}`;
}

export function parseCaseQueue(raw) {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.entries) || parsed.entries.length > CASE_QUEUE_LIMIT) {
    throw new Error('Invalid or unsupported case queue file.');
  }
  const entries = [];
  const keys = new Set();
  for (const entry of parsed.entries) {
    if (!entry || !NETWORKS.has(entry.network) || typeof entry.savedAt !== 'string'
      || Number.isNaN(Date.parse(entry.savedAt)) || typeof entry.watching !== 'boolean') {
      throw new Error('The case queue contains an invalid entry.');
    }
    const target = normalizeCaseTarget(entry.value);
    if (!target || target.type !== entry.type) throw new Error('The case queue contains an invalid target.');
    const normalized = { network: entry.network, ...target, savedAt: entry.savedAt, watching: entry.watching };
    const key = caseQueueKey(normalized);
    if (keys.has(key)) throw new Error('The case queue contains duplicate targets.');
    keys.add(key);
    entries.push(normalized);
  }
  return entries;
}

export function serializeCaseQueue(entries) {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), entries }, null, 2);
}

export function mergeCaseQueues(current, incoming) {
  const merged = [...current];
  const keys = new Set(current.map(caseQueueKey));
  for (const entry of incoming) {
    if (keys.has(caseQueueKey(entry))) continue;
    if (merged.length >= CASE_QUEUE_LIMIT) throw new Error(`Case queue limit is ${CASE_QUEUE_LIMIT} entries.`);
    merged.push(entry);
    keys.add(caseQueueKey(entry));
  }
  return merged;
}
