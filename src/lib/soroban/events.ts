// Soroban Event Parser for SEP-0041 Token Events
// Parses standard token events (transfer, approve, mint, burn, clawback)
// https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0041.md

import { xdr, Address, scValToNative } from '@stellar/stellar-sdk';
import { getSorobanServer, isContractAddress, isAccountAddress } from './client';
import type { Operation } from '@/lib/stellar';
import { createHorizonServer } from '@/services/horizon';

// =============================================================================
// Event Interfaces
// =============================================================================

export interface ParsedEvent {
  type: 'transfer' | 'approve' | 'mint' | 'burn' | 'clawback' | 'unknown';
  rawEventName?: string; // Original event name from topics (for custom events)
  contractId: string;
  ledger: number;
  timestamp?: string;
  txHash?: string;
  data: TransferEventData | ApproveEventData | MintEventData | BurnEventData | ClawbackEventData | CustomEventData | Record<string, unknown>;
}

export interface CustomEventData {
  eventName: string;
  subType?: string;
  account?: string;
  topics: unknown[];
  decodedTopics?: string[];
  value?: unknown;
  decodedValue?: string;
}

export interface TransferEventData {
  from: string;
  to: string;
  amount: string;
}

export interface ApproveEventData {
  from: string;
  spender: string;
  amount: string;
  expirationLedger: number;
}

export interface MintEventData {
  to: string;
  amount: string;
}

export interface BurnEventData {
  from: string;
  amount: string;
}

export interface ClawbackEventData {
  from: string;
  amount: string;
}

// Raw event structure from Horizon
export interface RawContractEvent {
  id?: string;
  type?: string;
  ledger?: number;
  ledger_closed_at?: string;
  contract_id?: string;
  paging_token?: string;
  topic?: string[];
  value?: string;
  in_successful_contract_call?: boolean;
  transaction_hash?: string;
}

// =============================================================================
// Cache Configuration
// =============================================================================

const EVENT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface EventCacheEntry {
  events: ParsedEvent[];
  expiry: number;
}

const eventCache: Map<string, EventCacheEntry> = new Map();

// Get events from cache
function getCachedEvents(cacheKey: string): ParsedEvent[] | null {
  const cached = eventCache.get(cacheKey);
  if (!cached) return null;

  if (Date.now() > cached.expiry) {
    eventCache.delete(cacheKey);
    return null;
  }

  return cached.events;
}

// Set events in cache
function setCachedEvents(cacheKey: string, events: ParsedEvent[]): void {
  eventCache.set(cacheKey, {
    events,
    expiry: Date.now() + EVENT_CACHE_TTL_MS,
  });
}

// Clear event cache
export function clearEventCache(): void {
  eventCache.clear();
}

