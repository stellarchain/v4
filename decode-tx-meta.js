/**
 * Script to fetch and decode Soroban transaction resultMetaXdr
 *
 * Fetches a transaction from Soroban RPC and decodes:
 * - Return value
 * - Contract events
 * - Diagnostic events
 * - State changes (ledger entry changes)
 */

const { xdr, rpc, Address, StrKey, scValToNative } = require('@stellar/stellar-sdk');

const SOROBAN_RPC_URL = 'https://soroban-rpc.mainnet.stellar.gateway.fm';
const TX_HASH = '12180574402693162cc5aba0ef8f2c52293190f4e7eb85067d3416b0063f6b0f';

// ============================================================================
// ScVal Decoding Helper
// ============================================================================

function decodeScVal(scVal, depth = 0) {
  const indent = '  '.repeat(depth);
  try {
    const type = scVal.switch().name;

    switch (type) {
      case 'scvVoid':
        return { type, value: null, display: 'void' };
      case 'scvBool':
        return { type, value: scVal.b(), display: String(scVal.b()) };
      case 'scvU32':
        return { type, value: scVal.u32(), display: scVal.u32().toString() };
      case 'scvI32':
        return { type, value: scVal.i32(), display: scVal.i32().toString() };
      case 'scvU64':
        return { type, value: scVal.u64().toString(), display: scVal.u64().toString() };
      case 'scvI64':
        return { type, value: scVal.i64().toString(), display: scVal.i64().toString() };
      case 'scvU128':
      case 'scvI128':
      case 'scvU256':
      case 'scvI256': {
        const native = scValToNative(scVal);
        return { type, value: native?.toString() || '0', display: native?.toString() || '0' };
      }
      case 'scvBytes': {
        const bytes = scVal.bytes();
        const hex = Buffer.from(bytes).toString('hex');
        return { type, value: hex, display: `0x${hex.slice(0, 32)}${hex.length > 32 ? '...' : ''}` };
      }
      case 'scvString':
        return { type, value: scVal.str().toString(), display: `"${scVal.str().toString()}"` };
      case 'scvSymbol':
        return { type, value: scVal.sym().toString(), display: scVal.sym().toString() };
      case 'scvAddress': {
        const addr = Address.fromScVal(scVal);
        return { type, value: addr.toString(), display: addr.toString() };
      }
      case 'scvVec': {
        const vec = scVal.vec();
        if (vec) {
          const items = vec.map((v, i) => decodeScVal(v, depth + 1));
          return {
            type,
            value: items.map(i => i.value),
            display: `[${items.length} items]`,
            items
          };
        }
        return { type, value: [], display: '[]' };
      }
      case 'scvMap': {
        const map = scVal.map();
        if (map) {
          const entries = map.map(entry => ({
            key: decodeScVal(entry.key(), depth + 1),
            value: decodeScVal(entry.val(), depth + 1)
          }));
          return {
            type,
            value: entries,
            display: `{${entries.length} entries}`,
            entries
          };
        }
        return { type, value: {}, display: '{}' };
      }
      case 'scvContractInstance':
        return { type, value: 'ContractInstance', display: 'ContractInstance' };
      case 'scvLedgerKeyContractInstance':
        return { type, value: 'LedgerKeyContractInstance', display: 'LedgerKey' };
      case 'scvTimepoint':
        return { type, value: scVal.timepoint().toString(), display: `Timepoint(${scVal.timepoint()})` };
      case 'scvDuration':
        return { type, value: scVal.duration().toString(), display: `Duration(${scVal.duration()})` };
      case 'scvError': {
        const err = scVal.error();
        return { type, value: err.switch().name, display: `Error(${err.switch().name})` };
      }
      default: {
        try {
          const native = scValToNative(scVal);
          return { type, value: native, display: JSON.stringify(native).slice(0, 100) };
        } catch {
          return { type, value: type, display: type };
        }
      }
    }
  } catch (error) {
    return { type: 'unknown', value: null, display: 'Unable to decode' };
  }
}

// ============================================================================
// Contract Event Decoding
// ============================================================================

