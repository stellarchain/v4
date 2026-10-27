import { Address, scValToNative, xdr } from '@stellar/stellar-sdk';

export interface ContractStateField {
  label: string;
  value: string;
  address?: string;
}

export function formatContractObservation(value?: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toLocaleString('en-GB', {
    timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }) + ' UTC';
}

export function contractStateFields(entries: Array<{ key: string; value: string }>): ContractStateField[] {
  const fields: ContractStateField[] = [];
  const labels: Record<string, string> = {
    Admin: 'Administrator', Owner: 'Owner', PendingOwner: 'Pending owner',
    CarbonID: 'CARBON contract', CarbonSinkID: 'CarbonSINK contract', ContractSuccessor: 'Successor contract',
    IsActive: 'Active', IsPaused: 'Paused', SinkMinimum: 'Minimum sink amount (raw)',
  };
  for (const entry of entries) {
    try {
      const decodedKey: unknown = scValToNative(xdr.ScVal.fromXDR(entry.key, 'base64'));
      const key = Array.isArray(decodedKey) && decodedKey.length === 1 ? decodedKey[0] : decodedKey;
      if (typeof key !== 'string' || !Object.hasOwn(labels, key)) continue;
      let value: unknown;
      try {
        value = scValToNative(xdr.ScVal.fromXDR(entry.value, 'base64'));
      } catch {
        const data = xdr.LedgerEntryData.fromXDR(entry.value, 'base64');
        if (data.switch().name !== 'contractData') continue;
        value = scValToNative(data.contractData().val());
      }
      if (key === 'IsActive' || key === 'IsPaused') {
        if (typeof value === 'boolean') fields.push({ label: labels[key], value: value ? 'Yes' : 'No' });
      } else if (key === 'SinkMinimum') {
        if ((typeof value === 'bigint' || typeof value === 'string' || typeof value === 'number') && /^-?\d+$/.test(String(value))) {
          fields.push({ label: labels[key], value: String(value) });
        }
      } else if (typeof value === 'string') {
        const address = new Address(value).toString();
        fields.push({ label: labels[key], value: address, address });
      }
    } catch {
      // Unknown or malformed storage must not turn into guessed contract metadata.
    }
  }
  return fields;
}