// Invalidate cache for a specific contract
export function invalidateEventCache(contractId: string): void {
  const keysToDelete: string[] = [];
  eventCache.forEach((_, key) => {
    if (key.includes(contractId)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => eventCache.delete(key));
}

// =============================================================================
// Event Type Detection
// =============================================================================

/**
 * Detect event type from function name
 * Maps common SEP-0041 function names to event types
 */
export function detectEventType(functionName: string): 'transfer' | 'approve' | 'mint' | 'burn' | 'clawback' | 'unknown' {
  const normalized = functionName.toLowerCase().trim();

  // Direct matches
  if (normalized === 'transfer' || normalized === 'xfer') {
    return 'transfer';
  }
  if (normalized === 'approve' || normalized === 'incr_allow' || normalized === 'increase_allowance') {
    return 'approve';
  }
  if (normalized === 'mint') {
    return 'mint';
  }
  if (normalized === 'burn' || normalized === 'burn_from') {
    return 'burn';
  }
  if (normalized === 'clawback') {
    return 'clawback';
  }

  // Partial matches for variations
  if (normalized.includes('transfer')) {
    return 'transfer';
  }
  if (normalized.includes('approve') || normalized.includes('allowance')) {
    return 'approve';
  }
  if (normalized.includes('mint')) {
    return 'mint';
  }
  if (normalized.includes('burn')) {
    return 'burn';
  }
  if (normalized.includes('clawback')) {
    return 'clawback';
  }

  return 'unknown';
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate 10^n for bigint without using ** operator
 * (for compatibility with older TypeScript targets)
 */
function pow10(n: number): bigint {
  let result = BigInt(1);
  const TEN = BigInt(10);
  for (let i = 0; i < n; i++) {
    result = result * TEN;
  }
  return result;
}

// =============================================================================
// XDR Parsing Utilities
// =============================================================================

/**
 * Convert i128 parts (lo, hi) to string representation
 * Handles both positive and negative values
 */
function i128ToString(lo: bigint, hi: bigint): string {
  const SIXTY_FOUR = BigInt(64);
  const MAX_U64 = BigInt('0xFFFFFFFFFFFFFFFF');
  const combined = (hi << SIXTY_FOUR) | (lo & MAX_U64);

  // Check if negative (MSB set in hi)
  const ZERO = BigInt(0);
  const ONE = BigInt(1);
  const SIXTY_THREE = BigInt(63);
  const TWO_POW_128 = ONE << BigInt(128);

  if (hi < ZERO || (hi >> SIXTY_THREE) === ONE) {
    return (combined - TWO_POW_128).toString();
  }
  return combined.toString();
}

/**
 * Convert u128 parts (lo, hi) to string representation
 */
function u128ToString(lo: bigint, hi: bigint): string {
  const SIXTY_FOUR = BigInt(64);
  const MAX_U64 = BigInt('0xFFFFFFFFFFFFFFFF');
  return ((hi << SIXTY_FOUR) | (lo & MAX_U64)).toString();
}

/**
 * Parse an ScVal and return a native JavaScript value
 * Handles addresses, amounts (i128/u128), and other common types
 */
function parseScVal(scVal: xdr.ScVal): unknown {
  try {
    switch (scVal.switch()) {
      case xdr.ScValType.scvAddress():
        return Address.fromScVal(scVal).toString();

      case xdr.ScValType.scvI128(): {
        const parts = scVal.i128();
        return i128ToString(parts.lo().toBigInt(), parts.hi().toBigInt());
      }

      case xdr.ScValType.scvU128(): {
        const parts = scVal.u128();
        return u128ToString(parts.lo().toBigInt(), parts.hi().toBigInt());
      }

      case xdr.ScValType.scvI64():
        return scVal.i64().toString();

      case xdr.ScValType.scvU64():
        return scVal.u64().toString();

      case xdr.ScValType.scvI32():
        return scVal.i32();

      case xdr.ScValType.scvU32():
        return scVal.u32();

      case xdr.ScValType.scvBool():
        return scVal.b();

      case xdr.ScValType.scvSymbol():
        return scVal.sym().toString();

      case xdr.ScValType.scvString():
        return scVal.str().toString();

      case xdr.ScValType.scvBytes():
        return Buffer.from(scVal.bytes()).toString('hex');

      case xdr.ScValType.scvVec(): {
        const vec = scVal.vec();
        if (vec) {
          return vec.map(item => parseScVal(item));
        }
        return [];
      }

      case xdr.ScValType.scvMap(): {
        const map = scVal.map();
        if (map) {
          const result: Record<string, unknown> = {};
          for (const entry of map) {
            const key = parseScVal(entry.key());
            const value = parseScVal(entry.val());
            if (typeof key === 'string' || typeof key === 'number') {
              result[String(key)] = value;
            }
          }
          return result;
        }
        return {};
      }

      default:
        // For unhandled types, try scValToNative from SDK
        try {
          return scValToNative(scVal);
        } catch {
          return null;
        }
    }
  } catch (error) {
    console.warn('Error parsing ScVal:', error);
    return null;
  }
}

// =============================================================================
// Event Parsing Functions
// =============================================================================

/**
 * Parse event topics to extract event type and addresses
 * Topics typically contain: [event_name, ...addresses]
 */
export function parseEventTopics(topics: unknown[]): { type: string; addresses: string[] } {
  const result = {
    type: 'unknown',
    addresses: [] as string[],
  };

  if (!Array.isArray(topics) || topics.length === 0) {
    return result;
  }

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];

    try {
      // Topics can be base64-encoded XDR
      if (typeof topic === 'string') {
        const scVal = xdr.ScVal.fromXDR(topic, 'base64');
        const parsed = parseScVal(scVal);

        if (i === 0 && typeof parsed === 'string') {
          // First topic is usually the event name
          result.type = parsed;
        } else if (typeof parsed === 'string') {
          // Check if it's an address
          if (isContractAddress(parsed) || isAccountAddress(parsed)) {
            result.addresses.push(parsed);
          }
        }
      } else if (typeof topic === 'object' && topic !== null) {
        // Already parsed object
        const parsed = topic as Record<string, unknown>;
        if (parsed.type === 'Sym' || parsed.type === 'Symbol') {
          result.type = String(parsed.value || 'unknown');
        } else if (parsed.type === 'Address') {
          const addr = String(parsed.value || '');
          if (addr) {
            result.addresses.push(addr);
          }
        }
      }
    } catch (error) {
      console.warn('Error parsing topic:', error);
    }
  }

  return result;
}

/**
 * Parse event data field
 * Data can contain amounts, expiration ledgers, and other event-specific info
 */
export function parseEventData(data: unknown): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (!data) {
    return result;
  }

  try {
    // If data is a base64 string, decode it
    if (typeof data === 'string') {
      const scVal = xdr.ScVal.fromXDR(data, 'base64');
      const parsed = parseScVal(scVal);

      if (parsed !== null && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }

      // Single value - might be an amount
      if (typeof parsed === 'string' || typeof parsed === 'number') {
        result.value = parsed;
      }

      return result;
    }

    // If data is already an object
    if (typeof data === 'object') {
      return data as Record<string, unknown>;
    }
  } catch (error) {
    console.warn('Error parsing event data:', error);
  }

  return result;
}