function decodeContractEvent(event, index) {
  const result = {
    index,
    type: 'unknown',
    contractId: null,
    topics: [],
    data: null
  };

  try {
    // Check if event has type() method (standard ContractEvent)
    if (typeof event.type === 'function') {
      result.type = event.type().name;
    } else if (typeof event.switch === 'function') {
      // It might be wrapped in an envelope
      result.type = event.switch().name;
    }

    // Get contract ID
    if (typeof event.contractId === 'function') {
      const contractIdBuf = event.contractId();
      if (contractIdBuf) {
        try {
          result.contractId = StrKey.encodeContract(Buffer.from(contractIdBuf));
        } catch {
          result.contractId = Buffer.from(contractIdBuf).toString('hex');
        }
      }
    }

    // Get body
    if (typeof event.body === 'function') {
      const body = event.body();
      const v0 = body.v0();
      if (v0) {
        result.topics = v0.topics().map((topic, i) => ({
          index: i,
          ...decodeScVal(topic)
        }));
        result.data = decodeScVal(v0.data());
      }
    }
  } catch (e) {
    result.error = e.message;
  }

  // Debug: Show available methods on the event if we couldn't decode
  if (result.type === 'unknown' && result.topics.length === 0) {
    const proto = Object.getPrototypeOf(event);
    const methods = Object.getOwnPropertyNames(proto).filter(m => typeof event[m] === 'function');
    result.availableMethods = methods;
  }

  return result;
}

// Decode event from v4 TransactionMetaV4 format (ContractEventInfo)
function decodeContractEventInfo(eventInfo, index) {
  const result = {
    index,
    type: 'unknown',
    contractId: null,
    topics: [],
    data: null,
    inSuccessfulContractCall: null,
    txHash: null
  };

  try {
    // Debug: Show available methods
    const proto = Object.getPrototypeOf(eventInfo);
    const methods = Object.getOwnPropertyNames(proto).filter(m => typeof eventInfo[m] === 'function');

    // Try to get the actual event
    if (typeof eventInfo.event === 'function') {
      const event = eventInfo.event();
      const decoded = decodeContractEvent(event, index);
      Object.assign(result, decoded);
    }

    // Try to get other fields
    if (typeof eventInfo.inSuccessfulContractCall === 'function') {
      result.inSuccessfulContractCall = eventInfo.inSuccessfulContractCall();
    }

    result.availableMethods = methods;
  } catch (e) {
    result.error = e.message;
  }

  return result;
}

// ============================================================================
// Diagnostic Event Decoding
// ============================================================================

function decodeDiagnosticEvent(diagEvent, index) {
  const result = {
    index,
    inSuccessfulContractCall: diagEvent.inSuccessfulContractCall(),
    event: null
  };

  try {
    const contractEvent = diagEvent.event();
    result.event = decodeContractEvent(contractEvent, index);
  } catch (e) {
    result.error = e.message;
  }

  return result;
}

// ============================================================================
// Ledger Entry Change Decoding
// ============================================================================

function decodeLedgerEntryChange(change) {
  const changeType = change.switch().name;
  const result = { type: changeType };

  try {
    switch (changeType) {
      case 'ledgerEntryCreated': {
        const entry = change.created();
        result.data = decodeLedgerEntryData(entry.data());
        break;
      }
      case 'ledgerEntryUpdated': {
        const entry = change.updated();
        result.data = decodeLedgerEntryData(entry.data());
        break;
      }
      case 'ledgerEntryRemoved': {
        const key = change.removed();
        result.key = decodeLedgerKey(key);
        break;
      }
      case 'ledgerEntryState': {
        const entry = change.state();
        result.data = decodeLedgerEntryData(entry.data());
        break;
      }
    }
  } catch (e) {
    result.error = e.message;
  }

  return result;
}

function decodeLedgerEntryData(data) {
  const dataType = data.switch().name;
  const result = { type: dataType };

  try {
    switch (dataType) {
      case 'contractData': {
        const cd = data.contractData();
        result.contract = decodeContractAddress(cd.contract());
        result.key = decodeScVal(cd.key());
        result.val = decodeScVal(cd.val());
        result.durability = cd.durability().name;
        break;
      }
      case 'contractCode': {
        const cc = data.contractCode();
        result.hash = Buffer.from(cc.hash()).toString('hex');
        break;
      }
      case 'account': {
        const acc = data.account();
        result.accountId = acc.accountId().ed25519 ?
          StrKey.encodeEd25519PublicKey(acc.accountId().ed25519()) : 'unknown';
        break;
      }
      case 'trustline': {
        const tl = data.trustLine();
        result.accountId = tl.accountId().ed25519 ?
          StrKey.encodeEd25519PublicKey(tl.accountId().ed25519()) : 'unknown';
        break;
      }
      default:
        result.raw = dataType;
    }
  } catch (e) {
    result.error = e.message;
  }

  return result;
}

function decodeLedgerKey(key) {
  const keyType = key.switch().name;
  return { type: keyType };
}

