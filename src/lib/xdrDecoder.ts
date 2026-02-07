// XDR Decoder for Soroban Transaction Results
// Decodes result_meta_xdr to extract invocation traces, events, and return values

import { xdr, scValToNative, Address, StrKey } from '@stellar/stellar-sdk';

// ============================================================================
// Types
// ============================================================================

export interface DecodedScVal {
  type: string;
  value: unknown;
  display: string;
}

export interface InvocationCall {
  type: 'fn_call' | 'fn_return' | 'event';
  contractId?: string;
  functionName?: string;
  args?: DecodedScVal[];
  returnValue?: DecodedScVal;
  depth: number;
  successful?: boolean;
}

export interface ContractEvent {
  type: string;
  contractId?: string;
  topics: DecodedScVal[];
  data?: DecodedScVal;
}

export interface SorobanMetrics {
  cpuInsns?: string;
  memBytes?: string;
  readBytes?: string;
  writeBytes?: string;
  readEntries?: number;
  writeEntries?: number;
  // Extended metrics from SorobanTransactionMetaExtV1
  txByteRead?: number;
  txByteWrite?: number;
  totalNonRefundableResourceFeeCharged?: string;
  totalRefundableResourceFeeCharged?: string;
  rentFeeCharged?: string;
}

export interface StateChange {
  type: 'created' | 'updated' | 'removed';
  contractId?: string;
  key?: DecodedScVal;
  valueBefore?: DecodedScVal;
  valueAfter?: DecodedScVal;
  durability?: 'persistent' | 'temporary' | 'instance';
}

export interface ParsedContractEvent {
  type: string;
  contractId?: string;
  topics: DecodedScVal[];
  data?: DecodedScVal;
  // Enhanced event categorization
  eventName?: string;
  category?: 'transfer' | 'approval' | 'mint' | 'burn' | 'trade' | 'liquidity' | 'state' | 'other';
  decodedParams?: Record<string, DecodedScVal>;
}

export interface DecodedTransactionMeta {
  returnValue?: DecodedScVal;
  events: ContractEvent[];
  parsedEvents: ParsedContractEvent[];
  invocationTrace: InvocationCall[];
  stateChanges: StateChange[];
  metrics?: SorobanMetrics;
  success: boolean;
  error?: string;
}

// ============================================================================
// ScVal Decoding
// ============================================================================

/**
 * Decode an ScVal to a displayable format
 */