/**
 * Parse a single contract event from Horizon operations
 * Extracts event type, addresses, and amounts
 */
export function parseContractEvent(rawEvent: RawContractEvent | Operation): ParsedEvent {
  const event: ParsedEvent = {
    type: 'unknown',
    contractId: '',
    ledger: 0,
    data: {},
  };

  try {
    // Handle raw event from Horizon events endpoint
    if ('contract_id' in rawEvent && rawEvent.contract_id) {
      event.contractId = rawEvent.contract_id as string;
      event.ledger = (rawEvent.ledger as number) || 0;
      event.timestamp = rawEvent.ledger_closed_at as string | undefined;

      // Parse topics
      if (rawEvent.topic && Array.isArray(rawEvent.topic)) {
        const topicInfo = parseEventTopics(rawEvent.topic);
        event.type = detectEventType(topicInfo.type);

        // Parse data/value
        const eventData = parseEventData(rawEvent.value);

        // Build event-specific data structure
        event.data = buildEventData(event.type, topicInfo.addresses, eventData);
      }

      return event;
    }

    // Handle operation (invoke_host_function)
    const op = rawEvent as Operation;
    if (op.type === 'invoke_host_function') {
      // Extract contract ID from parameters
      if (op.parameters && op.parameters.length > 0) {
        try {
          const firstParam = op.parameters[0];
          if (firstParam && firstParam.value) {
            const scVal = xdr.ScVal.fromXDR(firstParam.value, 'base64');
            if (scVal.switch() === xdr.ScValType.scvAddress()) {
              const address = Address.fromScVal(scVal).toString();
              if (isContractAddress(address)) {
                event.contractId = address;
              }
            }
          }
        } catch {
          // Ignore parsing errors
        }
      }

      // Extract function name
      if (op.parameters && op.parameters.length > 1) {
        try {
          const fnParam = op.parameters[1];
          if (fnParam && (fnParam.type === 'Sym' || fnParam.type === 'Symbol')) {
            const scVal = xdr.ScVal.fromXDR(fnParam.value, 'base64');
            if (scVal.switch() === xdr.ScValType.scvSymbol()) {
              const functionName = scVal.sym().toString();
              event.type = detectEventType(functionName);
            }
          }
        } catch {
          // Ignore parsing errors
        }
      }

      event.timestamp = op.created_at;

      // Parse remaining parameters for event data
      if (op.parameters && op.parameters.length > 2) {
        const addresses: string[] = [];
        let amount: string | undefined;
        let expirationLedger: number | undefined;

        for (let i = 2; i < op.parameters.length; i++) {
          try {
            const param = op.parameters[i];
            if (!param || !param.value) continue;

            const scVal = xdr.ScVal.fromXDR(param.value, 'base64');
            const parsed = parseScVal(scVal);

            if (typeof parsed === 'string') {
              if (isContractAddress(parsed) || isAccountAddress(parsed)) {
                addresses.push(parsed);
              } else if (!amount && /^\d+$/.test(parsed)) {
                amount = parsed;
              }
            } else if (typeof parsed === 'number') {
              if (!expirationLedger && parsed > 1000000) {
                // Likely a ledger number
                expirationLedger = parsed;
              }
            }
          } catch {
            // Ignore parsing errors for individual params
          }
        }

        event.data = buildEventData(event.type, addresses, { amount, expirationLedger });
      }
    }
  } catch (error) {
    console.error('Error parsing contract event:', error);
  }

  return event;
}