function decodeContractAddress(scAddress) {
  const addressType = scAddress.switch().name;
  if (addressType === 'scAddressTypeContract') {
    return StrKey.encodeContract(Buffer.from(scAddress.contractId()));
  } else if (addressType === 'scAddressTypeAccount') {
    return StrKey.encodeEd25519PublicKey(scAddress.accountId().ed25519());
  }
  return addressType;
}

// ============================================================================
// Main Function
// ============================================================================

async function main() {
  console.log('='.repeat(80));
  console.log('Soroban Transaction Meta Decoder');
  console.log('='.repeat(80));
  console.log(`Transaction Hash: ${TX_HASH}`);
  console.log(`RPC Endpoint: ${SOROBAN_RPC_URL}`);
  console.log('');

  // Create RPC server
  const server = new rpc.Server(SOROBAN_RPC_URL, { allowHttp: false });

  // Fetch the transaction
  console.log('Fetching transaction from Soroban RPC...');
  const txResponse = await server.getTransaction(TX_HASH);

  console.log(`Status: ${txResponse.status}`);

  if (txResponse.status !== 'SUCCESS') {
    console.log('Transaction not found or failed.');
    if (txResponse.status === 'NOT_FOUND') {
      console.log('The transaction may be too old (Soroban RPC has limited history).');
    }
    return;
  }

  console.log(`Ledger: ${txResponse.ledger}`);
  console.log(`Created At: ${txResponse.createdAt}`);
  console.log('');

  // Get the resultMetaXdr
  if (!txResponse.resultMetaXdr) {
    console.log('No resultMetaXdr available.');
    return;
  }

  // The resultMetaXdr is already an xdr.TransactionMeta object
  const meta = txResponse.resultMetaXdr;
  const version = meta.switch();

  console.log('-'.repeat(80));
  console.log('TRANSACTION META');
  console.log('-'.repeat(80));
  console.log(`Meta Version: ${version}`);
  console.log('');

  // Get Soroban metadata (v3 and v4)
  let sorobanMeta = null;
  let txChangesBefore = [];
  let txChangesAfter = [];
  let operations = [];
  let eventsFromV4 = []; // v4 may store events separately

  if (version === 3) {
    try {
      const v3 = meta.v3();
      sorobanMeta = v3.sorobanMeta();
      txChangesBefore = v3.txChangesBefore();
      txChangesAfter = v3.txChangesAfter();
      operations = v3.operations();
    } catch (e) {
      console.log(`Error accessing v3 metadata: ${e.message}`);
    }
  } else if (version === 4) {
    try {
      const v4 = meta.v4();
      sorobanMeta = v4.sorobanMeta();
      txChangesBefore = v4.txChangesBefore();
      txChangesAfter = v4.txChangesAfter();
      operations = v4.operations();

      // Debug: Show v4 methods
      const v4Proto = Object.getPrototypeOf(v4);
      const v4Methods = Object.getOwnPropertyNames(v4Proto).filter(m => typeof v4[m] === 'function');
      console.log(`V4 Meta Methods: ${v4Methods.join(', ')}`);

      // In v4, events are stored at the v4 level, not in sorobanMeta
      if (typeof v4.events === 'function') {
        eventsFromV4 = v4.events() || [];
        console.log(`Found ${eventsFromV4.length} events at v4 level`);
      }

      // Also get diagnostic events from v4 level
      if (typeof v4.diagnosticEvents === 'function') {
        const diagEvents = v4.diagnosticEvents() || [];
        if (diagEvents.length > 0) {
          console.log(`Found ${diagEvents.length} diagnostic events at v4 level`);
        }
      }
    } catch (e) {
      console.log(`Error accessing v4 metadata: ${e.message}`);
    }
  }

  // Print ledger changes
  console.log('-'.repeat(80));
  console.log('LEDGER CHANGES (STATE CHANGES)');
  console.log('-'.repeat(80));

  if (txChangesBefore && txChangesBefore.length > 0) {
    console.log(`\nChanges Before Transaction (${txChangesBefore.length}):`);
    txChangesBefore.forEach((change, i) => {
      const decoded = decodeLedgerEntryChange(change);
      console.log(`  [${i}] ${JSON.stringify(decoded, null, 4).split('\n').join('\n      ')}`);
    });
  }

  if (operations && operations.length > 0) {
    console.log(`\nOperation Changes:`);
    operations.forEach((opMeta, opIndex) => {
      const changes = opMeta.changes();
      console.log(`  Operation ${opIndex}: ${changes.length} changes`);
      changes.forEach((change, i) => {
        const decoded = decodeLedgerEntryChange(change);
        console.log(`    [${i}] ${decoded.type}: ${JSON.stringify(decoded.data || decoded.key || {}, null, 6).split('\n').join('\n        ')}`);
      });
    });
  }

  if (txChangesAfter && txChangesAfter.length > 0) {
    console.log(`\nChanges After Transaction (${txChangesAfter.length}):`);
    txChangesAfter.forEach((change, i) => {
      const decoded = decodeLedgerEntryChange(change);
      console.log(`  [${i}] ${JSON.stringify(decoded, null, 4).split('\n').join('\n      ')}`);
    });
  }

  if (!sorobanMeta) {
    console.log('No Soroban metadata found (this may not be a Soroban transaction).');
    return;
  }

  // ========================================================================
  // Return Value
  // ========================================================================
  console.log('');
  console.log('-'.repeat(80));
  console.log('RETURN VALUE');
  console.log('-'.repeat(80));

  const returnValue = sorobanMeta.returnValue();
  if (returnValue) {
    const decoded = decodeScVal(returnValue);
    console.log(`Type: ${decoded.type}`);
    console.log(`Display: ${decoded.display}`);
    console.log(`Value: ${JSON.stringify(decoded.value, null, 2)}`);
    if (decoded.entries) {
      console.log('Entries:');
      decoded.entries.forEach((entry, i) => {
        console.log(`  [${i}] ${entry.key.display}: ${entry.value.display}`);
      });
    }
    if (decoded.items) {
      console.log('Items:');
      decoded.items.forEach((item, i) => {
        console.log(`  [${i}] ${item.display}`);
      });
    }
  } else {
    console.log('No return value (void)');
  }

  // ========================================================================
  // Contract Events
  // ========================================================================
  console.log('');
  console.log('-'.repeat(80));
  console.log('CONTRACT EVENTS');
  console.log('-'.repeat(80));

  // sorobanMeta might be a proxy object or have different access patterns
  // Try to find events through various methods
  let events = [];
  try {
    // Check what methods/properties are available
    console.log('SorobanMeta available methods:');
    const proto = Object.getPrototypeOf(sorobanMeta);
    const methods = Object.getOwnPropertyNames(proto).filter(m => typeof sorobanMeta[m] === 'function');
    console.log(`  Methods: ${methods.join(', ')}`);

    // Try different ways to access events
    if (typeof sorobanMeta.events === 'function') {
      events = sorobanMeta.events();
    } else if (sorobanMeta._attributes && sorobanMeta._attributes.events) {
      events = sorobanMeta._attributes.events;
    } else if (sorobanMeta.value && sorobanMeta.value.events) {
      events = sorobanMeta.value.events();
    }

    // If no events in sorobanMeta, use events from v4 level
    if ((!events || events.length === 0) && eventsFromV4.length > 0) {
      events = eventsFromV4;
      console.log(`Using ${events.length} events from v4 meta level`);
    }
  } catch (e) {
    console.log(`Error accessing events: ${e.message}`);
  }

  if (events && events.length > 0) {
    console.log(`Total Events: ${events.length}`);
    console.log('');

    events.forEach((event, i) => {
      // For v4, events might be ContractEventInfo objects
      const decoded = version === 4 ? decodeContractEventInfo(event, i) : decodeContractEvent(event, i);
      console.log(`Event #${i}:`);
      console.log(`  Type: ${decoded.type}`);
      console.log(`  Contract: ${decoded.contractId}`);
      if (decoded.inSuccessfulContractCall !== null) {
        console.log(`  In Successful Call: ${decoded.inSuccessfulContractCall}`);
      }
      if (decoded.availableMethods) {
        console.log(`  Available Methods: ${decoded.availableMethods.join(', ')}`);
      }

      if (decoded.topics.length > 0) {
        console.log('  Topics:');
        decoded.topics.forEach((topic, j) => {
          console.log(`    [${j}] (${topic.type}) ${topic.display}`);
        });
      }

      if (decoded.data) {
        console.log(`  Data: (${decoded.data.type}) ${decoded.data.display}`);
        if (decoded.data.entries) {
          decoded.data.entries.forEach((entry, j) => {
            console.log(`    ${entry.key.display}: ${entry.value.display}`);
          });
        }
        if (decoded.data.items) {
          decoded.data.items.forEach((item, j) => {
            console.log(`    [${j}] ${item.display}`);
          });
        }
      }
      console.log('');
    });
  } else {
    console.log('No contract events emitted.');
  }

  // ========================================================================
  // Diagnostic Events
  // ========================================================================
  console.log('');
  console.log('-'.repeat(80));
  console.log('DIAGNOSTIC EVENTS');
  console.log('-'.repeat(80));

  let diagnosticEvents = [];
  try {
    // Try sorobanMeta first, then v4 level
    if (typeof sorobanMeta.diagnosticEvents === 'function') {
      diagnosticEvents = sorobanMeta.diagnosticEvents() || [];
    }

    // For v4, also check at the v4 level
    if (diagnosticEvents.length === 0 && version === 4) {
      const v4 = meta.v4();
      if (typeof v4.diagnosticEvents === 'function') {
        diagnosticEvents = v4.diagnosticEvents() || [];
      }
    }

    if (diagnosticEvents && diagnosticEvents.length > 0) {
      console.log(`Total Diagnostic Events: ${diagnosticEvents.length}`);
      console.log('');

      diagnosticEvents.forEach((diagEvent, i) => {
        const decoded = decodeDiagnosticEvent(diagEvent, i);
        console.log(`Diagnostic Event #${i}:`);
        console.log(`  In Successful Call: ${decoded.inSuccessfulContractCall}`);

        if (decoded.event) {
          console.log(`  Event Type: ${decoded.event.type}`);
          console.log(`  Contract: ${decoded.event.contractId}`);

          if (decoded.event.topics && decoded.event.topics.length > 0) {
            console.log('  Topics:');
            decoded.event.topics.forEach((topic, j) => {
              console.log(`    [${j}] (${topic.type}) ${topic.display}`);
            });
          }

          if (decoded.event.data) {
            console.log(`  Data: (${decoded.event.data.type}) ${decoded.event.data.display}`);
          }
        }
        console.log('');
      });
    } else {
      console.log('No diagnostic events available.');
      console.log('(Diagnostic events require the transaction to be submitted with diagnosticEventsEnabled=true)');
    }
  } catch (e) {
    console.log(`Diagnostic events not available: ${e.message}`);
  }

  // ========================================================================
  // Soroban Extension Data (Resource Fees, Events in v4)
  // ========================================================================
  console.log('');
  console.log('-'.repeat(80));
  console.log('SOROBAN EXTENSION DATA');
  console.log('-'.repeat(80));

  try {
    const ext = sorobanMeta.ext();
    if (ext) {
      const extSwitch = ext.switch();
      console.log(`Extension Version: ${extSwitch}`);

      // Debug: List methods on ext
      const extProto = Object.getPrototypeOf(ext);
      const extMethods = Object.getOwnPropertyNames(extProto).filter(m => typeof ext[m] === 'function');
      console.log(`  Extension Methods: ${extMethods.join(', ')}`);

      if (extSwitch === 1) {
        const v1 = ext.v1();
        console.log('');
        console.log('Extended V1 Data:');

        // Debug: List methods on v1
        const v1Proto = Object.getPrototypeOf(v1);
        const v1Methods = Object.getOwnPropertyNames(v1Proto).filter(m => typeof v1[m] === 'function');
        console.log(`  V1 Methods: ${v1Methods.join(', ')}`);

        // In v4 format, events might be in ext.v1()
        // Check for events
        if (typeof v1.events === 'function') {
          const extEvents = v1.events();
          if (extEvents && extEvents.length > 0) {
            console.log('');
            console.log(`EVENTS FROM EXTENSION (${extEvents.length} events):`);
            extEvents.forEach((event, i) => {
              const decoded = decodeContractEvent(event, i);
              console.log(`Event #${i}:`);
              console.log(`  Type: ${decoded.type}`);
              console.log(`  Contract: ${decoded.contractId}`);
              if (decoded.topics.length > 0) {
                console.log('  Topics:');
                decoded.topics.forEach((topic, j) => {
                  console.log(`    [${j}] (${topic.type}) ${topic.display}`);
                });
              }
              if (decoded.data) {
                console.log(`  Data: (${decoded.data.type}) ${decoded.data.display}`);
              }
              console.log('');
            });
          }
        }

        // Try to access fee data
        try {
          console.log(`  Total Non-Refundable Resource Fee: ${v1.totalNonRefundableResourceFeeCharged?.().toString() || 'N/A'}`);
          console.log(`  Total Refundable Resource Fee: ${v1.totalRefundableResourceFeeCharged?.().toString() || 'N/A'}`);
          console.log(`  Rent Fee Charged: ${v1.rentFeeCharged?.().toString() || 'N/A'}`);
        } catch (feeErr) {
          console.log(`  Fee data not available: ${feeErr.message}`);
        }
      }
    }
  } catch (e) {
    console.log(`Extension data not available: ${e.message}`);
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('Decoding complete.');
  console.log('='.repeat(80));
}

// Run the main function
main().catch(console.error);