function decodeScVal(scVal: xdr.ScVal): DecodedScVal {
  try {
    const type = scVal.switch().name;
    let value: unknown;
    let display: string;

    switch (type) {
      case 'scvVoid':
        value = null;
        display = 'void';
        break;
      case 'scvBool':
        value = scVal.b();
        display = value ? 'true' : 'false';
        break;
      case 'scvU32': {
        const u32Val = scVal.u32();
        value = u32Val;
        display = u32Val.toString();
        break;
      }
      case 'scvI32': {
        const i32Val = scVal.i32();
        value = i32Val;
        display = i32Val.toString();
        break;
      }
      case 'scvU64':
        value = scVal.u64().toString();
        display = value as string;
        break;
      case 'scvI64':
        value = scVal.i64().toString();
        display = value as string;
        break;
      case 'scvU128':
        value = scValToNative(scVal);
        display = value?.toString() || '0';
        break;
      case 'scvI128':
        value = scValToNative(scVal);
        display = value?.toString() || '0';
        break;
      case 'scvU256':
      case 'scvI256':
        value = scValToNative(scVal);
        display = value?.toString() || '0';
        break;
      case 'scvBytes':
        const bytes = scVal.bytes();
        value = Buffer.from(bytes).toString('hex');
        display = `0x${(value as string).slice(0, 16)}${(value as string).length > 16 ? '...' : ''}`;
        break;
      case 'scvString':
        value = scVal.str().toString();
        display = `"${value}"`;
        break;
      case 'scvSymbol':
        value = scVal.sym().toString();
        display = value as string;
        break;
      case 'scvAddress':
        try {
          const addr = Address.fromScVal(scVal);
          value = addr.toString();
          display = shortenAddress(value as string);
        } catch {
          value = 'address';
          display = 'Address';
        }
        break;
      case 'scvVec':
        const vec = scVal.vec();
        if (vec) {
          const items = vec.map(v => decodeScVal(v));
          value = items.map(i => i.value);
          display = `[${items.map(i => i.display).join(', ')}]`;
          if (display.length > 50) {
            display = `[${items.length} items]`;
          }
        } else {
          value = [];
          display = '[]';
        }
        break;
      case 'scvMap':
        const map = scVal.map();
        if (map) {
          const entries: Record<string, unknown> = {};
          const displayParts: string[] = [];
          for (const entry of map) {
            const key = decodeScVal(entry.key());
            const val = decodeScVal(entry.val());
            entries[key.display] = val.value;
            displayParts.push(`${key.display}: ${val.display}`);
          }
          value = entries;
          display = `{${displayParts.slice(0, 3).join(', ')}${displayParts.length > 3 ? ', ...' : ''}}`;
        } else {
          value = {};
          display = '{}';
        }
        break;
      case 'scvContractInstance':
        value = 'ContractInstance';
        display = 'ContractInstance';
        break;
      case 'scvLedgerKeyContractInstance':
        value = 'LedgerKeyContractInstance';
        display = 'LedgerKey';
        break;
      case 'scvLedgerKeyNonce':
        value = 'LedgerKeyNonce';
        display = 'Nonce';
        break;
      case 'scvTimepoint':
        value = scVal.timepoint().toString();
        display = `Timepoint(${value})`;
        break;
      case 'scvDuration':
        value = scVal.duration().toString();
        display = `Duration(${value})`;
        break;
      case 'scvError':
        const err = scVal.error();
        value = err.switch().name;
        display = `Error(${value})`;
        break;
      default:
        try {
          value = scValToNative(scVal);
          display = JSON.stringify(value);
          if (display.length > 50) {
            display = display.slice(0, 47) + '...';
          }
        } catch {
          value = type;
          display = type;
        }
    }

    return { type, value, display };
  } catch (error) {
    return { type: 'unknown', value: null, display: 'Unable to decode' };
  }
}