/**
 * Build event-specific data structure based on event type
 */
function buildEventData(
  type: ParsedEvent['type'],
  addresses: string[],
  rawData: Record<string, unknown>
): ParsedEvent['data'] {
  const amount = String(rawData.amount || rawData.value || '0');

  switch (type) {
    case 'transfer':
      return {
        from: addresses[0] || String(rawData.from || ''),
        to: addresses[1] || String(rawData.to || ''),
        amount,
      } as TransferEventData;

    case 'approve':
      return {
        from: addresses[0] || String(rawData.from || ''),
        spender: addresses[1] || String(rawData.spender || ''),
        amount,
        expirationLedger: Number(rawData.expirationLedger || rawData.expiration_ledger || 0),
      } as ApproveEventData;

    case 'mint':
      return {
        to: addresses[0] || String(rawData.to || ''),
        amount,
      } as MintEventData;

    case 'burn':
      return {
        from: addresses[0] || String(rawData.from || ''),
        amount,
      } as BurnEventData;

    case 'clawback':
      return {
        from: addresses[0] || String(rawData.from || ''),
        amount,
      } as ClawbackEventData;

    default:
      return {
        addresses,
        ...rawData,
      };
  }
}

// =============================================================================
// Event Fetching
// =============================================================================

/**
 * Fetch and parse events for a contract using Soroban RPC
 * Uses the getEvents RPC method to fetch actual contract events
 */
