import assert from 'node:assert/strict';
import { it } from 'node:test';
import { Address, nativeToScVal, xdr } from '@stellar/stellar-sdk';
import { contractStateFields, formatContractObservation } from './contractOverview.ts';

const admin = 'GC7CDWMCWNCY7JYUW5UBEOLNBSTNDKKZSFTHKGZNPPSOXLFYFX3CSINK';
const carbon = 'CDDS7IQJGQ2ZMO66E3MUYXZ56H2OO7RBTTAGZLZKOEA4EXCGZX65JGA7';
function entry(key, value) {
  return { key: xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(key)]).toXDR('base64'), value: value.toXDR('base64') };
}

it('presents indexed administrator, linked contracts and an inactive state from XDR', () => {
  assert.deepEqual(contractStateFields([
    entry('Admin', new Address(admin).toScVal()),
    entry('CarbonID', new Address(carbon).toScVal()),
    entry('IsActive', xdr.ScVal.scvBool(false)),
  ]), [
    { label: 'Administrator', value: admin, address: admin },
    { label: 'CARBON contract', value: carbon, address: carbon },
    { label: 'Active', value: 'No' },
  ]);
});

it('preserves raw integer precision and zero without guessing a token unit', () => {
  assert.equal(contractStateFields([entry('SinkMinimum', nativeToScVal(9223372036854775807n, { type: 'i64' }))])[0].value, '9223372036854775807');
  assert.equal(contractStateFields([entry('SinkMinimum', nativeToScVal(0n, { type: 'i64' }))])[0].value, '0');
});

it('ignores unknown keys, malformed XDR and non-address admin values', () => {
  assert.deepEqual(contractStateFields([
    { key: 'bad', value: 'bad' },
    entry('Admin', xdr.ScVal.scvString('not an address')),
    entry('IsActive', xdr.ScVal.scvString('true')),
    entry('UnknownKey', xdr.ScVal.scvBool(true)),
  ]), []);
});

it('formats observations in UTC and hides missing or invalid dates', () => {
  assert.equal(formatContractObservation('2025-11-14T12:20:14+02:00'), '14 Nov 2025, 10:20:14 UTC');
  assert.equal(formatContractObservation(null), null);
  assert.equal(formatContractObservation('not-a-date'), null);
  assert.equal(formatContractObservation('1'), null);
});