function shortenAddress(address: string): string {
  if (address.length <= 11) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

// ============================================================================
// Event Decoding
// ============================================================================

function decodeContractEvent(eventOrWrapper: xdr.ContractEvent | any): ContractEvent | null {
  try {
    let event = eventOrWrapper;
    // Handle StoredTransactionEvent wrapper (TransactionMetaV4)
    if (typeof eventOrWrapper.event === 'function') {
      event = eventOrWrapper.event();
    }

    const type = event.type().name;
    let contractId: string | undefined;

    // Get contract ID if present
    const contractIdBuf = event.contractId();
    if (contractIdBuf) {
      try {
        // contractIdBuf is a raw 32-byte hash, encode it as a contract address
        contractId = StrKey.encodeContract(Buffer.from(contractIdBuf as unknown as ArrayBuffer));
      } catch {
        try {
          contractId = Buffer.from(contractIdBuf as unknown as ArrayBuffer).toString('hex');
        } catch {
          contractId = undefined;
        }
      }
    }

    // Decode body
    const body = event.body();
    const topics: DecodedScVal[] = [];
    let data: DecodedScVal | undefined;

    try {
      // Try to access v0 body (most common case)
      const v0 = body.v0();
      if (v0) {
        for (const topic of v0.topics()) {
          topics.push(decodeScVal(topic));
        }
        data = decodeScVal(v0.data());
      }
    } catch {
      // Body format not supported
    }

    return { type, contractId, topics, data };
  } catch {
    return null;
  }
}

// ============================================================================
// Diagnostic Event Decoding (for invocation trace)
// ============================================================================

function decodeDiagnosticEvent(event: xdr.DiagnosticEvent): InvocationCall | null {
  try {
    const inSuccessfulCall = event.inSuccessfulContractCall();
    const contractEvent = event.event();

    const type = contractEvent.type().name;
    let contractId: string | undefined;

    const contractIdBuf = contractEvent.contractId();
    if (contractIdBuf) {
      try {
        // contractIdBuf is a raw 32-byte hash, encode it as a contract address
        contractId = StrKey.encodeContract(Buffer.from(contractIdBuf as unknown as ArrayBuffer));
      } catch {
        try {
          contractId = Buffer.from(contractIdBuf as unknown as ArrayBuffer).toString('hex');
        } catch {
          contractId = undefined;
        }
      }
    }

    const body = contractEvent.body();
    let v0;
    try {
      v0 = body.v0();
    } catch {
      return null;
    }
    if (!v0) return null;

    const topics = v0.topics();

    if (topics.length === 0) return null;

    const firstTopic = decodeScVal(topics[0]);

    // Check for fn_call
    if (firstTopic.value === 'fn_call' && topics.length >= 2) {
      let functionName = 'unknown';
      let argsStart = 2;
      let targetContractId = contractId; // Default to event source if not in topics

      const secondTopic = decodeScVal(topics[1]);

      // Heuristic: If 2nd topic is Address or Bytes (32b) and we have a 3rd topic (Function), 
      // then topics structure is [fn_call, ContractID, FunctionName, ...args]
      const isContractId = secondTopic.type === 'scvAddress' ||
        (secondTopic.type === 'scvBytes' && (secondTopic.value as string).replace(/^0x/, '').length === 64);

      if (topics.length >= 3 && isContractId) {
        // Try to encode the contract ID
        const extractedId = extractContractIdFromScVal(topics[1]);
        if (extractedId) {
          targetContractId = extractedId;
        } else if (secondTopic.type === 'scvBytes') {
          // If bytes, might be a contract hash we can't easily encode to C-address without type, 
          // or it IS the contract ID in hex. 
          // Try to treat as contract address if possible, otherwise keep as is?
          // Actually extractContractIdFromScVal only handles scvAddress.
          // Let's rely on StrKey if possible or just use display.
          try {
            // If it's pure bytes, it might be the hash.
            const rawBytes = Buffer.from((secondTopic.value as string).replace(/^0x/, ''), 'hex');
            targetContractId = StrKey.encodeContract(rawBytes);
          } catch {
            targetContractId = secondTopic.display;
          }
        }

        const fnNameTopic = decodeScVal(topics[2]);
        functionName = fnNameTopic.display;
        argsStart = 3;
      } else {
        // Standard: [fn_call, FunctionName, ...args]
        functionName = secondTopic.display;
        argsStart = 2;
      }

      const args: DecodedScVal[] = [];
      for (let i = argsStart; i < topics.length; i++) {
        args.push(decodeScVal(topics[i]));
      }

      // Data might also contain args (for some SDK versions/events)
      const data = v0.data();
      const decodedData = decodeScVal(data);
      if (decodedData.type === 'scvVec') {
        try {
          const vec = data.vec();
          if (vec) {
            for (const arg of vec) {
              args.push(decodeScVal(arg));
            }
          }
        } catch { /* Not a vec */ }
      } else if (decodedData.type !== 'scvVoid') {
        // If data is present and not void, and not a vec of args, what is it? return value? 
        // For fn_call, it's usually args list.
        args.push(decodedData);
      }

      return {
        type: 'fn_call',
        contractId: targetContractId,
        functionName,
        args,
        depth: 0,
        successful: inSuccessfulCall,
      };
    }

    // Check for fn_return
    if (firstTopic.value === 'fn_return' && topics.length >= 2) {
      let functionName = 'unknown';
      let targetContractId = contractId;

      const secondTopic = decodeScVal(topics[1]);

      // Similar heuristic for return
      const isContractId = secondTopic.type === 'scvAddress' ||
        (secondTopic.type === 'scvBytes' && (secondTopic.value as string).replace(/^0x/, '').length === 64);

      if (topics.length >= 3 && isContractId) {
        // Extract contract ID
        const extractedId = extractContractIdFromScVal(topics[1]);
        if (extractedId) targetContractId = extractedId;
        else {
          try {
            const rawBytes = Buffer.from((secondTopic.value as string).replace(/^0x/, ''), 'hex');
            targetContractId = StrKey.encodeContract(rawBytes);
          } catch {
            targetContractId = secondTopic.display;
          }
        }

        const fnNameTopic = decodeScVal(topics[2]);
        functionName = fnNameTopic.display;
      } else {
        functionName = secondTopic.display;
      }

      const returnValue = decodeScVal(v0.data());

      return {
        type: 'fn_return',
        contractId: targetContractId,
        functionName,
        returnValue,
        depth: 0,
        successful: inSuccessfulCall,
      };
    }

    // Regular event
    const decodedTopics = topics.map(t => decodeScVal(t));

    // For regular events, we capture the data too as a 'returnValue'-like field 
    // or just stick it in args or add a new field. InvocationCall has args?: DecodedScVal[].
    // Let's put topics in 'args' and data in 'returnValue' (optional) or maybe better to follow the ContractEvent structure.
    // However InvocationCall is limited.
    // Let's use 'args' for topics.

    const decodedData = decodeScVal(v0.data());

    return {
      type: 'event',
      contractId,
      depth: 0,
      successful: inSuccessfulCall,
      args: decodedTopics,
      returnValue: decodedData.type !== 'scvVoid' ? decodedData : undefined
    };
  } catch {
    return null;
  }
}

// ============================================================================
// State Change Extraction from LedgerEntryChanges
// ============================================================================

function extractStateChanges(meta: xdr.TransactionMeta): StateChange[] {
  const stateChanges: StateChange[] = [];

  try {
    let version = 0;
    const sw = meta.switch();
    // Handle different SDK versions where switch() returns number or object
    if (typeof sw === 'number') {
      version = sw;
    } else if (sw && typeof sw === 'object' && 'value' in sw) {
      version = (sw as any).value;
    }

    let operations: xdr.OperationMeta[] = [];

    if (version === 3) {
      const v3 = meta.v3();
      operations = v3.operations();
    } else if (version === 4) {
      // v4 support
      const v4 = (meta as any).v4();
      operations = v4.operations();
    }

    for (const opMeta of operations) {
      const changes = opMeta.changes();
      processLedgerEntryChanges(changes, stateChanges);
    }
  } catch {
    // State changes extraction not supported for this version
  }

  return stateChanges;
}

function processLedgerEntryChanges(changes: xdr.LedgerEntryChange[], stateChanges: StateChange[]): void {
  let previousState: Map<string, xdr.LedgerEntry> = new Map();

  for (const change of changes) {
    try {
      const changeType = change.switch().name;

      if (changeType === 'ledgerEntryState') {
        // STATE: Records the entry before modification
        const entry = change.state();
        const key = getLedgerEntryKey(entry);
        if (key) {
          previousState.set(key, entry);
        }
      } else if (changeType === 'ledgerEntryCreated') {
        // CREATED: New entry added
        const entry = change.created();
        const stateChange = extractContractDataChange('created', entry);
        if (stateChange) {
          stateChanges.push(stateChange);
        }
      } else if (changeType === 'ledgerEntryUpdated') {
        // UPDATED: Entry modified
        const entry = change.updated();
        const key = getLedgerEntryKey(entry);
        const before = key ? previousState.get(key) : undefined;
        const stateChange = extractContractDataChange('updated', entry, before);
        if (stateChange) {
          stateChanges.push(stateChange);
        }
      } else if (changeType === 'ledgerEntryRemoved') {
        // REMOVED: Entry deleted
        const ledgerKey = change.removed();
        const stateChange = extractRemovedEntry(ledgerKey, previousState);
        if (stateChange) {
          stateChanges.push(stateChange);
        }
      }
    } catch {
      // Skip individual change if it fails
    }
  }
}

function getLedgerEntryKey(entry: xdr.LedgerEntry): string | null {
  try {
    const data = entry.data();
    const entryType = data.switch().name;

    if (entryType === 'contractData') {
      const contractData = data.contractData();
      const contract = contractData.contract();
      const key = contractData.key();
      return `${contract.toXDR('hex')}-${key.toXDR('hex')}`;
    }
    return null;
  } catch {
    return null;
  }
}

function extractContractDataChange(
  type: 'created' | 'updated',
  entry: xdr.LedgerEntry,
  beforeEntry?: xdr.LedgerEntry
): StateChange | null {
  try {
    const data = entry.data();
    const entryType = data.switch().name;

    if (entryType === 'contractData') {
      const contractData = data.contractData();
      const contract = contractData.contract();
      let contractId: string | undefined;

      try {
        const contractType = contract.switch().name;
        if (contractType === 'scAddressTypeContract') {
          const contractHash = contract.contractId();
          contractId = StrKey.encodeContract(Buffer.from(contractHash as unknown as ArrayBuffer));
        }
      } catch {
        // Unable to extract contract ID
      }

      const key = decodeScVal(contractData.key());
      const valueAfter = decodeScVal(contractData.val());

      let valueBefore: DecodedScVal | undefined;
      if (beforeEntry) {
        try {
          const beforeData = beforeEntry.data().contractData();
          valueBefore = decodeScVal(beforeData.val());
        } catch {
          // Before value not available
        }
      }

      const durability = contractData.durability().name === 'temporary' ? 'temporary' :
        contractData.durability().name === 'persistent' ? 'persistent' : 'instance';

      return {
        type,
        contractId,
        key,
        valueBefore,
        valueAfter,
        durability: durability as 'persistent' | 'temporary' | 'instance',
      };
    }

    return null;
  } catch {
    return null;
  }
}

function extractRemovedEntry(
  ledgerKey: xdr.LedgerKey,
  previousState: Map<string, xdr.LedgerEntry>
): StateChange | null {
  try {
    const keyType = ledgerKey.switch().name;

    if (keyType === 'contractData') {
      const contractDataKey = ledgerKey.contractData();
      const contract = contractDataKey.contract();
      let contractId: string | undefined;

      try {
        const contractType = contract.switch().name;
        if (contractType === 'scAddressTypeContract') {
          const contractHash = contract.contractId();
          contractId = StrKey.encodeContract(Buffer.from(contractHash as unknown as ArrayBuffer));
        }
      } catch {
        // Unable to extract contract ID
      }

      const key = decodeScVal(contractDataKey.key());

      return {
        type: 'removed',
        contractId,
        key,
      };
    }

    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// Resource Metrics Extraction
// ============================================================================

function extractResourceMetrics(sorobanMeta: xdr.SorobanTransactionMeta): SorobanMetrics {
  const metrics: SorobanMetrics = {};

  try {
    // Try to get extended metrics from ext.v1
    const ext = sorobanMeta.ext();
    const extVersion = ext.switch() as unknown as number;

    if (extVersion === 1) {
      try {
        const v1 = ext.v1() as any; // Use any to access potentially version-specific properties

        // Resource metrics - method names may vary by SDK version
        if (typeof v1.totalByteRead === 'function') {
          metrics.txByteRead = v1.totalByteRead();
        } else if (typeof v1.extV1TotalByteRead === 'function') {
          metrics.txByteRead = v1.extV1TotalByteRead();
        }

        if (typeof v1.totalByteWrite === 'function') {
          metrics.txByteWrite = v1.totalByteWrite();
        } else if (typeof v1.extV1TotalByteWrite === 'function') {
          metrics.txByteWrite = v1.extV1TotalByteWrite();
        }

        // Fee metrics
        if (typeof v1.totalNonRefundableResourceFeeCharged === 'function') {
          metrics.totalNonRefundableResourceFeeCharged = v1.totalNonRefundableResourceFeeCharged().toString();
        } else if (typeof v1.extV1TotalNonRefundableResourceFeeCharged === 'function') {
          metrics.totalNonRefundableResourceFeeCharged = v1.extV1TotalNonRefundableResourceFeeCharged().toString();
        }

        if (typeof v1.totalRefundableResourceFeeCharged === 'function') {
          metrics.totalRefundableResourceFeeCharged = v1.totalRefundableResourceFeeCharged().toString();
        } else if (typeof v1.extV1TotalRefundableResourceFeeCharged === 'function') {
          metrics.totalRefundableResourceFeeCharged = v1.extV1TotalRefundableResourceFeeCharged().toString();
        }

        if (typeof v1.totalRentFeeCharged === 'function') {
          metrics.rentFeeCharged = v1.totalRentFeeCharged().toString();
        } else if (typeof v1.extV1TotalRentFeeCharged === 'function') {
          metrics.rentFeeCharged = v1.extV1TotalRentFeeCharged().toString();
        }
      } catch {
        // v1 metrics not available
      }
    }
  } catch {
    // Extension not available
  }

  return metrics;
}

// ============================================================================
// Enhanced Event Parsing
// ============================================================================

function parseContractEvent(event: ContractEvent): ParsedContractEvent {
  const parsed: ParsedContractEvent = {
    ...event,
    parsedEvents: undefined,
  } as unknown as ParsedContractEvent;

  // Copy base fields
  parsed.type = event.type;
  parsed.contractId = event.contractId;
  parsed.topics = event.topics;
  parsed.data = event.data;

  // Try to categorize and decode the event
  if (event.topics.length > 0) {
    const firstTopic = event.topics[0];
    const eventName = firstTopic.value?.toString() || firstTopic.display;
    parsed.eventName = eventName;

    // Categorize common token and DeFi events
    const eventNameLower = eventName.toLowerCase();

    if (eventNameLower === 'transfer' || eventNameLower.includes('transfer')) {
      parsed.category = 'transfer';
      parsed.decodedParams = parseTransferEvent(event.topics, event.data);
    } else if (eventNameLower === 'approval' || eventNameLower === 'approve') {
      parsed.category = 'approval';
    } else if (eventNameLower === 'mint') {
      parsed.category = 'mint';
      parsed.decodedParams = parseMintBurnEvent(event.topics, event.data);
    } else if (eventNameLower === 'burn' || eventNameLower === 'clawback') {
      parsed.category = 'burn';
      parsed.decodedParams = parseMintBurnEvent(event.topics, event.data);
    } else if (eventNameLower === 'trade' || eventNameLower === 'swap') {
      parsed.category = 'trade';
      parsed.decodedParams = parseTradeEvent(event.topics, event.data);
    } else if (eventNameLower.includes('deposit') || eventNameLower.includes('withdraw') ||
      eventNameLower === 'add_liquidity' || eventNameLower === 'remove_liquidity') {
      parsed.category = 'liquidity';
    } else if (eventNameLower.includes('update') || eventNameLower.includes('set') ||
      eventNameLower === 'sync' || eventNameLower === 'update_reserves') {
      parsed.category = 'state';
    } else {
      parsed.category = 'other';
    }
  }

  return parsed;
}

function parseTransferEvent(topics: DecodedScVal[], data?: DecodedScVal): Record<string, DecodedScVal> {
  const params: Record<string, DecodedScVal> = {};

  // SEP-41 token transfer: topics = [transfer, from, to], data = amount
  if (topics.length >= 3) {
    params['from'] = topics[1];
    params['to'] = topics[2];
  }
  if (data) {
    params['amount'] = data;
  }

  return params;
}

function parseMintBurnEvent(topics: DecodedScVal[], data?: DecodedScVal): Record<string, DecodedScVal> {
  const params: Record<string, DecodedScVal> = {};

  // SEP-41: topics = [mint/burn, to/from], data = amount
  if (topics.length >= 2) {
    params['address'] = topics[1];
  }
  if (data) {
    params['amount'] = data;
  }

  return params;
}

function parseTradeEvent(topics: DecodedScVal[], data?: DecodedScVal): Record<string, DecodedScVal> {
  const params: Record<string, DecodedScVal> = {};

  // DEX trade events vary by protocol
  if (topics.length >= 2) {
    params['trader'] = topics[1];
  }
  if (data) {
    params['tradeData'] = data;
  }

  return params;
}

// ============================================================================
// Main Decoder
// ============================================================================

/**
 * Decode transaction result_meta_xdr to extract Soroban execution details
 */
export function decodeTransactionMeta(resultMetaXdr: string): DecodedTransactionMeta {
  const result: DecodedTransactionMeta = {
    events: [],
    parsedEvents: [],
    invocationTrace: [],
    stateChanges: [],
    success: false,
  };

  try {
    // Decode the XDR
    const meta = xdr.TransactionMeta.fromXDR(resultMetaXdr, 'base64');

    // Get the version
    let version = 0;
    const sw = meta.switch();
    if (typeof sw === 'number') {
      version = sw;
    } else if (sw && typeof sw === 'object' && 'value' in sw) {
      version = (sw as any).value;
    }

    let sorobanMeta: xdr.SorobanTransactionMeta | null | undefined;
    let events: xdr.ContractEvent[] = [];
    let diagnosticEvents: xdr.DiagnosticEvent[] = [];
    let returnValue: xdr.ScVal | undefined;

    // Handle different versions
    if (version === 3) {
      try {
        const v3 = meta.v3();
        sorobanMeta = v3.sorobanMeta();
        if (sorobanMeta) {
          events = sorobanMeta.events();
          try {
            diagnosticEvents = sorobanMeta.diagnosticEvents ? sorobanMeta.diagnosticEvents() : [];
          } catch { /* ignore */ }
          returnValue = sorobanMeta.returnValue();
        }
      } catch {
        // v3 access failed
      }
    } else if (version === 4) {
      try {
        const v4 = (meta as any).v4();
        events = v4.events();
        diagnosticEvents = v4.diagnosticEvents();

        sorobanMeta = v4.sorobanMeta();
        if (sorobanMeta) {
          returnValue = sorobanMeta.returnValue();
        }
      } catch {
        // v4 access failed
      }
    } else {
      // Try direct access for newer SDK versions if structure is flat/mixed
      try {
        if ((meta as any).sorobanMeta) {
          sorobanMeta = (meta as any).sorobanMeta?.();
          if (sorobanMeta) {
            events = sorobanMeta.events();
            returnValue = sorobanMeta.returnValue();
          }
        }
      } catch { }
    }

    if (!sorobanMeta && events.length === 0 && diagnosticEvents.length === 0) {
      result.error = 'No Soroban metadata found';
      return result;
    }

    result.success = true;

    // Extract return value
    if (returnValue) {
      result.returnValue = decodeScVal(returnValue);
    }

    // Extract events
    if (events) {
      for (const event of events) {
        const decoded = decodeContractEvent(event);
        if (decoded) {
          result.events.push(decoded);
        }
      }
    }

    // Extract diagnostic events (for detailed invocation trace)
    if (diagnosticEvents && diagnosticEvents.length > 0) {
      let depth = 0;
      for (const diagEvent of diagnosticEvents) {
        const decoded = decodeDiagnosticEvent(diagEvent);
        if (decoded) {
          if (decoded.type === 'fn_return') {
            depth = Math.max(0, depth - 1);
            decoded.depth = depth;
          } else {
            decoded.depth = depth;
            if (decoded.type === 'fn_call') {
              depth++;
            }
          }
          result.invocationTrace.push(decoded);
        }
      }
    } else if (result.events.length > 0) {
      // Fallback: If no diagnostic events, create trace from regular events
      for (const event of result.events) {
        if (event.topics.length > 0) {
          result.invocationTrace.push({
            type: 'event',
            contractId: event.contractId,
            depth: 0,
            args: event.topics,
          });
        }
      }
    }

    // Parse events with enhanced categorization
    for (const event of result.events) {
      result.parsedEvents.push(parseContractEvent(event));
    }

    // Extract resource metrics
    if (sorobanMeta) {
      result.metrics = extractResourceMetrics(sorobanMeta);
    }

    // Extract state changes from ledger entry changes
    result.stateChanges = extractStateChanges(meta);

  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Failed to decode XDR';
  }

  return result;
}

/**
 * Extract contract ID from address ScVal
 */
export function extractContractIdFromScVal(scVal: xdr.ScVal): string | null {
  try {
    if (scVal.switch().name === 'scvAddress') {
      const addr = Address.fromScVal(scVal);
      return addr.toString();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Format a decoded value for display
 */
export function formatDecodedValue(decoded: DecodedScVal, maxLength: number = 50): string {
  if (decoded.display.length <= maxLength) {
    return decoded.display;
  }
  return decoded.display.slice(0, maxLength - 3) + '...';
}

/**
 * Decode transaction envelope XDR to extract Soroban resource limits
 * These represent the LIMITS set by the user, not necessarily the exact usage.
 */
export function decodeTransactionResources(envelopeXdr: string): SorobanMetrics | null {
  try {
    const txEnvelope = xdr.TransactionEnvelope.fromXDR(envelopeXdr, 'base64');
    let tx: xdr.Transaction;

    const envelopeType = txEnvelope.switch();
    if (envelopeType.name === 'envelopeTypeTx') {
      tx = txEnvelope.v1().tx();
    } else if (envelopeType.name === 'envelopeTypeTxFeeBump') {
      const inner = txEnvelope.feeBump().tx().innerTx();
      if (inner.switch().name === 'envelopeTypeTx') {
        tx = inner.v1().tx();
      } else {
        return null; // Classic transaction inside fee bump or other type
      }
    } else {
      return null;
    }


    // Check for Soroban Data in ext
    // Transaction ext is a union: case 0: void, case 1: SorobanTransactionData
    const ext = tx.ext();
    const extSwitch = ext.switch();
    let extValue = 0;

    if (typeof extSwitch === 'number') {
      extValue = extSwitch;
    } else if (extSwitch && typeof extSwitch === 'object' && 'value' in extSwitch) {
      extValue = (extSwitch as any).value;
    } else if (extSwitch && typeof extSwitch === 'object' && 'name' in extSwitch) {
      // Fallback for some SDK versions where name might be used (though usually value)
      if ((extSwitch as any).name === 'sorobanTransactionData') extValue = 1;
    }

    // Assuming v1 is the case for SorobanTransactionData (which is usually case 1)
    if (extValue !== 1) {
      return null;
    }

    let sorobanData;
    try {
      sorobanData = ext.sorobanData();
    } catch {
      return null; // Not available
    }

    if (!sorobanData) return null;

    const resources = sorobanData.resources();
    const footprint = resources.footprint();

    // Safely access properties as they might vary by SDK version
    const instructions = typeof resources.instructions === 'function' ? resources.instructions() : (resources as any).instructions;
    const readBytes = typeof (resources as any).readBytes === 'function' ? (resources as any).readBytes() : (resources as any).readBytes;
    const writeBytes = typeof (resources as any).writeBytes === 'function' ? (resources as any).writeBytes() : (resources as any).writeBytes;

    return {
      cpuInsns: instructions?.toString() || '0',
      readBytes: readBytes?.toString() || '0',
      writeBytes: writeBytes?.toString() || '0',
      readEntries: footprint.readOnly().length + footprint.readWrite().length,
      writeEntries: footprint.readWrite().length,
    };
  } catch (error) {
    console.error('Failed to decode envelope resources:', error);
    return null;
  }
}