export async function getContractEvents(
  contractId: string,
  limit: number = 50
): Promise<ParsedEvent[]> {
  // Validate input
  if (!contractId || !isContractAddress(contractId)) {
    console.warn('Invalid contract ID provided:', contractId);
    return [];
  }

  // Check cache
  const cacheKey = `events:${contractId}:${limit}`;
  const cached = getCachedEvents(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const server = getSorobanServer();

    // Get the latest ledger to determine the range
    const latestLedger = await server.getLatestLedger();
    const currentLedger = latestLedger.sequence;

    // Soroban RPC limits event queries to ~17,280 ledgers (roughly 24 hours)
    // Query the last ~17,000 ledgers
    const startLedger = Math.max(currentLedger - 17000, 1);

    // Use Soroban RPC getEvents to fetch contract events
    const eventsResponse = await server.getEvents({
      startLedger,
      filters: [
        {
          type: 'contract',
          contractIds: [contractId],
        },
      ],
      limit,
    });

    const events: ParsedEvent[] = [];

    if (eventsResponse.events && eventsResponse.events.length > 0) {
      for (const rawEvent of eventsResponse.events) {
        try {
          // Extract contract ID - it's a Contract object from SDK
          let eventContractId = contractId;
          if (rawEvent.contractId) {
            try {
              // Contract object has contractId() method that returns the string ID
              if (typeof rawEvent.contractId === 'object' && 'contractId' in rawEvent.contractId) {
                eventContractId = (rawEvent.contractId as { contractId: () => string }).contractId();
              } else if (typeof rawEvent.contractId === 'string') {
                eventContractId = rawEvent.contractId;
              }
            } catch {
              // Keep the passed contractId
            }
          }

          const event: ParsedEvent = {
            type: 'unknown',
            contractId: eventContractId,
            ledger: rawEvent.ledger,
            timestamp: rawEvent.ledgerClosedAt,
            txHash: rawEvent.txHash,
            data: {},
          };

          // Parse topics - they are XDR ScVal objects from Soroban RPC
          if (rawEvent.topic && rawEvent.topic.length > 0) {
            const addresses: string[] = [];
            const parsedTopics: unknown[] = [];
            let eventType = 'unknown';
            let rawEventName = '';
            let subType: string | undefined;

            for (let i = 0; i < rawEvent.topic.length; i++) {
              try {
                const topic = rawEvent.topic[i];
                // Topics from getEvents are already xdr.ScVal objects
                const native = scValToNative(topic);
                parsedTopics.push(native);

                if (i === 0 && typeof native === 'string') {
                  // First topic is usually the event name
                  eventType = native;
                  rawEventName = native;
                } else if (i === 1 && typeof native === 'string' && !native.startsWith('G') && !native.startsWith('C')) {
                  // Second topic might be a subtype (e.g., "open", "close", "place")
                  subType = native;
                } else if (typeof native === 'string') {
                  // Check if it's an address (starts with G or C and is 56 chars)
                  if ((native.startsWith('G') || native.startsWith('C')) && native.length === 56) {
                    addresses.push(native);
                  }
                }
              } catch (topicError) {
                // Skip unparseable topics
              }
            }

            event.type = detectEventType(eventType);
            event.rawEventName = rawEventName;

            // Parse the value/data
            let valueNative: unknown = null;
            if (rawEvent.value) {
              try {
                valueNative = scValToNative(rawEvent.value);
              } catch (valueError) {
                // Value parsing failed
              }
            }

            // For standard SEP-0041 events, use the standard data structure
            if (event.type !== 'unknown') {
              let amount = '0';
              if (typeof valueNative === 'bigint') {
                amount = valueNative.toString();
              } else if (typeof valueNative === 'number') {
                amount = valueNative.toString();
              } else if (typeof valueNative === 'string' && /^\d+$/.test(valueNative)) {
                amount = valueNative;
              } else if (valueNative && typeof valueNative === 'object') {
                const valObj = valueNative as Record<string, unknown>;
                if ('amount' in valObj) {
                  amount = String(valObj.amount);
                } else if ('value' in valObj) {
                  amount = String(valObj.value);
                }
              }
              event.data = buildEventData(event.type, addresses, { amount });
            } else {
              // For custom/unknown events, store rich data
              const customData: CustomEventData = {
                eventName: rawEventName,
                subType,
                account: addresses[0],
                topics: parsedTopics,
                value: valueNative,
              };
              event.data = customData;
            }
          }

          events.push(event);
        } catch (parseError) {
          console.warn('Error parsing individual event:', parseError);
        }
      }
    }

    // Cache the results
    setCachedEvents(cacheKey, events);

    return events;
  } catch (error) {
    console.error('Error fetching contract events from Soroban RPC:', error);
    // Return empty array but don't cache the failure for long
    return [];
  }
}

/**
 * Fetch events for a contract by searching transaction operations
 * Alternative method when direct contract queries fail
 */
export async function getContractEventsByOperations(
  contractId: string,
  limit: number = 50
): Promise<ParsedEvent[]> {
  if (!contractId || !isContractAddress(contractId)) {
    return [];
  }

  const cacheKey = `events-ops:${contractId}:${limit}`;
  const cached = getCachedEvents(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const operationsResponse = await createHorizonServer()
      .operations()
      .limit(limit)
      .order('desc')
      .includeFailed(false)
      .call();
    const operations = (operationsResponse.records || []) as unknown as Operation[];

    const events: ParsedEvent[] = [];

    for (const op of operations) {
      if (op.type === 'invoke_host_function') {
        const event = parseContractEvent(op);

        // Only include events for the target contract
        if (event.contractId === contractId) {
          events.push(event);
        }
      }
    }

    setCachedEvents(cacheKey, events);
    return events;
  } catch (error) {
    console.error('Error fetching contract events by operations:', error);
    return [];
  }
}

// =============================================================================
// Amount Formatting
// =============================================================================

/**
 * Format event amounts with decimals
 * Converts raw amount string to human-readable format
 */
export function formatEventAmount(amount: string, decimals: number = 7): string {
  if (!amount || amount === '0') {
    return '0';
  }

  try {
    const ZERO = BigInt(0);
    const TEN = BigInt(10);
    const value = BigInt(amount);

    if (value === ZERO) {
      return '0';
    }

    const isNegative = value < ZERO;
    const absValue = isNegative ? -value : value;
    const divisor = pow10(decimals);
    const wholePart = absValue / divisor;
    const fracPart = absValue % divisor;

    let result: string;

    if (fracPart === ZERO) {
      result = wholePart.toLocaleString();
    } else {
      const fracStr = fracPart.toString().padStart(decimals, '0').replace(/0+$/, '');
      result = wholePart === ZERO
        ? `0.${fracStr}`
        : `${wholePart.toLocaleString()}.${fracStr}`;
    }

    return isNegative ? `-${result}` : result;
  } catch (error) {
    console.warn('Error formatting amount:', error);
    return amount;
  }
}

/**
 * Format event amount with suffix (K, M, B, T)
 */
export function formatEventAmountCompact(amount: string, decimals: number = 7): string {
  if (!amount || amount === '0') {
    return '0';
  }

  try {
    const value = BigInt(amount);
    const divisor = pow10(decimals);
    const numValue = Number(value) / Number(divisor);

    if (numValue >= 1_000_000_000_000) {
      return (numValue / 1_000_000_000_000).toFixed(2) + 'T';
    }
    if (numValue >= 1_000_000_000) {
      return (numValue / 1_000_000_000).toFixed(2) + 'B';
    }
    if (numValue >= 1_000_000) {
      return (numValue / 1_000_000).toFixed(2) + 'M';
    }
    if (numValue >= 1_000) {
      return (numValue / 1_000).toFixed(2) + 'K';
    }

    return numValue.toLocaleString(undefined, { maximumFractionDigits: 4 });
  } catch (error) {
    console.warn('Error formatting amount compact:', error);
    return amount;
  }
}

// =============================================================================
// Event Filtering & Utilities
// =============================================================================

/**
 * Filter events by type
 */
export function filterEventsByType(
  events: ParsedEvent[],
  type: ParsedEvent['type']
): ParsedEvent[] {
  return events.filter(e => e.type === type);
}

/**
 * Filter events by address (from or to)
 */
export function filterEventsByAddress(
  events: ParsedEvent[],
  address: string
): ParsedEvent[] {
  return events.filter(e => {
    const data = e.data as Record<string, unknown>;
    return (
      data.from === address ||
      data.to === address ||
      data.spender === address
    );
  });
}

/**
 * Get transfer events only
 */
export function getTransferEvents(events: ParsedEvent[]): ParsedEvent[] {
  return filterEventsByType(events, 'transfer');
}

/**
 * Get approve events only
 */
export function getApproveEvents(events: ParsedEvent[]): ParsedEvent[] {
  return filterEventsByType(events, 'approve');
}

/**
 * Get mint events only
 */
export function getMintEvents(events: ParsedEvent[]): ParsedEvent[] {
  return filterEventsByType(events, 'mint');
}

/**
 * Get burn events only
 */
export function getBurnEvents(events: ParsedEvent[]): ParsedEvent[] {
  return filterEventsByType(events, 'burn');
}

/**
 * Get clawback events only
 */
export function getClawbackEvents(events: ParsedEvent[]): ParsedEvent[] {
  return filterEventsByType(events, 'clawback');
}

/**
 * Check if an event data is a TransferEventData
 */
export function isTransferEventData(data: unknown): data is TransferEventData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return 'from' in d && 'to' in d && 'amount' in d;
}

/**
 * Check if an event data is an ApproveEventData
 */
export function isApproveEventData(data: unknown): data is ApproveEventData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return 'from' in d && 'spender' in d && 'amount' in d && 'expirationLedger' in d;
}

/**
 * Check if an event data is a MintEventData
 */
export function isMintEventData(data: unknown): data is MintEventData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return 'to' in d && 'amount' in d && !('from' in d);
}

/**
 * Check if an event data is a BurnEventData
 */
export function isBurnEventData(data: unknown): data is BurnEventData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return 'from' in d && 'amount' in d && !('to' in d) && !('spender' in d);
}

/**
 * Check if an event data is a ClawbackEventData
 */
export function isClawbackEventData(data: unknown): data is ClawbackEventData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return 'from' in d && 'amount' in d && !('to' in d) && !('spender' in d);
}

/**
 * Check if an event data is a CustomEventData
 */
export function isCustomEventData(data: unknown): data is CustomEventData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return 'eventName' in d && 'topics' in d;
}

// =============================================================================
// Event Summary
// =============================================================================

export interface EventSummary {
  totalEvents: number;
  transfers: number;
  approvals: number;
  mints: number;
  burns: number;
  clawbacks: number;
  unknown: number;
  uniqueAddresses: string[];
  totalVolume: string;
}

/**
 * Generate summary statistics for a list of events
 */
export function getEventSummary(events: ParsedEvent[]): EventSummary {
  const addressSet = new Set<string>();
  let totalVolume = BigInt(0);

  const summary: EventSummary = {
    totalEvents: events.length,
    transfers: 0,
    approvals: 0,
    mints: 0,
    burns: 0,
    clawbacks: 0,
    unknown: 0,
    uniqueAddresses: [],
    totalVolume: '0',
  };

  for (const event of events) {
    switch (event.type) {
      case 'transfer':
        summary.transfers++;
        break;
      case 'approve':
        summary.approvals++;
        break;
      case 'mint':
        summary.mints++;
        break;
      case 'burn':
        summary.burns++;
        break;
      case 'clawback':
        summary.clawbacks++;
        break;
      default:
        summary.unknown++;
    }

    // Collect addresses
    const data = event.data as Record<string, unknown>;
    if (data.from && typeof data.from === 'string') {
      addressSet.add(data.from);
    }
    if (data.to && typeof data.to === 'string') {
      addressSet.add(data.to);
    }
    if (data.spender && typeof data.spender === 'string') {
      addressSet.add(data.spender);
    }

    // Sum volumes (only for transfer, mint, burn)
    if (data.amount && typeof data.amount === 'string' && event.type !== 'approve') {
      try {
        totalVolume += BigInt(data.amount);
      } catch {
        // Ignore invalid amounts
      }
    }
  }

  summary.uniqueAddresses = Array.from(addressSet);
  summary.totalVolume = totalVolume.toString();

  return summary;
}
